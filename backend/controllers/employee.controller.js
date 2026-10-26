import mongoose from "mongoose";
import User from "../models/user.model.js";
import Employee from "../models/employee.model.js";
import {
  createEmployeeSchema,
  updateEmployeeSchema,
} from "../validators/employee.validator.js";
import { wouldCauseCyclicHierarchy } from "../validators/preventInfiniteLoop.js";

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
  const employeeData = req.body;

  // validation(using  joi) is done at the middlewar lever in employee route
  try {
    //  check if user account exists
    const user = await User.findById(employeeData.userId).session(session);
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: "User account not found. please create user account first",
      });
    }
    //  Check if an employee with this  userId or user email already exists
    const existingEmployee = await Employee.findOne({
      $or: [{ userId: employeeData.userId }, { email: user.email }],
    }).session(session);
    if (existingEmployee) {
      await session.abortTransaction();
      session.endSession();
      return res.status(409).json({
        message: "Employee profile already exists for this user account",
      });
    }

    // Validate  Hierarchy & relationships b/n employee & manager to prevent infinite loop
    if (employeeData.manager) {
      // Verify manager actually exists
      const managerExists = await Employee.findById(
        employeeData.manager,
      ).session(session);
      if (!managerExists) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({
          success: false,
          message: "Designated manager not found",
        });
      }
      // Check for infinite loop reporting hierarchy (using placeholder ID since new employee doesn't have an ID yet)
      const temporaryId = new mongoose.Types.ObjectId();
      const isCyclic = await wouldCauseCyclicHierarchy(temporaryId, manager);
      if (isCyclic) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: " infinete loop Validation failed(user<->manager).",
        });
      }
    }
    // Create a new employee instance
    const newEmployee = new Employee({
      ...employeeData,
      email: user.email,
      manager: employeeData.manager || null,
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
    console.log(savedEmployee);
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
      message: `Employee  ${firstName} ${lastName} profile created successfully`,
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
  } finally {
    session.endSession();
  }
};

// @desc Get all employees (With Pagination & Filters)
// @route GET /api/employees
// @access private
const getAllEmployees = async (req, res) => {
  try {
    const { page = 1, limit = 10, department, status } = req.query;
    const filter = {};
    if (department) filter.department = department;
    if (status) filter.status = status;

    // Fetch employees and exclude the password field for security
    const employees = await Employee.find(filter)
      .select("-password")
      .populate("userId", "email username") // Adjust fields based on your User schema
      .populate("manager", "firstName lastName email")
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean(); // Optimized for read-only performance
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
      .populate("userId") // Pull details from User collection
      .populate({
        path: "manager",
        populate: { path: "userId", select: "firstName lastName" }, // Deep populate manager's name
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
      $or: [{ userId: updateData.userId }, { email: user.email }],
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
    const targetManagerId = updateData.manager === null || updateData.manager === "" ? null : updateData.manager;

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
    existingEmployee.userId = updateData.userId || existingEmployee.userId;
    existingEmployee.email = user.email; // Maintain the operational sync tie explicitly

    existingEmployee.firstName =
      updateData.firstName !== undefined ? updateData.firstName : existingEmployee.firstName;
    existingEmployee.middleName =
      updateData.middleName !== undefined ? updateData.middleName : existingEmployee.middleName;
    existingEmployee.lastName =
      updateData.lastName !== undefined ? updateData.lastName : existingEmployee.lastName;
    existingEmployee.dateOfBirth =
      updateData.dateOfBirth !== undefined ? updateData.dateOfBirth : existingEmployee.dateOfBirth;
    existingEmployee.phone =
      updateData.phone !== undefined ? updateData.phone : existingEmployee.phone;
    existingEmployee.address =
      updateData.address !== undefined ? updateData.address : existingEmployee.address;
    existingEmployee.department =
      updateData.department !== undefined ? updateData.department : existingEmployee.department;
    existingEmployee.position =
      updateData.position !== undefined ? updateData.position : existingEmployee.position;
    existingEmployee.salary =
      updateData.salary !== undefined ? updateData.salary : existingEmployee.salary;
    existingEmployee.dateOfHired =
      updateData.dateOfHired !== undefined ? updateData.dateOfHired : existingEmployee.dateOfHired;
    existingEmployee.status =
      updateData.status !== undefined ? updateData.status : existingEmployee.status;
    existingEmployee.manager = targetManagerId;

    // Commit operations safely to database
    const savedEmployee = await existingEmployee.save({ session });
    // Commit operations safely to database
    await session.commitTransaction();
    session.endSession();

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
      },
    ]);

    return res.status(200).json({
      success: true,
      message: `Employee profile for ${existingEmployee.firstName} ${existingEmployee.lastName} updated successfully.`,
      data: existingEmployee,
    });
  } catch (error) {
    console.log(error);
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
