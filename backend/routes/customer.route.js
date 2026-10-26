import express from "express";
import {
  createNewCustomer,
  getAllCustomers,
  getCustomer,
  updateCustomer,
  deleteCustomer,
} from "../controllers/customer.controller.js";
import {
  validateBody,
  validateParams,
} from "../middlewares/validator.middleware.js";
import {
  createCustomerSchema,
  updateCustomerSchema,
  mongoIdSchema,
} from "../validators/customer.validator.js";


//Create route instance
const router = express.Router();

// invoke http methods on the router object that use "/api/users" as base URL
router.post("/",validateBody(createCustomerSchema), createNewCustomer);
router.get("/", getAllCustomers);
router.get("/:id",validateParams(mongoIdSchema), getCustomer);
router.patch("/:id",[validateParams(mongoIdSchema), validateBody(updateCustomerSchema)], updateCustomer);
router.delete("/:id", validateParams(mongoIdSchema),deleteCustomer);

export default router