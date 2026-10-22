import mongoose from "mongoose";

const inventorySchema = new mongoose.Schema({
    type: {
        enum: ['grocery', 'drink', 'product'],
        default: 'grocery'   
    },
    name: {
        type: String,
        required: true  
    },
    unit: {
        type: String,
        required: true  
    },
    quantity: {
        type: String,
        required: true  
    },
    note:{
        type:String,
        required: true
    } 
},{
    timestamps: true //CreatedAt & UpdatedAt
})
// use the schema model to create the collection
const Inventory = mongoose.model('Inventory', inventorySchema);
export default Inventory;