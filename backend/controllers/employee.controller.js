import mongoose from "mongoose";
import User from "../models/user.model.js";
import Employee from "../models/employee.model.js";
import { validateEmployeeData } from '../utils/employeeValidator.js'; //custom utilitty function
import { wouldCauseCyclicHierarchy } from '../utils/preventInfiniteLoop.js';


// @desc Create new employee
// @route POST /api/employees
// @access private/Admin

/* This controller handles the creation of a new employee profile.
   It wraps everything in a MongoDB Database Transaction to guarantee atomicity: if creating the employee fails or
    a hierarchy loop is detected, any changes (like linking the user) roll back automatically.
*/
const CreateNewEmployee = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  const {
    userId,
    firstName,
    middleName,
    lastName,
    dateOfBirth,
    email,
    phone,
    address,
    department,
    position,
    salary,
    dateOfHired,
    status,
    manager,
  } = req.body;

  // Validate data
  // Pass the entire request body to the orchestrator utility for validation
  const { isValid, errors } = validateEmployeeData(req.body);
  if (!isValid) {
    await session.abortTransaction();
    session.endSession();
    // Return all validation error messages cleanly mapped to their fields
    return res.status(400).json({ message: "Validation failed.", errors });
  }
  try {
    // Find the referenced user to fetch their email and set it to employee email
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Referenced user not found." });
    }
    //  Check if an employee with this email or userId already exists
    const existingEmployee = await Employee.findOne({
      $or: [{ user: userId }, { email: user.email }],
    })
      .session(session)
      .lean()
      .exec();
    if (existingEmployee) {
      await session.abortTransaction();
      session.endSession();
      return res.status(409).json({
        message: "An employee profile already exists for this user account",
      });
    }

    // Validate  Hierarchy & relationships b/n employee & manager to prevent infinite loop
    if (manager) {
      // Verify manager actually exists
      const managerExists = await Employee.findById(manager)
        .session(session)
        .exec();
      if (!managerExists) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({
          message: "Designated manager not found",
          errors: { manager: "Designated manager not found." },
        });
      }
      // Check for infinite loop reporting hierarchy (using placeholder ID since new employee doesn't have an ID yet)
      const temporaryId = new mongoose.Types.ObjectId();
      const isCyclic = await wouldCauseCyclicHierarchy(temporaryId, manager);
      if (isCyclic) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          message: " infinete loop Validation failed(user<->manager).",
          errors: {
            manager:
              "Invalid hierarchy: Assigning this manager creates a circular reporting loop.",
          },
        });
      }
    }
    // Create a new employee instance
    const newEmployee = new Employee({
      ...req.body,
      email: user.email,
      manager: manager || null,
    });
    // Save with the active database session
    const savedEmployee = await newEmployee.save({ session });
    // Commit changes  and properly close  the session
    await session.commitTransaction();
    session.endSession();
    if (!savedEmployee) {
      return res.status(400).json({
        success: false,
        message: "Failed to created employee profile.",
      });
    }

    // Populate and return response (done outside the transaction since save is finalized)
    //  fetches user data from refernced user table, and the manager of the employee
    const populatedEmployee = await Employee.findById(newEmployee._id)
      .populate("userId", "username email roles status")
      .populate({
        path: "manager",
        populate: { path: "userId", select: "firstName lastName" },
      })
      .lean()
      .exec();
    if (!populatedEmployee) {
      return res.status(400).json({
        success: false,
        message: "Failed to retrieve created employee profile.",
      });
    }
    return res.status(201).json({
      success: true,
      message: `Employee  ${firstName} ${lastName} created successfully`,
      data: populatedEmployee,
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
      message: "Server error while creating employee profile.",
      error: error.message,
    });
  }
};

// @desc Get all employees
// @route GET /api/employees
// @access private
const getAllEmployees = async (req, res) => {
  try {
    // Fetch employees and exclude the password field for security
    const employees = await Employee.find({}).select("-password").lean();
    if (!employees?.length) {
      return res
        .status(400)
        .json({ success: false, message: "No employees found" });
    }
    // Return a 200 OK status with the users data
    return res
      .status(200)
      .json({ success: true, count: employees.length, data: employees });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server Error: Unable to fetch employees",
      error: error.message,
    });
  }
};

// @desc Get single employee : Fetching an employee with their user details and manager details
// @route GET /api/employees/:id
// @access private
const getEmployee = async (req, res) => {
  const { id } = req.params;

  try {
    // use .populate() to fetch the related User data and the Manager data in one go:
    const employee = await Employee.findById(id)
      .populate("userId", "username email roles status") // Pull details from User collection
      .populate({
        path: "manager",
        populate: { path: "user", select: "firstName lastName" }, // Deep populate manager's name
      });
    if (!employee) {
      return res
        .status(404)
        .json({ success: false, message: "Employee not found" });
    }
    res.status(200).json({ success: true, data: employee });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Server Error: Unable to fetch employee",
      error: error.message,
    });
  }
};

// @desc Update employee profile (Handles manager changes & cyclic verification safely)
// @route PATCH /api/employee/:id
// @access private
const updateEmployee = async (req, res) => {
  const { id } = req.params;
  const {
    userId,
    firstName,
    middleName,
    lastName,
    dateOfBirth,
    phone,
    address,
    department,
    position,
    salary,
    dateOfHired,
    status,
    manager,
  } = req.body;

  // validate ID format
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "Invalid user Id" });
  }

  //Validate incoming request body schema rules using our custom utility/helper function
  const { isValid, errors } = validateEmployeeData(req.body);
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
    // Find the referenced user in "User" to get the user email and  reuse it in employee collection
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
    const existingEmployee = await Employee.findById(id).session(session);
    if (!existingEmployee) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(404)
        .json({ success: false, message: "employee profile not found" });
    }
    //  Uniqueness Verification (Ensure email/userId pair belongs to this specific employee record)
    const duplicateEmployee = await Employee.findOne({
      _id: { $ne: id }, // Exclude current employee
      $or: [{ user: userId }, { email: user.email }],
    }).session(session);

    if (duplicateEmployee) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message:
          "Another employee profile is already using this user account or email.",
      });
    }

    // Critical Management Hierarchy Check
    // Explicitly handle mapping incoming string representations to null/empty values
    const targetManagerId = manager === null || manager === "" ? null : manager;

    if (targetManagerId) {
      // Avoid querying if the manager didn't change
      const isManagerChanged =
        existingEmployee.manager?.toString() !== targetManagerId;

      if (isManagerChanged) {
        // Ensure the prospective manager profile actually exists
        const managerExists =
          await Employee.findById(targetManagerId).session(session);

        if (!managerExists) {
          await session.abortTransaction();
          session.endSession();
          return res.status(404).json({
            success: false,
            message: "Proposed manager profile not found.",
          });
        }

        // Check if assigning this manager introduces a circular loop
        const isCyclic = await wouldCauseCyclicHierarchy(id, targetManagerId);
        if (isCyclic) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({
            success: false,
            message:
              "Invalid assignment: Doing this creates an infinite loop in the management chain.",
          });
        }
      }
    }
    //  Sync details and inherit email safely from verified User document
    existingEmployee.userId = userId || existingEmployee.userId;
    existingEmployee.email = user.email; // Maintain the operational sync tie explicitly

    existingEmployee.firstName =
      firstName !== undefined ? firstName : existingEmployee.firstName;
    existingEmployee.middleName =
      middleName !== undefined ? middleName : existingEmployee.middleName;
    existingEmployee.lastName =
      lastName !== undefined ? lastName : existingEmployee.lastName;
    existingEmployee.dateOfBirth =
      dateOfBirth !== undefined ? dateOfBirth : existingEmployee.dateOfBirth;
    existingEmployee.phone =
      phone !== undefined ? phone : existingEmployee.phone;
    existingEmployee.address =
      address !== undefined ? address : existingEmployee.address;
    existingEmployee.department =
      department !== undefined ? department : existingEmployee.department;
    existingEmployee.position =
      position !== undefined ? position : existingEmployee.position;
    existingEmployee.salary =
      salary !== undefined ? salary : existingEmployee.salary;
    existingEmployee.dateOfHired =
      dateOfHired !== undefined ? dateOfHired : existingEmployee.dateOfHired;
    existingEmployee.status =
      status !== undefined ? status : existingEmployee.status;
    existingEmployee.manager = targetManagerId;

    // Commit operations safely to database
    const savedEmployee = await existingEmployee.save({ session });
    if (!savedEmployee) {
      return res
        .status(400)
        .json({ success: false, message: " updating Employee failed" });
    }

    //  Fetch and format the response object with deep populations
    const updatedEmployee = await existingEmployee.populate([
      { path: "userId", select: "firstName lastName email roles status" },
      {
        path: "manager",
        select: "firstName middleName lastName position department", // Fields from Manager's Employee doc
        populate: {
          path: "userId",
          select: "email status", // Fields from Manager's related User doc
        },
      },
    ]);

    // Commit operations safely to database
    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      message: `Employee profile for ${existingEmployee.firstName} ${existingEmployee.lastName} updated successfully.`,
      data: existingEmployee,
    });
  } catch (error) {
    // Check if the transaction is still active/can be aborted
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    return res.status(500).json({
      success: false,
      message: "Server error while updating employee profile.",
      error: error.message,
    });
  }
};

// @desc Delete employee : Safely remove an employee profile and realign direct reports(subordinates)
// @route DELETE /api/employees/:id
// @access private
const deleteEmployee = async (req, res) => {
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
    const employeeToDelete = await Employee.findById(id).session(session);
    if (!employeeToDelete) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(404)
        .json({ success: false, message: "Employee profile not found" });
    }
    // Capture the employee's manager ID (could be an ID or null)
    const upperManagerId = employeeToDelete.manager;

    // Reassign Direct Reports to prevent orphaned, broken tree references
    // Anyone reporting to this employee will now report directly to this employee's boss.

    await Employee.updateMany(
      { manager: id },
      { $set: { manager: upperManagerId } },
      { session },
    );

    // find and delete user
    const deletedEmployee =
      await Employee.findByIdAndDelete(id).session(session);
    await session.commitTransaction();
    session.endSession();

    // Construct a safe display name using the original pre-deleted object fields
    const displayName =
      [deletedEmployee.firstName, deletedEmployee.lastName]
        .filter(Boolean)
        .join(" ") || "Employee";

    res.status(200).json({
      success: true,
      message: `Employee profile for "${displayName}" (${deletedEmployee.employeeId || id}) removed successfully. Direct reports have been re-assigned up the chain.`,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({
      success: false,
      message: "Server error while deleting employee profile.",
      error: error.message,
    });
  }
};

export { getAllEmployees, getEmployee, CreateNewEmployee, updateEmployee, deleteEmployee };
