import mongoose from "mongoose";

const InventorySchema = new mongoose.Schema({
     variantId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Variant', 
        required: true 
    },
    warehouseId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Warehouse', 
        required: true 
    },
    category: {
        type: String,
        enum: ['grocery', 'drink', 'product'],
        default: 'grocery' ,
        index: true 
    },
    // Specific location identifier inside the facility (Aisle 4, Shelf B)
    binLocation: { 
        type: String, 
        trim: true 
  }, 
   quantityAvailable: { 
        type: Number, 
        required: true, 
        min: [0, 'Stock cannot be negative'],
        default: 0 
    },
    quantityReserved: { 
        type: Number, 
        required: true, 
        min: 0,
        default: 0 
     },
    //  The absolute minimum safety-stock threshold. When quantityAvailable dips below this number, 
    // it flags the system to trigger a restock notification or automate a purchase order.
     reorderPoint: { 
        type: Number, 
        default: 10 
    },
    note:{
        type:String,
        required: true
    },
    lastCountedAt: { 
        type: Date 
    },
     status: {
        type: String,
        enum: ['in-stock', 'low-stock', 'out-of-stock', 'discontinued'],
        default: 'out-of-stock'
    }
},{
    timestamps: true //CreatedAt & UpdatedAt
});
// CRITICAL INDEX: Ensures a variant can only have ONE inventory record per warehouse.
// Also drastically speeds up lookups like: "Check stock of Variant X in Warehouse Y"
InventorySchema.index({ warehouseId: 1, variantId: 1 }, { unique: true });
InventorySchema.index({ quantityAvailable: 1 });

// use the schema model to create the collection
const Inventory = mongoose.model('Inventory', InventorySchema);
export default Inventory;