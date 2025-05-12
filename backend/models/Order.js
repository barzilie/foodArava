// models/Order.js
const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  name: { // Denormalized: Store product name at the time of order
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'כמות חייבת להיות לפחות 1']
  },
  priceAtOrder: { // Denormalized: Store price at the time of order
    type: Number,
    required: true
  },  // New field for selected serving option
  selectedServingOption: {
    type: String,
    default: null
  },
   // Optional: Denormalize manufacturer here if needed for easier filtering
   manufacturer: {
      type: String,
      default: null
   },
  // --- New Field: Packet Count for this Order Item ---
  packetCount: { // מספר אריזות שהוזמן
    type: Number,
    default: null, // Default to null, set by user if applicable
    min: [1, 'מספר אריזות חייב להיות לפחות 1 אם צוין'], // Min 1 if user sets it
    validate: { // Ensure integer if set
        validator: function(v) { return v === null || Number.isInteger(v); },
        message: '{VALUE} אינו מספר שלם תקין עבור מספר אריזות'
    }
}
}, { _id: false });

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: { // Denormalized: Store user name for easy display, especially in admin views
    type: String,
    required: true
  },
  userPhone: { // Denormalized: Store user phone for easy display/contact
    type: String,
    required: true
  },
  deliveryAddress: { // The specific address for this order delivery
    type: String,
    required: [true, 'כתובת למשלוח היא שדה חובה'],
    trim: true
  },
  products: [orderItemSchema], // Array of products in the order
  totalPrice: {
    type: Number,
    required: true
  },
  orderDate: { // Date the order was placed
    type: Date,
    default: Date.now
  },
  modificationDate: { // Date the order was last modified by the user
    type: Date,
    default: null
  },
  completionDate: { // Estimated/Actual date the order will be ready/delivered (initially set by admin default)
    type: Date,
    required: [true, 'תאריך השלמה הוא שדה חובה']
  },
  status: { // To track the order's progress
    type: String,
    enum: ['Pending', 'Confirmed', 'Processing', 'Ready', 'Delivered', 'Cancelled'],
    default: 'Pending'
  },
  note: {
    type: String,
    trim: true,
    default: null
  }
}, {
  timestamps: true
});

// Middleware to set modificationDate on updates (excluding initial creation)
orderSchema.pre('save', function(next) {
  if (!this.isNew && this.isModified()) { // Check if it's not new AND if any field was actually modified
      this.modificationDate = new Date();
  }
  next();
});

// Optional: Add an index for faster querying by user or status/date
orderSchema.index({ userId: 1 });
orderSchema.index({ status: 1, completionDate: 1 });


module.exports = mongoose.model('Order', orderSchema);