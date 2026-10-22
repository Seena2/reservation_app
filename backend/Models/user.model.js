import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    username:{
        type:String,
        required: [true,"Provide user name"]
    },
    email:{
        type:String,
        required: [true,"Provide your  email"]
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address']
    },
    password:{
        type:String,
        required: [true,"Provide password"]
    },
    roles:[{ // User can have multiple roles
        type:String,
        default: "Customer"
    }],
    active:{
        type:Boolean,
        default: true
    }
},{
    timestamps: true //CreatedAt & UpdatedAt
})
// use the schema model to create the collection
const User = mongoose.model('User', userSchema)
export default User;