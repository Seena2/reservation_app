import mongoose from "mongoose";
import User from "../models/user.model.js";
import Employee from "../models/employee.model.js";
import Customer from "../models/customer.model.js";
import bcrypt from "bcrypt";

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
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid user Id" });
    }
    const user = await User.findById(id);
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

// @desc Create new user account
// @route POST /api/users
// @access private
const CreateNewUser = async (req, res) => {
  const { username, email, password, roles, status } = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email }).lean().exec();
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }
    // Validate mandatory fields
    if (
      !username ||
      typeof username !== "string" ||
      username.trim().length < 3
    ) {
      return res.status(400).json({
        message: "Username is required and must be at least 3 characters long.",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return res
        .status(400)
        .json({ message: "A valid email address is required." });
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return res.status(400).json({
        message: "Password is required and must be at least 6 characters long.",
      });
    }
    // Validat optional fields
    if (roles !== undefined && (!Array.isArray(roles) || roles.length === 0)) {
      return res.status(400).json({ message: "Add at least one role." });
    }

    if (status !== undefined && typeof status !== "boolean") {
      return res
        .status(400)
        .json({ message: "status must be a boolean value." });
    }
    // hash the password using bcrypt
    const hashedPassword = await bcrypt.hash(password, 12);
    // Construct and save the new user document
    const newUser = new User({
      username: username.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      roles: roles || ["Customer"], // Default fallback if no role is provided
      status: status !== undefined ? status : true, // Default to true if not provided
    });
    const savedUser = await newUser.save();

    // Convert to plain object and explicitly strip the password field
    const userResponse = savedUser.toObject();
    delete userResponse.password;

    if (!savedUser) {
      return res
        .status(400)
        .json({ success: false, message: "failed creating user" });
    }

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

// @desc Updates an existing user account (All or Partial fields)
// @route PATCH /api/users/:id
// @access private
const updateUser = async (req, res) => {
  const { id } = req.params;
  const { username, email, password, roles, status } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "Invalid user Id" });
  }

  try {
    const user = await User.findById(id);
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "user not found" });
    }
    // Validate and dynamically assign provided fields (Partial Updates)
    if (username !== undefined) {
      if (typeof username !== "string" || username.trim().length < 3) {
        return res
          .status(400)
          .json({ message: "Username must be at least 3 characters long." });
      }
      user.username = username.trim();
    }

    if (email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res
          .status(400)
          .json({ message: "Please provide a valid email address." });
      }
      user.email = email.toLowerCase().trim();
    }

    if (password !== undefined) {
      if (typeof password !== "string" || password.length < 6) {
        return res
          .status(400)
          .json({ message: "Password must be at least 6 characters long." });
      }
      // Assign plain text; Mongoose pre-save middleware should handle hashing
      // hash the password in the User Schema model
      user.password = password;
    }

    if (roles !== undefined) {
      if (!Array.isArray(roles) || roles.length === 0) {
        return res.status(400).json({ message: "Add at least one role." });
      }
      user.roles = roles;
    }

    if (status !== undefined) {
      if (typeof status !== "boolean") {
        return res
          .status(400)
          .json({ message: "status must be a boolean value." });
      }
      user.status = status;
    }
    //  Save the document (triggers pre-save validation/hooks)
    const updatedUser = await user.save();

    // Convert to object and explicitly remove the password field before responding
    const userResponse = updatedUser.toObject();
    delete userResponse.password;

    if (!updatedUser) {
      return res
        .status(400)
        .json({ success: false, message: "failed to update user" });
    }

    return res.status(200).json({
      success: true,
      message: `User ${username} updated successfully.`,
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
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "Invalid user Id" });
  }
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
