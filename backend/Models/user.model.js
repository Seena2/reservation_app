import mongoose from "mongoose";
import bcrypt from 'bcrypt'

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Provide user name"],
    },
    
    email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address']
  },
    password: {
      type: String,
      required: [true, 'Password is required.'],
      minlength: [6, 'Password must be at least 6 characters.'],
      select: false, // Prevents password from being returned in queries by default
    
    },
    roles: [
      {
        // User can have multiple roles
        type: String,
        enum: ['Customer','Employee', 'Admin', 'HR'],
        default: "Customer",
      },
    ],
    status: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, //CreatedAt & UpdatedAt
  },
);

// Hash password before saving
userSchema.pre('save', async function () {
  // If the password wasn't modified, just exit the function early
  if (!this.isModified('password')) return;
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (err) {
   // Throwing an error inside an async pre-save hook automatically aborts the save
    throw err; 
  }
});
// use the schema model to create the collection
const User = mongoose.model('User', userSchema)
export default User;