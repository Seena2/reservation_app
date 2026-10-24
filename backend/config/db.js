import mongoose from "mongoose";


// handler function that connects to the database
const connectToDB = async () => {
  try {
    const DB_URL = process.env.ATLAS_URI;
    if (!DB_URL) {
      throw new Error("MONGO_URI is not defined in the environment variables.");
    }
    const conn = await mongoose.connect(DB_URL);
    console.log(`('✅ MongoDB connected successfully: ${conn.connection.host}`);
  } catch (error) {
    // console.log(error)
    console.error(
      `❌ Database connection failed. Server not started. \n`,
      error,
    );
    process.exit(1); // 1 means exit process with failure, 0 means success
  }
};
export default connectToDB