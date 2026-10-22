import mongoose from "mongoose";

const DB_URL=process.env.ATLAS_URI;

// handler function that connects to the database
const connectToDB = async()=>{
    try {
        const conn =await mongoose.connect(DB_URL);
        console.log(`('✅ MongoDB connected successfully: ${conn.connection.host}`);
    } catch (error) {
        console.error(`❌ Database connection failed. Server not started.`,error.messaage);
        process.exit(1); // 1 means exit process with failure, 0 means success
    }
}
export default connectToDB