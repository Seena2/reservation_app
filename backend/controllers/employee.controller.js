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
    const { user,firstName, middleName, lastName ,dateOfBirth, email,phone,address, department,position, salary,
     dateOfHired,status , manager } = req.body;

    // Validate data
    // Pass the entire request body to the orchestrator utility for validation
     const { isValid, errors } = validateEmployeeData(req.body);
      if (!isValid) {
        await session.abortTransaction();
        session.endSession();
        // Return all validation error messages cleanly mapped to their fields
        return res.status(400).json({  message: 'Validation failed.',  errors  });
      }
      try{
          // Check if an employee profile already exists for this user
          const existingEmployee = await Employee.findOne({user }).session(session).lean().exec();
          if (existingEmployee) {
              await session.abortTransaction();
              session.endSession();
             return res.status(409).json({ message: "An employee profile already exists for this user account" });
           }
          // Validate  Hierarchy & relationships b/n employee & manager to prevent infinite loop
          if (manager) {
              // Verify manager actually exists
              const managerExists = await Employee.findById(manager).session(session).exec();
              if (!managerExists) {
                   await session.abortTransaction();
                    session.endSession();
               return res.status(404).json({ message: 'Designated manager not found', errors: { manager: 'Designated manager not found.' }  });
              }
          // Check for infinite loop reporting hierarchy (using placeholder ID since new employee doesn't have an ID yet)
             const temporaryId = new mongoose.Types.ObjectId();
             const isCyclic = await wouldCauseCyclicHierarchy(temporaryId, manager);
            if (isCyclic) {
                  await session.abortTransaction();
                   session.endSession();
                   return res.status(400).json({   message: ' infinete loop Validation failed(user<->manager).', 
                  errors: { manager: 'Invalid hierarchy: Assigning this manager creates a circular reporting loop.' } 
              });
            }
        }
            // Create a new employee instance
             const newEmployee = new Employee({... req.body, manager: manager || null });
            // Save with the active database session
              const savedEmployee = await newEmployee.save({ session });
            // Commit changes  and properly close  the session 
              await session.commitTransaction();
              session.endSession();
              if(!savedEmployee){
                return res.status(400) .json({ success: false, message: "Failed to created employee profile." });
              }

             // Populate and return response (done outside the transaction since save is finalized)
            //  fetches user data from refernced user table, and the manager of the employee
             const populatedEmployee = await Employee.findById(newEmployee._id)
                   .populate('user', 'username email roles active')
                   .populate({ path: 'manager', populate: { path: 'user', select: 'firstName lastName' }
                 }).lean().exec();
              if (!populatedEmployee) {
                  return res.status(400) .json({ success: false, message: "Failed to retrieve created employee profile." });
               }
               return res.status(201).json({  
                  success: true, 
                  message: `Employee  ${firstName} ${lastName} created successfully`,
                  data: populatedEmployee
               });

      }catch(error){
        // Rollback all database modifications if anything goes wrong
            await session.abortTransaction();
             session.endSession();
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

    const employee = await Employee.findById (id)
        .populate('user', 'firstName lastName email') // Pull details from User collection
        .populate({
        path: 'manager',
        populate: { path: 'user', select: 'firstName lastName' } // Deep populate manager's name
      });
    if (!employee) {
      return res
        .status(404)
        .json({ success: false, message: "Employee not found" });
    }
    res.status(200).json({ success: true, data: employee  });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server Error: Unable to fetch employee",
      error: error.message,
    });
  }
};


// @desc Update employee profile (Handles manager changes & cyclic verification safely)
// @route PATCH/PUT /api/users/:id
// @access private
const updateEmployee = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    const { id } = req.params;
    const { user,firstName, middleName, lastName ,dateOfBirth, email,phone,address, department,position, salary,
     dateOfHired,status , manager } = req.body;

  // validate data
  if (
    !user||
    !firstName || !middleName || !lastName ||!dateOfBirth||!email ||
    !Array.isArray(phone) ||
    !phone.length || !address ||
    !department || !position || !salary || !dateOfHired ||
    !status || !manager 
    
  ) {
    return res.status(400).json({ message: "All fields are required" });
  }
  
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "Invalid user Id" });
  }

  try {
    //  Verify employee exists
    const employee = await Employee.findById(id).session(session);
    if (!employee) {
        await session.abortTransaction();
      return res
        .status(404)
        .json({ success: false, message: "Employee not found" });
    }
    // Critical Management Hierarchy Check
    if (manager) {
      // Avoid querying if the manager didn't change
      const isManagerChanged = employee.manager?.toString() !== manager;

      if (isManagerChanged) {
        // Ensure the prospective manager actually exists
        const managerExists = await Employee.findById(manager).session(session);
        if (!managerExists) {
          await session.abortTransaction();
          return res.status(404).json({ message: 'Proposed manager not found.' });
        }

        // Check if making this assignment introduces a circular loop
        const isCyclic = await wouldCauseCyclicHierarchy(id, manager);
        if (isCyclic) {
          await session.abortTransaction();
          return res.status(400).json({ 
            message: 'Invalid assignment: Doing this creates an infinite loop in the management chain.' 
          });
        }
      }
    }
    //  Apply changes cleanly
    employee.firstName = firstName || employee.firstName;
    employee.middleName = middleName || employee.middleName;
    employee.lastName = lastName || employee.lastName;
    employee.dateOfBirth = dateOfBirth || employee.dateOfBirth;
    employee.email = email || employee.email;
    employee.phone = phone || employee.phone;
    employee.address = address || employee.address;
    employee.department = department || employee.department;
    employee.position = position || employee.position;
    employee.salary = salary || employee.salary;
    employee.dateOfHired = dateOfHired || employee.dateOfHired;
    employee.manager = manager || employee.manager;
    employee.status = status || employee.status;
   

    // Explicitly handle unassigning a manager (setting to null or empty string)
    if (manager === null || manager === '') {
      employee.manager = null;
    } else if (manager) {
      employee.manager = manager;
    }
    
    const savedEmployee = await employee.save({ session });
    await session.commitTransaction();
    session.endSession();

    // Return updated & populated document
    const updatedEmployee = await Employee.findById(id)
      .populate('user', 'firstName lastName email')
      .populate({
        path: 'manager',
        populate: { path: 'user', select: 'firstName  middleName lastName dateOfBirth email phone address department position salary dateOfHired status' }
      });

    if (!updatedEmployee) {
      return res
        .status(400)
        .json({ success: false, message: " updating Employee failed" });
    }

    return res.status(200).json({
      success: true,
      message: `User ${firstName} ${lastName} updated successfully.`,
      data: updatedEmployee,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({
      success: false,
      message: "Server error while updating employee profile.",
      error: error.message,
    });
  }
};

// @desc Delete a user : Safely remove an employee profile and realign direct reports(managers)
// @route DELETE /api/employees/:id
// @access private
const deleteEmployee = async (req, res) => {
    const session = await mongoose.startSession();
  session.startTransaction();
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "Invalid user Id" });
  }
  try {
    // Verify employee profile exists
    const employeeToDelete = await Employee.findById(id).session(session);
    if (!employeeToDelete) {
         await session.abortTransaction();
      return res
        .status(404)
        .json({ success: false, message: "Employee not found" });
    }
     // Capture their manager ID (could be an ID or null)
    const upperManagerId = employeeToDelete.manager;

     //  Reassign Direct Reports to prevent dangling references
    // Anyone reporting to this employee will now report to this employee's boss.
    await Employee.updateMany(
      { manager: id },
      { $set: { manager: upperManagerId } },
      { session }
    );
    
    // find and delete user
    const emp = await Employee.findByIdAndDelete(id).session(session);
     await session.commitTransaction();
     session.endSession();
    res.status(200).json({
      success: true,
      message: `Employee ${emp.username}  profile removed successfully. Direct reports have been re-assigned up the chain. `,
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
