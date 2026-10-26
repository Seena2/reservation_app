import express from "express";
import {
  getAllEmployees,
  getEmployee,
  CreateNewEmployee,
  updateEmployee,
  deleteEmployee,
} from "../controllers/employee.controller.js";

import {
  validateBody,
  validateParams,
} from "../middlewares/validator.middleware.js";
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  mongoIdSchema,
} from "../validators/employee.validator.js";

//Create route instance
const router = express.Router();

// Pass your validateBody middleware function directly into the route handlers before calling the controller actions.
// Note, validateBody or validateParams middlewares intercept the request and validate the data using validation schema
router.post("/", validateBody(createEmployeeSchema), CreateNewEmployee);
router.get("/", getAllEmployees);
// Protect routes that use MongoDB :id matching (validate id before processing req)
router.get("/:id", validateParams(mongoIdSchema), getEmployee);
router.patch(
  "/:id",
  [validateParams(mongoIdSchema), validateBody(updateEmployeeSchema)],
  updateEmployee,
);
router.delete("/:id", validateParams(mongoIdSchema), deleteEmployee);

export default router
