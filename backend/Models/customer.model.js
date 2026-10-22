import mongoose from "mongoose";

const customerSchema = new mongoose.Schema({
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
  
  phone: {
    type: String,
    trim: true
  },
 status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
 addresses: [{
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: String,
    isDefault: { type: Boolean, default: false }
  }]
},{
    timestamps: true //CreatedAt & UpdatedAt
})
// use the schema model to create the collection
const Customer = mongoose.model('Customer', customerSchema)
export default Customer;