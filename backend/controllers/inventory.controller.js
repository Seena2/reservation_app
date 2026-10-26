import mongoose from "mongoose";
import User from "../models/user.model.js";
import Inventory from "../models/inventory.model.js";
import { validateCustomerData } from "../validators/customerValidator.js";//custom utilitty function




// @desc Create new Inventory entry
// @route POST /api/customers
// @access private
const createNewInventory = async (req, res) => {
  //  open mongodb session
  const session = await mongoose.startSession();
  session.startTransaction();
  const {
    type,
    firstName,
    middleName,
    lastName,
    dateOfBirth,
    email,
    phone,
    address,
    status,
  } = req.body;

  // Validate data
  // Pass the entire request body to the orchestrator utility for validation
  const { isValid, errors } = validateCustomerData(req.body);
  if (!isValid) {
    await session.abortTransaction();
    session.endSession();
    // Return all validation error messages cleanly mapped to their fields
    return res.status(400).json({ message: "Validation failed.", errors });
  }

  try {
    // Find the referenced user to fetch their email and set it to customer email
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Referenced user not found." });
    }
    //  Check if an employee with this email or userId already exists
    const existingCustomer = await Customer.findOne({
      $or: [{ userId: userId }, { email: user.email }],
    }).session(session);
     
    if (existingCustomer) {
      await session.abortTransaction();
      session.endSession();
      return res.status(409).json({
        message: "An customer profile already exists for this user account",
      });
    }

    // Create a new customer instance
    const newCustomer = new Customer({
      ...req.body,
      email: user.email,
    });
    // Save with the active database session and properly close  the session
    const savedCustomer = await newCustomer.save({ session });  
    if (!savedCustomer) {
      return res.status(400).json({
        success: false,
        message: "Failed to creating customer profile.",
      });
    }
     // Commit and finalize transaction 
    await session.commitTransaction();
    session.endSession();

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
      message: `Customer  ${firstName} ${lastName} created successfully`,
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
  }
};

// @desc Get all customers
// @route GET /api/customers
// @access private
const getAllInventories = async (req, res) => {
  try {
    // Fetch all customers and exclude the password field for security
    const customers = await Customer.find({}).select("-password").lean();
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
const getInventory = async (req, res) => {
  const { id } = req.params;

  try {
    // use .populate() to fetch the related User data and the Manager data in one go:
    const customer = await Customer.findById(id)
      .populate("userId", "username email roles status"); // Pull details from User collection
      
    if (!customer) {
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" });
    }
    res.status(200).json({ success: true, data: customer });
  } catch (error) {
    console.log(error);
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
const updateInventory = async (req, res) => {
  const { id } = req.params;
  const {
     userId,
    firstName,
    middleName,
    lastName,
    dateOfBirth,
    email,
    phone,
    address,
    status,
  } = req.body;

  // validate ID format
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "Invalid user Id" });
  }

  //Validate incoming request body schema rules using our custom utility/helper function
  const { isValid, errors } = validateCustomerData(req.body);
  if (!isValid) {
    // Return all validation error messages cleanly mapped to their fields
    return res
      .status(400)
      .json({ success: false, message: "Validation failed.", errors });
  }
  //  start mongo session that allow us to perform multiple transaction on d/t collection at same time
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    // Find the referenced user in "User" to get the user email and  reuse it in customer collection
    const user = await User.findById(userId).session(session);
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: "Referenced user account not found.",
      });
    }
    // Find the Employee document
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
      _id: { $ne: id }, // Exclude current employee
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
    existingCustomer.userId = userId || existingCustomer.userId;
    existingCustomer.email = user.email; // Maintain the operational sync tie explicitly

    existingCustomer.firstName =
      firstName !== undefined ? firstName : existingCustomer.firstName;
    existingCustomer.middleName =
      middleName !== undefined ? middleName : existingCustomer.middleName;
    existingCustomer.lastName =
      lastName !== undefined ? lastName : existingCustomer.lastName;
    existingCustomer.dateOfBirth =
      dateOfBirth !== undefined ? dateOfBirth : existingCustomer.dateOfBirth;
    existingCustomer.phone =
      phone !== undefined ? phone : existingCustomer.phone;
    existingCustomer.address =
      address !== undefined ? address : existingCustomer.address;
    existingCustomer.status =
      status !== undefined ? status : existingCustomer.status;

    // Commit operations safely to database
    const savedCustomer = await existingCustomer.save({ session });
    if (!savedCustomer) {
      return res
        .status(400)
        .json({ success: false, message: " Updating customer failed" });
    }

    //  Fetch and format the response object with deep populations
    const updatedCustomer = await existingCustomer.populate([
      { path: "userId", select: "firstName lastName email roles status" },
    ]);

    // Commit operations safely to database
    await session.commitTransaction();
    session.endSession();

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

// @desc Delete employee : Safely remove an employee profile and realign direct reports(subordinates)
// @route DELETE /api/employees/:id
// @access private
const deleteInventory = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid employee Id" });
  }
  // Open the multi-document session transaction safely
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    // Verify the employee profile to be deleted exists
    const customerToDelete =Customer.findById(id).session(session);
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

export { createNewInventory, getAllInventories, getInventory,  updateInventory, deleteInventory };
