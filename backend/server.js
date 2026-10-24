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
import connectToDB from "./config/db.js";

// allow dns request, for mongo atlas
import dns from "node:dns/promises";
dns.setServers(["1.1.1.1", "8.8.8.8"]);

console.log(process.env.NODE_ENV);
// connect to the DB
connectToDB();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5050;
const MONGODB_URI = process.env.ATLAS_URI;

// MIDDLEWARES
app.use(express.json()); //parse json data
// specify the static files directory by listening request on root ('/')
const __dirname = import.meta.dirname;
app.use("/", express.static(path.join(__dirname, "public")));
// or shortcut to specify static folder, whith out explictly resolving path
app.use(express.static("public"));
// custom middleware
app.use(logger);
app.use(errorHandler);
// Third party middlewares
app.use(cookieParser());
app.use(cors(corsOptions));

// ROUTES: API ENDPOINTS
app.use("/api/", rootRoute);
app.use("/api/users", userRoutes);
app.use("/api/employees", employeeRoutes);

// catch all 404, page
app.all('/*splat', (req,res)=>{
    res.status(404);
    if(req.accepts('html')){
        res.sendFile(path.join(__dirname,'views', '404.html'));
    }else if(req.accepts('json')){
        res.json({message:'404, Not Found'});
    }else{
        res.type('txt').send('404, Not Found');
    }
})
// custom middleware
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


