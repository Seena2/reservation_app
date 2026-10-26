import mongoose from "mongoose";
import Counter from "./counter.model.js";//generate sequential, easy to memorize id

const customerSchema = new mongoose.Schema({
    userId:{
        type:mongoose.Schema.Types.ObjectId, 
        required: [true,"Customer must be linked to a User accounts."],
        ref:'User', //refers user schema
        unique: true,  // Prevents duplicate profiles for the same user
        index: true // Fast lookup for all orders by a specific user
    },
    // Friendly sequential ID (e.g., CUST-0001)
    customerId: {
      type: String,
      unique: true,
      index: true  
    },
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
        maxlength: [50, 'First name cannot exceed 50 characters']
     },
    middleName: {
        type: String,
        trim: true,
        maxlength: [50, 'Middle name cannot exceed 50 characters']
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
        match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address'],
        index: true
  },
  phone: {
    type: String,
    required:[true, "Please provide phone number"],
    trim: true
  },
  address:[ {
    type:{
       country: {type:String, required: true},
       state: {type:String, required: true},
       city: {type:String, required: true},
       street: {type:String},
       zipCode: {type:String},
        isDefault: { type: Boolean, default: true }
    }
  }],
   status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
},{
    timestamps: true //CreatedAt & UpdatedAt
})
// Middleware: Pre-save hook to generate sequential employeeId
customerSchema.pre('save', async function () {
  // Only generate a new ID if it's a new document
  if (this.isNew) {
      const counter = await Counter.findOneAndUpdate(
        { id: 'customerId' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );

      // Formats number to 4 digits padding with zeros (e.g., 1 -> '0001')
      const paddedSeq = String(counter.seq).padStart(4, '0');
      this.employeeId = `CUST-${paddedSeq}`;
    } 
});
// use the schema model to create the collection and export it
const Customer = mongoose.model('Customer', customerSchema)
export default Customer;


///
