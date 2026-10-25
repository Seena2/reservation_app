import express from "express";
import {
  createNewCustomer,
  getAllCustomers,
  getCustomer,
  updateCustomer,
  deleteCustomer,
} from "../controllers/customer.controller.js";

//Create route instance
const router = express.Router();

// invoke http methods on the router object that use "/api/users" as base URL
router.post("/", createNewCustomer);
router.get("/", getAllCustomers);
router.get("/:id", getCustomer);
router.patch("/:id", updateCustomer);
router.delete("/:id", deleteCustomer);

export default router