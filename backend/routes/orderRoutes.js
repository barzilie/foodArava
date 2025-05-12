// routes/orderRoutes.js
const express = require('express');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const AdminSetting = require('../models/AdminSetting');
const { protect } = require('../middleware/authMiddleware'); // User must be logged in

const router = express.Router();

// POST /api/orders - Create a new order (User Only)
router.post('/', protect, async (req, res) => {
    // Added note, changed products input structure slightly
    const { products: orderItems, deliveryAddress, note } = req.body;
    // products: [{ productId, quantity, selectedServingOption (optional) }]
    const userId = req.user._id;
    const userName = req.user.name;
    const userPhone = req.user.phone;

    // --- Basic Validation ---
    if (!orderItems || orderItems.length === 0) {
        return res.status(400).json({ message: 'סל הקניות ריק' });
    }
    if (!deliveryAddress || deliveryAddress.trim() === '') {
        return res.status(400).json({ message: 'כתובת למשלוח היא שדה חובה' });
    }
    if (!userId) {
        return res.status(401).json({ message: 'משתמש לא מאומת' });
    }

    try {
        // --- Fetch Product Details, Validate Serving Options, Calculate Total ---
        const productIds = orderItems.map(item => item.productId);
        if (productIds.some(id => !mongoose.Types.ObjectId.isValid(id))) {
             return res.status(400).json({ message: 'מזהה מוצר לא תקין בסל הקניות' });
        }

        const productsFromDB = await Product.find({ '_id': { $in: productIds } });
        if (productsFromDB.length !== productIds.length) {
            const foundIds = productsFromDB.map(p => p._id.toString());
            const missingIds = productIds.filter(id => !foundIds.includes(id.toString()));
            return res.status(400).json({ message: `חלק מהמוצרים בסל אינם זמינים (${missingIds.join(', ')})` });
        }

        let calculatedTotalPrice = 0;
        const productsForOrderSchema = []; // Build this array carefully

        for (const item of orderItems) {
            const dbProduct = productsFromDB.find(p => p._id.toString() === item.productId);
            if (!dbProduct) {
                throw new Error(`Product not found during mapping: ${item.productId}`); // Should be caught by length check, but safety first
            }

            // Validate selectedServingOption if provided
            let validatedServingOption = null;
            if (item.selectedServingOption) {
                if (!dbProduct.servingOptions || dbProduct.servingOptions.length === 0) {
                     return res.status(400).json({ message: `למוצר '${dbProduct.name}' אין אפשרויות הגשה לבחירה.` });
                }
                if (!dbProduct.servingOptions.includes(item.selectedServingOption)) {
                     return res.status(400).json({ message: `אפשרות הגשה '${item.selectedServingOption}' אינה תקינה עבור המוצר '${dbProduct.name}'. אפשרויות זמינות: ${dbProduct.servingOptions.join(', ')}` });
                }
                validatedServingOption = item.selectedServingOption;
            } else if (dbProduct.servingOptions && dbProduct.servingOptions.length > 0) {
                // If serving options exist but none was selected, you might want to enforce selection
                // return res.status(400).json({ message: `יש לבחור אפשרות הגשה עבור המוצר '${dbProduct.name}'.` });
                // Or allow it to be null/default if selection is optional
            }


            const itemPrice = dbProduct.pricePerUnit * item.quantity;
            calculatedTotalPrice += itemPrice;

            productsForOrderSchema.push({
                productId: dbProduct._id,
                name: dbProduct.name,
                quantity: item.quantity,
                priceAtOrder: dbProduct.pricePerUnit,
                selectedServingOption: validatedServingOption, // Add selected option
                manufacturer: dbProduct.manufacturer, // Denormalize manufacturer for potential easier filtering later? Optional.
                                // Add packetCount if provided and valid, otherwise null
                packetCount: item.packetCount && Number.isInteger(Number(item.packetCount)) && Number(item.packetCount) >= 1
                    ? Number(item.packetCount)
                    : null
            });
        }


        // --- Get Default Completion Date from Admin Settings ---
        const settings = await AdminSetting.findOne({ settingKey: 'globalSettings' });
        // Use the date from settings or the schema's default function result if no setting doc exists
        const completionDate = settings ? settings.defaultCompletionDate : AdminSetting.schema.path('defaultCompletionDate').default()();

        // --- Create and Save Order ---
        const newOrder = new Order({
            userId,
            userName,
            userPhone,
            deliveryAddress: deliveryAddress.trim(),
            products: productsForOrderSchema,
            totalPrice: calculatedTotalPrice,
            completionDate, // Use the fetched/default date
            note: note ? note.trim() : null, // Add the note
            status: 'Confirmed'
        });

        await newOrder.validate();
        const savedOrder = await newOrder.save();

        res.status(201).json(savedOrder);

    } catch (error) {
        console.error('Error creating order:', error);
         if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        res.status(500).json({ message: 'שגיאה ביצירת ההזמנה' });
    }
});

// GET /api/orders/my - Get orders for the logged-in user (User Only)
router.get('/my', protect, async (req, res) => {
    try {
        const orders = await Order.find({ userId: req.user._id }).sort({ orderDate: -1 }); // Newest first
        res.json(orders);
    } catch (error) {
        console.error('Error fetching user orders:', error);
        res.status(500).json({ message: 'שגיאה בקבלת היסטוריית ההזמנות' });
    }
});

// GET /api/orders/my/:id - Get a specific order for the logged-in user (User Only)
router.get('/my/:id', protect, async (req, res) => {
    const orderId = req.params.id;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
        return res.status(400).json({ message: 'מזהה הזמנה לא תקין' });
    }

    try {
        const order = await Order.findOne({ _id: orderId, userId: userId });

        if (!order) {
            return res.status(404).json({ message: 'הזמנה לא נמצאה או שאינה שייכת למשתמש זה' });
        }

        res.json(order);
    } catch (error) {
        console.error(`Error fetching user order ${orderId}:`, error);
        res.status(500).json({ message: 'שגיאה בקבלת פרטי ההזמנה' });
    }
});


// PUT /api/orders/my/:id - Update an existing order (User Only) - Modified to allow quantity 0 for removal
router.put('/my/:id', protect, async (req, res) => {
    const orderId = req.params.id;
    const userId = req.user._id;
    const { products: inputOrderItems, deliveryAddress, note } = req.body;
    // products: [{ productId, quantity, selectedServingOption (optional) }]

    // --- Basic Validation ---
     if (!mongoose.Types.ObjectId.isValid(orderId)) {
        return res.status(400).json({ message: 'מזהה הזמנה לא תקין' });
    }
    // Validate input array structure and basic types *before* filtering
    if (!Array.isArray(inputOrderItems)) {
         return res.status(400).json({ message: 'נתוני המוצרים אינם תקינים (נדרש מערך)' });
    }
    
     if (inputOrderItems.some(item =>
            !item || // Check if item exists
            !mongoose.Types.ObjectId.isValid(item.productId) || // Check productId validity
            typeof item.quantity !== 'number' || // Check quantity is a number
            item.quantity < 0 // Check quantity is not negative
        )) {
        return res.status(400).json({ message: 'פרטי המוצרים בעדכון אינם תקינים (מזהה לא תקין או כמות שלילית)' });
    }

    // --- Filter out items with quantity 0 (intended for removal) ---
    const updatedOrderItems = inputOrderItems.filter(item => item.quantity > 0);

    // --- Check if order becomes empty after removal ---
    if (updatedOrderItems.length === 0) {
        // Instead of error, maybe cancel the order? Or delete it?
        // For now, let's return an error as the original request didn't specify this behavior.
        // You could change this later to cancel/delete the order if needed.
        return res.status(400).json({ message: 'לא ניתן לעדכן להזמנה ריקה. למחיקת הזמנה, השתמש בפונקציונליות נפרדת (אם קיימת).' });
    }


    try {
        const order = await Order.findOne({ _id: orderId, userId: userId });
        if (!order) {
            return res.status(404).json({ message: 'הזמנה לא נמצאה או שאינה שייכת למשתמש זה' });
        }

        // --- Check Status ---
        const allowedStatuses = ['Pending', 'Confirmed'];
        if (!allowedStatuses.includes(order.status)) {
             return res.status(400).json({ message: `לא ניתן לעדכן הזמנה במצב '${order.status}'` });
        }

        // --- Fetch Updated Product Details, Validate Serving Options, Recalculate (using the filtered list) ---
        const productIds = updatedOrderItems.map(item => item.productId); // Use filtered list
        const productsFromDB = await Product.find({ '_id': { $in: productIds } });

        // Check if all *remaining* products exist (should always pass if they existed before, but good check)
        if (productsFromDB.length !== productIds.length) {
             const foundIds = productsFromDB.map(p => p._id.toString());
             const missingIds = productIds.filter(id => !foundIds.includes(id.toString()));
             return res.status(400).json({ message: `חלק מהמוצרים בעדכון אינם זמינים (${missingIds.join(', ')})` });
        }

        let calculatedTotalPrice = 0;
        const productsForOrderSchema = [];

         for (const item of updatedOrderItems) { // Iterate over the filtered list
            const dbProduct = productsFromDB.find(p => p._id.toString() === item.productId);
            // This check is now less likely to fail due to the check above, but keep for safety
            if (!dbProduct) { throw new Error(`Product not found during update mapping: ${item.productId}`); }

            // Validate selectedServingOption if provided (same logic as before)
            let validatedServingOption = null;
            if (item.selectedServingOption) {
                if (!dbProduct.servingOptions || dbProduct.servingOptions.length === 0) { /* ... error ... */ }
                if (!dbProduct.servingOptions.includes(item.selectedServingOption)) { /* ... error ... */ }
                validatedServingOption = item.selectedServingOption;
            } else if (dbProduct.servingOptions && dbProduct.servingOptions.length > 0) { /* ... optional enforcement ... */ }

            const itemPrice = dbProduct.pricePerUnit * item.quantity;
            calculatedTotalPrice += itemPrice;
            productsForOrderSchema.push({
                productId: dbProduct._id,
                name: dbProduct.name,
                quantity: item.quantity,
                priceAtOrder: dbProduct.pricePerUnit,
                selectedServingOption: validatedServingOption,
                manufacturer: dbProduct.manufacturer,
                 // Add packetCount if provided and valid, otherwise null
                 packetCount: item.packetCount && Number.isInteger(Number(item.packetCount)) && Number(item.packetCount) >= 1
                    ? Number(item.packetCount)
                    : null
            });
        }


        // --- Update Order Fields ---
        order.products = productsForOrderSchema; // Assign the updated (and potentially smaller) array
        order.totalPrice = calculatedTotalPrice;
        if (deliveryAddress && deliveryAddress.trim() !== '') {
            order.deliveryAddress = deliveryAddress.trim();
        }
        order.note = (note !== undefined && note !== null) ? note.trim() : null;
        // modificationDate is set by pre-save hook

        await order.validate();
        const updatedOrder = await order.save();

        res.json(updatedOrder);

    } catch (error) {
        console.error(`Error updating order ${orderId}:`, error);
         if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        res.status(500).json({ message: 'שגיאה בעדכון ההזמנה' });
    }
});


module.exports = router;
