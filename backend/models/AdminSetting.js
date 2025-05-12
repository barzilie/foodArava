// models/AdminSetting.js
const mongoose = require('mongoose');

const adminSettingSchema = new mongoose.Schema({
  settingKey: {
    type: String,
    default: 'globalSettings',
    unique: true,
    required: true
  },
  // Changed from defaultCompletionDays to defaultCompletionDate
  defaultCompletionDate: {
    type: Date,
    default: () => {
        // Set a default future date if none exists initially (e.g., 3 days from now)
        const date = new Date();
        date.setDate(date.getDate() + 3);
        date.setHours(17, 0, 0, 0); // Example: Set default time to 5 PM
        return date;
    }
  }
});

module.exports = mongoose.model('AdminSetting', adminSettingSchema);