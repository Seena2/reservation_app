import mongoose from 'mongoose';

// To generate sequential IDs without risking duplicates or race conditions, we use a dedicated counter collection.
const CounterSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 }
});

const Counter = mongoose.model('Counter', CounterSchema);
export default Counter;