import mongoose from "mongoose";
import User from "../models/user.model.js";
import Customer from "../models/customer.model.js";
import { createCustomerSchema, updateCustomerSchema,} from "../validators/customer.validator.js";

// Note validation is done in the route using middleware

// @desc Create new customer profile
// @route POST /api/customers
// @access private
const createNewCustomer = async (req, res) => {
  //  open mongodb session
  const session = await mongoose.startSession();
  session.startTransaction();
  const customerData = req.body;


  try {
    //  check if user account exists
    const user = await User.findById(customerData.userId).session(session);
    if (!user) {
       await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: "Referenced user account not found. please create user account first" });
    }
    // Check if an employee with this  userId or user email already exists
    const existingCustomer = await Customer.findOne({
      $or: [{ userId: customerData.userId }, { email: user.email }],
    }).session(session);
     
    if (existingCustomer) {
      await session.abortTransaction();
      session.endSession();
      return res.status(409).json({
        message: "Customer profile already exists for this user account",
      });
    }

    // Create a new customer instance
    const newCustomer = new Customer({
      ...customerData,
      email: user.email,
    });
    // Save with the active database session and properly close  the session
    const savedCustomer = await newCustomer.save({ session });  
     // Commit and finalize transaction 
    await session.commitTransaction();
    session.endSession();

    if (!savedCustomer) {
      return res.status(400).json({
        success: false,
        message: "Failed to creating customer profile.",
      });
    }
    
    // Populate and return response (done outside the transaction since save is finalized)
    //  fetches user data from refernced user table, 
    const populatedCustomer = await savedCustomer.populate({path: "userId", select: "username email roles status"});
      
    if (!populatedCustomer) {
      return res.status(400).json({
        success: false,
        message: "Failed to retrieve created customer profile.",
      });
    }
    return res.status(201).json({
      success: true,
      message: `Customer  ${populatedCustomer.firstName} ${populatedCustomer.lastName} created successfully`,
      data: populatedCustomer,
    });
  } catch (error) {
    // Check if the transaction is still active/can be aborted
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Server error while creating Customer profile.",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

// @desc Get all customers (With Pagination & Filters)
// @route GET /api/customers
// @access private
const getAllCustomers = async (req, res) => {
  try {
    const { page = 1, limit = 10, department, status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    // Fetch all customers and exclude the password field for security
    const customers = await Customer.find(filter).select("-password")
    .populate("userId", "email username") // Adjust fields based on your User schema
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean(); // Optimized for read-only performance
    if (!customers?.length) {
      return res
        .status(400)
        .json({ success: false, message: "No customer found" });
    }
    // Return a 200 OK status with the users data
    return res
      .status(200)
      .json({ success: true, count: customers.length, data: customers });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server Error: Unable to fetch customers",
      error: error.message,
    });
  }
};

// @desc Get single customer : Fetching an customer with their user details 
// @route GET /api/customers/:id
// @access private
const getCustomer = async (req, res) => {
  const { id } = req.params;

  try {
    // use .populate() to fetch the related User data for a customer
    const customer = await Customer.findById(id).select("-password")
      .populate("userId", "username email roles status"); // Pull details from User collection
      
    if (!customer) {
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" });
    }
    res.status(200).json({ success: true, data: customer });
  } catch (error) {

    return res.status(500).json({
      success: false,
      message: "Server Error: Unable to fetch customer",
      error: error.message,
    });
  }
};

// @desc Update customer profile 
// @route PATCH /api/customer/:id
// @access private
const updateCustomer = async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  //  start mongo session that allow us to perform multiple transaction on d/t collection at same time
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    // Check if the user account exists in "User" collection
    const user = await User.findById(updateData.userId).session(session);
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: "Referenced user account not found.",
      });
    }
    // Find the customer document
    const existingCustomer = await Customer.findById(id).session(session);
    if (!existingCustomer) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(404)
        .json({ success: false, message: "Customer profile not found" });
    }
    //  Uniqueness Verification (Ensure email/userId pair belongs to this specific employee record)
    const duplicateCustomer = await Customer.findOne({
      _id: { $ne: id }, // Exclude current customer
      $or: [{ user: userId }, { email: user.email }],
    }).session(session);

    if (duplicateCustomer) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message:
          "Another customer profile is already using this user account or email.",
      });
    }

    //  Sync details and inherit email safely from verified User document
    existingCustomer.userId = updateData.userId || existingCustomer.userId;
    existingCustomer.email = user.email; // Maintain the operational sync tie explicitly

    existingCustomer.firstName =updateData.firstName !== undefined ? updateData.firstName : existingCustomer.firstName;
    existingCustomer.middleName =updateData. middleName !== undefined ?updateData.middleName : existingCustomer.middleName;
    existingCustomer.lastName =updateData.lastName !== undefined ? updateData.lastName : existingCustomer.lastName;
    existingCustomer.dateOfBirth =updateData.dateOfBirth !== undefined ? updateData.dateOfBirth : existingCustomer.dateOfBirth;
    existingCustomer.phone =updateData.phone !== undefined ? updateData.phone : existingCustomer.phone;
    existingCustomer.address =updateData.address !== undefined ? updateData.address : existingCustomer.address;
    existingCustomer.status =updateData.status !== undefined ?updateData. status : existingCustomer.status;

    // Commit operations safely to database
    const savedCustomer = await existingCustomer.save({ session });
    // Commit operations safely to database
    await session.commitTransaction();
    session.endSession();

    if (!savedCustomer) {
      return res
        .status(400)
        .json({ success: false, message: " Updating customer failed" });
    }

    //  Fetch and format the response object with deep populations
    const updatedCustomer = await existingCustomer.populate([
      { path: "userId", select: "firstName lastName email roles status" },
    ]);

    

    return res.status(200).json({
      success: true,
      message: `Customer profile for ${existingCustomer.firstName} ${existingCustomer.lastName} updated successfully.`,
      data: existingCustomer,
    });
  } catch (error) {
    // Check if the transaction is still active/can be aborted
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    return res.status(500).json({
      success: false,
      message: "Server error while updating customer profile.",
      error: error.message,
    });
  }
};

// @desc Delete customer 
// @route DELETE /api/customers/:id
// @access private
const deleteCustomer = async (req, res) => {
  const { id } = req.params;
 
  // Open the multi-document session transaction safely
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    // Verify the customer profile to be deleted exists
    const customerToDelete = await Customer.findById(id).session(session);
    if (!customerToDelete) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(404)
        .json({ success: false, message: "Customer profile not found" });
    }
   
    // find and delete user
    const deletedCustomer = await Customer.findByIdAndDelete(id).session(session);
    await session.commitTransaction();
    session.endSession();
    
     if (!deletedCustomer) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: "Customer deletion failed." });
    }

    
         // 4. Construct a safe display name using the captured fields
    const displayName = [deletedCustomer.firstName, deletedCustomer.lastName] .filter(Boolean)
        .join(" ") || "Customer";

    res.status(200).json({
      success: true,
      message: `Customer profile for "${displayName}"  removed successfully. `,
    });
  } catch (error) {
     // Check if the transaction is still active/can be aborted
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    return res.status(500).json({
      success: false,
      message: "Server error while deleting customer profile.",
      error: error.message,
    });
  }
};

export { createNewCustomer, getAllCustomers, getCustomer,  updateCustomer, deleteCustomer };
