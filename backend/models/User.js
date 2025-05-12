// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); 
const { Areas,settlementMap } = require('../utils/locations'); // Adjust path if needed

// --- Address Sub-Schema ---
const addressSchema = new mongoose.Schema({
  area: {
      type: String,
      required: [true, 'אזור הוא שדה חובה'],
      // Use the imported Areas array for validation
      enum: {
          values: Areas,
          message: 'ערך אזור אינו תקין'
      }
  },
  settlement: { // יישוב
      type: String,
      required: [true, 'יישוב הוא שדה חובה'],
      trim: true
      // Validation against settlementMap can be done in route handlers if needed,
      // as doing it directly in schema is complex.
  },
  details: { // Free text for street, house, etc.
      type: String,
      required: [true, 'פרטי כתובת (רחוב, בית) הם שדה חובה'],
      trim: true
  }
}, { _id: false }); // No separate ID for address subdocument

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'שם הוא שדה חובה'],
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'מספר טלפון הוא שדה חובה'],
    unique: true, // Ensure phone numbers are unique identifiers
    validate: {
      validator: function(v) {
        const phoneDigits = v.replace(/-/g, ''); // Remove hyphens for validation
        return /^05\d{8}$/.test(phoneDigits); // Check for 05 prefix and 10 digits total
      },
      message: props => `${props.value} אינו מספר טלפון ישראלי תקין (צריך להתחיל ב-05 ולהכיל 10 ספרות)`
    },
    // Setter to always store the phone number without hyphens for consistency
    set: function(v) {
        return v.replace(/-/g, '');
    }
  },  // --- Updated Address Field ---
  address: {
    type: addressSchema,
    required: true
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  // --- New Password Field ---
  password: {
    type: String,
    // Password is required only if isAdmin is true
    required: [
        function() { return this.isAdmin; }, // Context-dependent required
        'סיסמה היא שדה חובה עבור מנהל מערכת'
    ],
    minlength: [6, 'סיסמה חייבת להכיל לפחות 6 תווים'] // Example minimum length
  }
}, {
  timestamps: true
});

// --- Password Hashing Middleware ---
// Hash password before saving if it's modified (or new and isAdmin)
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new) AND if it exists
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  // Only hash if user is admin (double check, although 'required' handles creation)
  if (!this.isAdmin) {
      // If somehow a password exists for a non-admin, remove it
      this.password = undefined;
      return next();
  }

  try {
    const salt = await bcrypt.genSalt(10); // Generate salt
    this.password = await bcrypt.hash(this.password, salt); // Hash password
    next();
  } catch (error) {
    next(error); // Pass error to next middleware/handler
  }
});

// --- Method to compare entered password with hashed password ---
userSchema.methods.matchPassword = async function(enteredPassword) {
    // Only admins have passwords to match
    if (!this.isAdmin || !this.password) {
        return false;
    }
    return await bcrypt.compare(enteredPassword, this.password);
};


const User = mongoose.model('User', userSchema);
module.exports = User; // Export the model
// If you need Areas/settlementMap elsewhere in backend, you can re-export or import directly from utils
// module.exports.Areas = Areas;
// module.exports.settlementMap = settlementMap;