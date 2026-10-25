import 'dotenv/config';
import express  from "express";
import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path';
import cookieParser from "cookie-parser";
import { errorHandler } from "./middlewares/errorHandler.js";
import { corsOptions } from "./config/corsOptions.js";
import { logger, logEvents } from "./middlewares/logger.js";
import rootRoute from "./routes/root.route.js";
import userRoutes from "./routes/user.route.js";
import employeeRoutes from "./routes/employee.route.js";
import customerRoutes from "./routes/customer.route.js";
import inventoryRoutes from "./routes/inventory.route.js";
import connectToDB from "./config/db.js";

// allow dns request, for mongo atlas
import dns from "node:dns/promises";
dns.setServers(["1.1.1.1", "8.8.8.8"]);

console.log(`Current Environment: ${process.env.NODE_ENV}`);
// connect to the DB
connectToDB();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5050;
const __dirname = import.meta.dirname;

// MIDDLEWARES
app.use(logger);
app.use(cors(corsOptions));
app.use(express.json()); // Essential for parsing PATCH/PUT request bodies
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// specify static files directory
app.use("/", express.static(path.join(__dirname, "public")));

// ROUTES: API ENDPOINTS
app.use("/api/", rootRoute);
app.use("/api/users", userRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/customers", inventoryRoutes);


// CATCH ALL 404 WILDCARD (Runs only if no route above matches)
app.all("*any", (req, res) => {
  res.status(404);
  if (req.accepts("html")) {
    res.sendFile(path.join(__dirname, "views", "404.html"));
  } else if (req.accepts("json")) {
    res.json({ message: "404, Not Found" });
  } else {
    res.type("txt").send("404, Not Found");
  }
});


app.use( errorHandler);


// Make sure database is connected before the server starts
mongoose.connection.once('open',()=>{ 
  app.listen(PORT, () => {
      console.log(`🚀 Server is running at https://localhost:${PORT}`);
    });
})
mongoose.connection.on('error', err=>{
  console.log(err)
  // use our custom logger middleware to log errors
  logEvents(`${err.no}: ${err.code} \t {err.syscall}\t ${err.hostname} `,'mongoError.log')
})


