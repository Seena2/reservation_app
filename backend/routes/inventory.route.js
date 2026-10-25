import express from "express";
import {
  createNewInventory,
  getAllInventories,
  getInventory,
  updateInventory,
  deleteInventory,
} from "../controllers/inventory.controller.js";

//Create route instance
const router = express.Router();

// invoke http methods on the router object that use "/api/users" as base URL
router.post("/", createNewInventory);
router.get("/", getAllInventories);
router.get("/:id", getInventory);
router.patch("/:id", updateInventory);
router.delete("/:id", deleteInventory);

export default router