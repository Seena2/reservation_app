import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
   
    // category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    category: { type: String, enum: ['food', 'drink', 'cloth','other'],
        default: 'food', required: true, index: true },
    name: { type: String, required: true, trim: true , },
    slug: { type: String, required: true, unique: true, lowercase: true },
    
    description: { type: String,  },
   
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