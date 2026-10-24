import mongoose from "mongoose";
import AutoIncrementFactory from 'mongoose-sequence';
// Initialize the auto-increment plugin with your mongoose instance
const AutoIncrement = AutoIncrementFactory(mongoose);

// Sub-schema for items inside an order
const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  name: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true }
});


// the main Order schema
const orderSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true // Fast lookup for all orders by a specific user
  },
  orderItems: [orderItemSchema], // Array of multiple items
  totalAmount: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Processing', 'Delivered', 'Cancelled'],
    default: 'Pending'
  }
},{
    timestamps: true //CreatedAt & UpdatedAt
});
// Apply the seuence plugin to your schema
orderSchema.plugin(AutoIncrement, { 
  inc_field: 'orderId',   // The name of the field you want to auto-increment
  id:'orderNumber',
  start_seq: 1        // Optional: Start order numbers at 1000 instead of 1
});
// use the schema model to create the collection
const Order = mongoose.model('Order', orderSchema);
export default Order;