import mongoose from "mongoose";
import User from "../models/user.model.js";
import Employee from "../models/employee.model.js";
import Customer from "../models/customer.model.js";
import bcrypt from "bcrypt";


// @desc Create new user account
// @route POST /api/users
// @access private
const CreateNewUser = async (req, res) => {
  const { username, email, password, roles, status } = req.body;
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(409)
        .json({ message: "User with this email already exists" });
    }
    //  Note, password hashing is done in the user model
    const newUser = new User(req.body);
    const savedUser = await newUser.save();
    if (!savedUser) {
      return res
        .status(400)
        .json({ success: false, message: "failed creating user" });
    }

    // Convert to plain object and explicitly strip the password field to return as response
    const userResponse = savedUser.toObject();
    delete userResponse.password;

    return res.status(201).json({
      success: true,
      message: `User  ${username} created successfully`,
      data: userResponse,
    });
  } catch (error) {
    // Handle MongoDB duplicate key errors (e.g., unique email or username)
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue);
      return res
        .status(409)
        .json({ success: false, message: `That ${field} is already taken.` });
    }
    return res.status(500).json({
      success: false,
      message: "Server error while creating user",
      error: error.message,
    });
  }
};

// @desc Get all users
// @route GET /api/users
// @access private
const getAllUsers = async (req, res) => {
  try {
    // Fetch users and exclude the password field for security
    const users = await User.find({}).select("-password").lean();
    if (!users?.length) {
      return res
        .status(400)
        .json({ success: false, message: "No users found" });
    }
    // Return a 200 OK status with the users data
    return res
      .status(200)
      .json({ success: true, count: users.length, data: users });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server Error: Unable to fetch users",
      error: error.message,
    });
  }
};

// @desc Get single user
// @route GET /api/users/:id
// @access private
const getUser = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findById(id).select("-password");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "user not found" });
    }
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server Error: Unable to fetch user",
      error: error.message,
    });
  }
};

// @desc Updates an existing user account (All or Partial fields)
// @route PATCH /api/users/:id
// @access private
const updateUser = async (req, res) => {
  const { id } = req.params;
  const { username, email, password, roles, status } = req.body;

  try {
    const user = await User.findById(id).select("-password");
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "User not found" });
    }
    //  Prevent accidental password modification if it's sent empty/invalid in body
    if (req.body.password === undefined || req.body.password === "") {
      delete req.body.password;
    }

    // Dynamically assign incoming validated fields to the Mongoose document
    // Because 'stripUnknown: true' is in our Joi middleware, req.body is guaranteed clean
    Object.assign(user, req.body);

    // CRITICAL: Explicitly tell Mongoose that the array was modified
    if (req.body.roles) {
      user.markModified("roles");
    }
    //  Save the document (triggers pre-save validation/hooks)
    const updatedUser = await user.save();
    if (!updatedUser) {
      return res
        .status(400)
        .json({ success: false, message: "failed to update user" });
    }

    // Convert to object and explicitly remove the password field before responding
    const userResponse = updatedUser.toObject();
    delete userResponse.password;

    return res.status(200).json({
      success: true,
      message: `User ${userResponse.username || "profile"} updated successfully.`,
      data: userResponse,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while updating user.",
      error: error.message,
    });
  }
};

// @desc Delete a user
// @route DELETE /api/users/:id
// @access private
const deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    const existinguser = await User.findById(id);
    if (!existinguser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    // Scan other collections in parallel for references
    // i.e. Check if user is in Employees or customer or reservation or order table before deleting
    const [hasEmployees, hasCustomers, hasReservations, hasOrders] =
      await Promise.all([
        Employee.exists({ employee: id }),
        Customer.exists({ customer: id }),
      ]);
    if (hasEmployees || hasCustomers) {
      return res.status(400).json({
        message:
          "Cannot delete user. This user has active  employee or customer   associated with them.",
      });
    }
    // find and delete user
    const user = await User.findByIdAndDelete(id);
    res.status(200).json({
      success: true,
      message: `User ${user.username} deleted successfully `,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while deleting user.",
      error: error.message,
    });
  }
};

export { getAllUsers, getUser, CreateNewUser, updateUser, deleteUser };
