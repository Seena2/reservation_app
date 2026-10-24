import express from "express";
import {
 getAllEmployees, getEmployee, CreateNewEmployee
} from "../controllers/employee.controller.js";

//Create route instance
const router = express.Router();

// invoke http methods on the router object that use "/api/users" as base URL
router.post("/", CreateNewEmployee);
router.get("/", getAllEmployees);
router.get("/:id", getEmployee);
// router.patch("/:id", updateUser);
// router.delete("/:id", deleteUser);

export default router