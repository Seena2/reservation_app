import mongoose from "mongoose";

const customerSchema = new mongoose.Schema({
    userId:{
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
         match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address'],
        index: true
  },
  phone: {
    type: [String],
    trim: true
  },
 address: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: String,
    isDefault: { type: Boolean, default: false }
  },
   status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
},{
    timestamps: true //CreatedAt & UpdatedAt
})
// use the schema model to create the collection
const Customer = mongoose.model('Customer', customerSchema)
export default Customer;
