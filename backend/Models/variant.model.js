import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const VariantSchema = new Schema({
  productId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Product', 
    required: true,
    index: true 
  },
  sku: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true 
  },
    brand: { type: String,  trim: true, index:true },
  // Variation attributes structured for easy filtering
  attributes: {
    color: { type: String, required: true, trim: true },
    size: { type: String, required: true, trim: true },
    material: { type: String, trim: true }
  },
    images: [{
    url: String,
    altText: String
    }],
  unitCostCents: { 
    type: Number, 
    required: true, // Stored as integer cents (e.g., $15.99 -> 1599)
    min:0
  },
currency: { 
    type: String, 
    required: true, 
    uppercase: true,
    default: 'USD' 
},
 note:{
        type:String,
        required: true
    },
  upc: { type: String, trim: true }, // Barcode

}, { timestamps: true });

// Index for fast product-specific variant lookups
VariantSchema.index({ 'attributes.color': 1, 'attributes.size': 1 });

module.exports = mongoose.model('Variant', VariantSchema);