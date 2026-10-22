import mongoose from "mongoose";

const roomSchema = new mongoose.Schema({
    roomType: {
        enum: ['single', 'douple', 'triple', 'family','Penthouse'],
        default: 'single'   
    },
    Floor_Number: {
        type: Number,
        required: true  
    },
    roomNuber: {
        type: String,
        required: true  
    },
    reserved: {
        type: Boolean,
        default: false  
    },
    note:{
        type:String,
        required: true
    }
   
},{
   timestamps: true //CreatedAt & UpdatedAt
})
// use the schema model to create the collection
const Room = mongoose.model('Room', roomSchema);
export default Room;