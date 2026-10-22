import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
    productType: {
        enum: ['food', 'drink', 'cloth','other'],
        default: 'food'   
    },
    // category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, required: true },
    sku: { type: String, required: true, unique: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    brand: { type: String, index: true },
    images: [{
    url: String,
    altText: String
    }],
    attributes: { type: Map, of: String }, // e.g., { color: "Red", size: "L" }
     inventory: {
    quantity: { type: Number, required: true, default: 0 },
    inStock: { type: Boolean, default: true }
     },
    status: { type: String, 
        enum: ['active', 'draft', 'archived'],
        default: 'active' },
  tags: [String]
   
},{
    timestamps: true //CreatedAt & UpdatedAt
})
// use the schema model to create the collection
const Product = mongoose.model('Product', productSchema);
export default Product;