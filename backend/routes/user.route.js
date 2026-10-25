import express from "express";
import {
  CreateNewUser,
  deleteUser,
  getAllUsers,
  getUser,
  updateUser,
} from "../controllers/user.controller.js";
import {
  validateBody,
  validateParams,
} from "../middlewares/validator.middleware.js";
import {
  createUserSchema,
  updateUserSchema,
  mongoIdSchema,
} from "../validators/user.validator.js";

//Create route instance
const router = express.Router();

// invoke http methods on the router object that use "/api/users" as base URL and
// Pass your validateBody middleware function directly into the route handlers before calling the controller actions.
// Note, validateBody or validateParams middlewares intercept the request and validate the data using validation schema
//built using "joi" before processing the data using the controller methods
router.post("/", validateBody(createUserSchema), CreateNewUser);
router.get("/", getAllUsers);
// Protect routes that use MongoDB :id matching
router.get("/:id", validateParams(mongoIdSchema), getUser);
router.patch(
  "/:id",
  [validateParams(mongoIdSchema), validateBody(updateUserSchema)],
  updateUser,
);
router.delete("/:id", validateParams(mongoIdSchema), deleteUser);

export default router