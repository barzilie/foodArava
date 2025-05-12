// models/Product.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'שם מוצר הוא שדה חובה'],
    trim: true
  },
  pricePerUnit: {
    type: Number,
    required: [true, 'מחיר ליחידה הוא שדה חובה'],
    min: [0, 'מחיר לא יכול להיות שלילי']
  },
  photo: {
    type: String, // This will store the URL from Cloudinary
    required: false // Or true, depending if every product MUST have a photo
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  isSpecialOffer: { // To easily filter products for the "Special Offers" section
    type: Boolean,
    default: false
  },
  manufacturer: { // יצרן
    type: String,
    trim: true,
    default: null
  },
  servingOptions: { // אפשרויות הגשה/חיתוך
    type: [String], // Array of strings
    default: []
  },
  // --- New Field: Default Packet Count ---
  defaultPacketCount: { // מספר אריזות/מגשים דיפולטיבי
    type: Number,
    default: 0,
    min: [0, 'מספר אריזות לא יכול להיות שלילי'],
    // Ensure it's an integer
    validate: {
        validator: Number.isInteger,
        message: '{VALUE} אינו מספר שלם תקין עבור מספר אריזות'
    }
}
}, {
timestamps: true
});

// Helper function to ensure servingOptions are stored as trimmed strings
productSchema.pre('save', function(next) {
  if (this.servingOptions && this.servingOptions.length > 0) {
    this.servingOptions = this.servingOptions.map(option => option.trim()).filter(option => option.length > 0);
  }
  next();
});

module.exports = mongoose.model('Product', productSchema);