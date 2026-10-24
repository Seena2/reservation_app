import mongoose from "mongoose";
import Counter from "./counter.model.js";

// This file defines the Employee schema and uses a Mongoose "pre-save" hook to automatically increment and
//  format the sequential ID before saving a new employee.
const employeeSchema = new mongoose.Schema({
    // Friendly sequential ID (e.g., EMP-0001)
    employeeId: {
      type: String,
      unique: true,
      index: true // Fast lookup for all orders by a specific user
    },
    // References the separate User collection
    user:{
        type:mongoose.Schema.Types.ObjectId, 
        required: [true,"Employee must be linked to a User accounts."],
        ref:'User', //refers user schema
        unique: true,  
    },
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
        maxlength: [50, 'First name cannot exceed 50 characters']
     },
    middleName: {
        type: String,
        required: [true, 'Middle name is required'],
        trim: true,
        maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
        maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    dateOfBirth:{
        type: Date,
        required:[true, "Provide your date of birth"]
    },
    email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address']
  },
  phone: [{
    type: String,
    trim: true
  }],
   address: {
    street: String,
    city: String,
    country: String,
    zipCode: String
  },
  department: {
    type: String,
    required: true,
    enum: ['IT', 'Human Resources', 'Sales', 'Marketing', 'Finance']
  },
  position: {
    type: String,
    required: true
  },
  salary: {
    type: Number,
    required: true,
    min: [0, 'Salary cannot be negative']
  },
  dateOfHired: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
      enum: ['Active', 'On Leave', 'Terminated'],
      default: 'Active',
  },
    // Self-referencing field to link an Employee to their Manager (who is also an Employee)
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
    },
},{
    timestamps: true //CreatedAt & UpdatedAt
});
// Middleware: Pre-save hook to generate sequential employeeId
employeeSchema.pre('save', async function (next) {
  // Only generate a new ID if it's a new document
  if (this.isNew) {
    try {
      const counter = await Counter.findOneAndUpdate(
        { id: 'employeeId' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );

      // Formats number to 4 digits padding with zeros (e.g., 1 -> '0001')
      const paddedSeq = String(counter.seq).padStart(4, '0');
      this.employeeId = `EMP-${paddedSeq}`;
      
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

const Employee = mongoose.model('Employee', employeeSchema)
export default Employee;