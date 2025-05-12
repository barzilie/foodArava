// routes/settingsRoutes.js
const express = require('express');
const AdminSetting = require('../models/AdminSetting');
const { protect } = require('../middleware/authMiddleware'); // Require regular login

const router = express.Router();

// GET /api/settings/completion-date - Get default completion date (For any logged-in user)
router.get('/completion-date', protect, async (req, res) => {
    try {
        const settings = await AdminSetting.findOne({ settingKey: 'globalSettings' });
        // Provide a calculated default if not set in DB, matching the schema default logic
        const defaultDate = settings ? settings.defaultCompletionDate : (() => {
             const date = new Date();
             date.setDate(date.getDate() + 3); // Default to 3 days if not set
             date.setHours(17, 0, 0, 0); // Example: 5 PM
             return date;
            })();
        res.json({ defaultCompletionDate: defaultDate });
    } catch (error) {
         console.error("Error fetching public settings:", error);
         // Send a more generic error to non-admins
        res.status(500).json({ message: "שגיאה בקבלת תאריך השלמה צפוי" });
    }
});

module.exports = router;
