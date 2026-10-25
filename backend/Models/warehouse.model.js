const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const WarehouseSchema = new Schema({
  name: { type: String, required: true, unique: true, trim: true },
  code: { type: String, required: true, unique: true, uppercase: true, trim: true }, // e.g., NY-01
  address: {
    street: String,
    city: String,
    state: String,
    zip: String
  },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Warehouse', WarehouseSchema);