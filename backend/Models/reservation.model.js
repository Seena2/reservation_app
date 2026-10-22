import mongoose from "mongoose";
import mongooseSequence from 'mongoose-sequence';
import AutoIncrementFactory from 'mongoose-sequence';
// Initialize the auto-increment plugin with your mongoose instance
const AutoIncrement = AutoIncrementFactory(mongoose);

const reservationSchema = new mongoose.Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId, 
        required: [true,"Provide user name"],
        ref:'User', //refers user schema
        index: true // Fast lookup for all orders by a specific user
    },
    room: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Room'    
    },
    date:{
        type:Date,
        required: [true,"Provide your  email"]
    },
   startTime: {
        type: Date,
        required: true
    },
    endTime: {
         type: Date,
        required: true
    },
    note:{
        type:String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled'],
        default: 'confirmed'
     }
},{
    timestamps: true //CreatedAt & UpdatedAt
});
// Apply the seuence plugin to your schema
reservationSchema.plugin(AutoIncrement, { 
  inc_field: 'reservationId',   // The name of the field you want to auto-increment
  id:'reservationNumber',
  start_seq: 1000        // Optional: Start order numbers at 1000 instead of 1
});

// use the schema model to create the collection
const Reservation = mongoose.model('Reservation', reservationSchema);
export default Reservation;