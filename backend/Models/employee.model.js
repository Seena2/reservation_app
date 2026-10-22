import mongoose from "mongoose";
import AutoIncrementFactory from 'mongoose-sequence';
// Initialize the auto-increment plugin with your mongoose instance
const AutoIncrement = AutoIncrementFactory(mongoose);

const employeeSchema = new mongoose.Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId, 
        required: [true,"Provide user name"],
        ref:'User', //refers user schema
        index: true // Fast lookup for all orders by a specific user
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
  phone: {
    type: String,
    trim: true
  },
  department: {
    type: String,
    required: true,
    enum: ['IT', 'Human Resources', 'Sales', 'Marketing', 'Finance']
  },
  role: {
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
  isActive: {
    type: Boolean,
    default: true
  },
  address: {
    street: String,
    city: String,
    country: String,
    zipCode: String
  },
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee' // Self-reference for hierarchy
  }
},{
    timestamps: true //CreatedAt & UpdatedAt
});
// Apply the seuence plugin to your schema
employeeSchema.plugin(AutoIncrement, { 
  inc_field: 'employeeId',   // The name of the field you want to auto-increment
  id:'employeeNumber',
  start_seq: 1        // Optional: Start order numbers at 1000 instead of 1
});
// use the schema model to create the collection
const Employee = mongoose.model('Employee', employeeSchema)
export default Employee;