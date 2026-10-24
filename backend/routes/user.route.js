import express from "express";
import {
  CreateNewUser,
  deleteUser,
  getAllUsers,
  getUser,
  updateUser,
} from "../controllers/user.controller.js";

//Create route instance
const router = express.Router();

// invoke http methods on the router object that use "/api/users" as base URL
router.post("/", CreateNewUser);
router.get("/", getAllUsers);
router.get("/:id", getUser);
router.patch("/:id", updateUser);
router.delete("/:id", deleteUser);

export default router