// routes/authRoutes.js
const express = require('express');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const router = express.Router();

// POST /api/auth/register - Modified for Address and Admin Password
router.post('/register', async (req, res) => {
  // Destructure new fields: address object, password, isAdmin flag (optional)
  const { name, phone, address, password, isAdmin } = req.body;
  // address should be: { area: '...', settlement: '...', details: '...' }

  // Basic validation
  if (!name || !phone || !address || !address.area || !address.settlement || !address.details) {
    return res.status(400).json({ message: 'יש למלא את כל שדות החובה: שם, טלפון, אזור, יישוב ופרטי כתובת' });
  }
  // If attempting to register as admin, password is required
  if (isAdmin === true || isAdmin === 'true') {
      if (!password || password.length < 6) {
          return res.status(400).json({ message: 'רישום מנהל דורש סיסמה באורך 6 תווים לפחות' });
      }
  }

  const normalizedPhone = phone.replace(/-/g, '');

  try {
    const existingUser = await User.findOne({ phone: normalizedPhone });
    if (existingUser) {
      return res.status(400).json({ message: 'מספר טלפון זה כבר רשום במערכת' });
    }

    // Create new user object
    const newUser = new User({
      name,
      phone: normalizedPhone,
      address: { // Assign nested address object
          area: address.area,
          settlement: address.settlement,
          details: address.details
      },
      // Set isAdmin (default is false in schema)
      isAdmin: isAdmin === true || isAdmin === 'true',
      // Set password only if isAdmin is true (hashing happens in pre-save hook)
      password: (isAdmin === true || isAdmin === 'true') ? password : undefined
    });

    // Mongoose validation check (includes phone format, address structure, conditional password)
    await newUser.validate();
    const savedUser = await newUser.save(); // Hashing occurs here if needed

    res.status(201).json({
        message: 'ההרשמה בוצעה בהצלחה!',
        // Don't return sensitive info like password hash
        user: {
            id: savedUser._id,
            name: savedUser.name,
            phone: savedUser.phone,
            address: savedUser.address, // Return full address object
            isAdmin: savedUser.isAdmin
        }
    });

  } catch (error) {
    if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(val => val.message);
        return res.status(400).json({ message: messages.join(', ') });
    }
    console.error('Error during registration:', error);
    res.status(500).json({ message: 'שגיאה ברישום המשתמש. נסו שנית מאוחר יותר.' });
  }
});

// POST /api/auth/login - Modified for potential two-step admin login
router.post('/login', async (req, res) => {
  const { name, phone } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ message: 'יש למלא שם וטלפון' });
  }

  const normalizedPhone = phone.replace(/-/g, '');

  try {
    // Find user by exact name and normalized phone
    // Select password only if needed later (or rely on instance method)
    const user = await User.findOne({ name: name.trim(), phone: normalizedPhone }).select('+password'); // Attempt to select password

    if (!user) {
      return res.status(401).json({ message: 'שם או טלפון אינם נכונים' });
    }

    // --- Check if Admin ---
    if (user.isAdmin) {
        // If admin, DON'T log in yet. Signal that password is required.
        // Send back minimal info needed for the next step.
        console.log(`Admin login attempt detected for: ${user.name}`); // Log admin attempt
        return res.status(200).json({
            adminLoginRequired: true,
            userId: user._id, // Send userId to identify user in the next step
            message: 'נדרשת סיסמת מנהל'
        });
    }

    // --- Regular User Login ---
    // If regular user, proceed with token generation (no password check needed)
    const payload = { user: { id: user._id, name: user.name, isAdmin: user.isAdmin } };
    jwt.sign( payload, process.env.JWT_SECRET, { expiresIn: '1d' }, (err, token) => {
        if (err) throw err;
        res.json({
          message: 'התחברת בהצלחה!',
          token,
          user: { // Send back user details needed by the frontend
            id: user._id,
            name: user.name,
            phone: user.phone,
            address: user.address, // Send full address object
            isAdmin: user.isAdmin
          }
        });
      }
    );

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'שגיאה בתהליך ההתחברות' });
  }
});


// --- NEW Route for Admin Password Verification ---
// POST /api/auth/login/admin-password
router.post('/login/admin-password', async (req, res) => {
    const { userId, password } = req.body;

    if (!userId || !password) {
        return res.status(400).json({ message: 'נדרש מזהה משתמש וסיסמה' });
    }

    try {
        // Find the admin user by ID and explicitly select the password field
        const user = await User.findById(userId).select('+password');

        // Verify user exists, is an admin, and has a password set
        if (!user || !user.isAdmin || !user.password) {
            console.warn(`Admin password check failed: User ${userId} not found, not admin, or no password.`);
            return res.status(401).json({ message: 'אימות מנהל נכשל (משתמש לא תקין)' });
        }

        // Use the instance method to compare passwords
        const isMatch = await user.matchPassword(password);

        if (!isMatch) {
            console.warn(`Admin password check failed: Incorrect password for user ${userId}`);
            return res.status(401).json({ message: 'סיסמת מנהל שגויה' });
        }

        // --- Password Correct - Admin Login Success ---
        console.log(`Admin password verified successfully for user ${userId}`);
        // Generate JWT token for the admin
        const payload = { user: { id: user._id, name: user.name, isAdmin: user.isAdmin } };
        jwt.sign( payload, process.env.JWT_SECRET, { expiresIn: '1d' }, (err, token) => {
            if (err) throw err;
            res.json({
              message: 'התחברת בהצלחה כמנהל!',
              token,
              user: { // Send back user details needed by the frontend
                id: user._id,
                name: user.name,
                phone: user.phone,
                address: user.address, // Send full address object
                isAdmin: user.isAdmin
              }
            });
          }
        );

    } catch (error) {
        console.error('Admin password verification error:', error);
        res.status(500).json({ message: 'שגיאה באימות סיסמת מנהל' });
    }
});
module.exports = router;