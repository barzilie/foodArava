// routes/adminRoutes.js
const express = require('express');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product'); // Need Product model for manufacturer filter
const AdminSetting = require('../models/AdminSetting');
const { protect, admin } = require('../middleware/authMiddleware'); // Protect all admin routes
const { Parser } = require('json2csv'); // exprt csv

const router = express.Router();

// --- Order Management ---

// GET /api/admin/orders - Get all orders with filtering and sorting (Admin Only) - Modified
router.get('/orders', protect, admin, async (req, res) => {
    const {
        status,
        orderDateStart, orderDateEnd,
        completionDateStart, completionDateEnd,
        manufacturer,
        // New filters for user address
        userArea,
        userSettlement,
        sortBy = 'orderDate',
        sortOrder = 'desc',
        page = 1,
        limit = 15 // Changed default limit
    } = req.query;

    const filter = {};
    // Build filter object
    if (status) filter.status = status;

    // Date filtering
    if (orderDateStart || orderDateEnd) {
        filter.orderDate = {};
        if (orderDateStart) filter.orderDate.$gte = new Date(orderDateStart);
        if (orderDateEnd) filter.orderDate.$lte = new Date(orderDateEnd);
    }
    if (completionDateStart || completionDateEnd) {
        filter.completionDate = {};
        if (completionDateStart) filter.completionDate.$gte = new Date(completionDateStart);
        if (completionDateEnd) filter.completionDate.$lte = new Date(completionDateEnd);
    }

    // --- Manufacturer Filter Logic ---
    let productIdsFromManufacturer = null;
    if (manufacturer) {
        try {
            // Find products matching the manufacturer (case-insensitive search)
            const products = await Product.find({ manufacturer: { $regex: manufacturer, $options: 'i' } }).select('_id');
            productIdsFromManufacturer = products.map(p => p._id);

            // If no products found for the manufacturer, no orders can match
            if (productIdsFromManufacturer.length === 0) {
                 return res.json({ orders: [], currentPage: 1, totalPages: 0, totalOrders: 0 });
            }
            // Add condition to filter orders containing ANY of these product IDs
            filter['products.productId'] = { $in: productIdsFromManufacturer };
            // Note: If manufacturer was denormalized onto orderItemSchema, you could filter directly:
            // filter['products.manufacturer'] = { $regex: manufacturer, $options: 'i' };
            // But you'd need an $elemMatch if you want orders where *at least one* product matches.
            // Using $in on productId is generally efficient if indexed.

        } catch(error) {
            console.error("Error fetching products for manufacturer filter:", error);
            return res.status(500).json({ message: "שגיאה בסינון לפי יצרן" });
        }
    }
    // --- End Manufacturer Filter ---

        // --- Area/Settlement Filter Logic ---
        let userIdsToFilter = null; // Store user IDs matching area/settlement
        if (userArea || userSettlement) {
            const userFilter = {};
            if (userArea) userFilter['address.area'] = userArea;
            if (userSettlement) userFilter['address.settlement'] = { $regex: userSettlement, $options: 'i' }; // Case-insensitive settlement search
    
            try {
                const users = await User.find(userFilter).select('_id');
                userIdsToFilter = users.map(u => u._id);
                // If no users match the area/settlement, no orders can match
                if (userIdsToFilter.length === 0) {
                     return res.json({ orders: [], currentPage: 1, totalPages: 0, totalOrders: 0 });
                }
                // Add condition to filter orders by these user IDs
                filter.userId = { $in: userIdsToFilter };
            } catch (error) {
                console.error("Error fetching users for area/settlement filter:", error);
                return res.status(500).json({ message: "שגיאה בסינון לפי אזור/יישוב" });
            }
        }
        // --- End Area/Settlement Filter ---


    // Build sort object (same as before)
    const sortOptions = {};
    const validSortFields = ['orderDate', 'completionDate', 'userName', 'totalPrice', 'status'];
    if (validSortFields.includes(sortBy)) { sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1; }
    else { sortOptions['orderDate'] = -1; }


    // Pagination (same as before)
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    try {
        // Find orders matching the combined filter
        const ordersQuery = Order.find(filter)
            .sort(sortOptions)
            .skip(skip)
            .limit(limitNum);
            // Optionally populate user details if needed elsewhere, but filtering is done
            // .populate('userId', 'name phone address');
            
        const [orders, totalOrders] = await Promise.all([
            ordersQuery.exec(),
            Order.countDocuments(filter) // Count only matching orders
        ]);


        res.json({
            orders,
            currentPage: pageNum,
            totalPages: Math.ceil(totalOrders / limitNum),
            totalOrders,
        });

    } catch (error) {
        console.error("Error fetching all orders (admin):", error);
        res.status(500).json({ message: "שגיאה בקבלת רשימת ההזמנות" });
    }
});
// GET /api/admin/orders/summary-by-product - Modified for Manufacturer filter
router.get('/orders/summary-by-product', protect, admin, async (req, res) => {
    const {
        completionDateStart,
        completionDateEnd,
        status = 'Confirmed',
        manufacturer // Added manufacturer filter
    } = req.query;

    try {
        const pipeline = [];

        // --- Stage 1: Match Orders based on initial criteria (date, status) ---
        const initialMatchStage = { $match: {} };
        if (status) initialMatchStage.$match.status = status;
        if (completionDateStart || completionDateEnd) {
            initialMatchStage.$match.completionDate = {};
            if (completionDateStart) initialMatchStage.$match.completionDate.$gte = new Date(completionDateStart);
            if (completionDateEnd) initialMatchStage.$match.completionDate.$lte = new Date(completionDateEnd);
        }
        if (Object.keys(initialMatchStage.$match).length > 0) {
            pipeline.push(initialMatchStage);
        }

        // --- Stage 2: Unwind the products array ---
        pipeline.push({ $unwind: '$products' });

        // --- Stage 3: Add Manufacturer Filter (if provided) ---
        // Filter the *unwound* documents based on the denormalized manufacturer field
        if (manufacturer) {
             pipeline.push({
                 $match: {
                     'products.manufacturer': { $regex: manufacturer, $options: 'i' }
                 }
             });
             // Alternative if manufacturer wasn't denormalized:
             // 1. $lookup products collection based on 'products.productId'
             // 2. $match based on the looked-up product's manufacturer field
             // This is generally less efficient than using a denormalized field.
        }


        // --- Stage 4: Group by Product ---
        pipeline.push({
            $group: {
                _id: '$products.productId',
                productName: { $first: '$products.name' },
                manufacturer: { $first: '$products.manufacturer' }, // Keep manufacturer info
                totalQuantity: { $sum: '$products.quantity' },
                users: {
                    $push: {
                        orderId: '$_id', // Include order ID for reference
                        userId: '$userId',
                        userName: '$userName',
                        userPhone: '$userPhone',
                        quantity: '$products.quantity',
                        orderDate: '$orderDate',
                        completionDate: '$completionDate'
                    }
                }
            }
        });

        // --- Stage 5: Project to format the output ---
        pipeline.push({
            $project: {
                _id: 0,
                productId: '$_id',
                productName: 1,
                manufacturer: 1, // Include manufacturer in output
                totalQuantity: 1,
                users: 1
            }
        });

        // --- Stage 6: Sort results (optional) ---
        pipeline.push({ $sort: { productName: 1 } });

        // --- Execute Aggregation ---
        const summary = await Order.aggregate(pipeline);
        res.json(summary);

    } catch (error) {
        console.error("Error generating product summary (admin):", error);
        res.status(500).json({ message: "שגיאה ביצירת סיכום המוצרים" });
    }
});

// GET /api/admin/orders/export - Export orders to CSV (Admin Only)
router.get('/orders/export', protect, admin, async (req, res) => {
    // 1. Reuse the filtering logic from GET /api/admin/orders
    //    Extract query params (status, dates, manufacturer, etc.)
    const { status, orderDateStart, /* ... other filters ... */ manufacturer } = req.query;
    const filter = {};
    //    ... build filter object exactly like in the main GET route ...
     if (status) filter.status = status;
     // ... date filters ...
     if (manufacturer) {
         try {
            const products = await Product.find({ manufacturer: { $regex: manufacturer, $options: 'i' } }).select('_id');
            const productIds = products.map(p => p._id);
            if (productIds.length === 0) return res.status(404).send('No orders found for this manufacturer.');
            filter['products.productId'] = { $in: productIds };
         } catch (e) { /* ... error handling ... */ }
     }


    try {
        // 2. Fetch ALL matching orders (no pagination needed for export)
        //    Consider adding a limit for safety in case of huge datasets, or stream results.
        const orders = await Order.find(filter).sort({ orderDate: -1 }).lean(); // .lean() for performance

        if (orders.length === 0) {
            return res.status(404).send('No orders found matching the criteria for export.');
        }

        // 3. Transform data for CSV (flatten nested product arrays)
        const flattenedData = orders.map(order => {
            // Create a base object with main order details
            const base = {
                orderId: order._id.toString(),
                orderDate: order.orderDate.toISOString().split('T')[0], // Format date YYYY-MM-DD
                completionDate: order.completionDate.toISOString().split('T')[0],
                userName: order.userName,
                userPhone: order.userPhone,
                deliveryAddress: order.deliveryAddress,
                totalPrice: order.totalPrice,
                status: order.status,
                note: order.note || '',
                // Flatten products into separate columns (or rows - choose structure)
                // Example: Join product names
                productsSummary: order.products.map(p => `${p.name} (x${p.quantity}) ${p.selectedServingOption ? '['+p.selectedServingOption+']' : ''}`).join('; '),
            };
            // Alternatively, create multiple rows per order, one for each product.
            // Or create dynamic columns like 'Product1_Name', 'Product1_Qty', etc. (more complex)
            return base;
        });


        // 4. Define CSV Fields/Headers
        const fields = [
            { label: 'מזהה הזמנה', value: 'orderId' },
            { label: 'תאריך הזמנה', value: 'orderDate' },
            { label: 'תאריך השלמה', value: 'completionDate' },
            { label: 'שם לקוח', value: 'userName' },
            { label: 'טלפון לקוח', value: 'userPhone' },
            { label: 'כתובת למשלוח', value: 'deliveryAddress' },
            { label: 'מחיר סה"כ', value: 'totalPrice' },
            { label: 'סטטוס', value: 'status' },
            { label: 'הערות', value: 'note' },
            { label: 'סיכום מוצרים', value: 'productsSummary' }, // Adjust based on chosen flattening method
        ];

        // 5. Use json2csv to parse data
        const json2csvParser = new Parser({ fields, header: true, excelStrings: true, withBOM: true }); // withBOM helps Excel with Hebrew
        const csv = json2csvParser.parse(flattenedData);

        // 6. Set Headers and Send CSV Response
        const fileName = `orders_export_${new Date().toISOString().split('T')[0]}.csv`;
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.status(200).send(csv);


    } catch (error) {
        console.error("Error exporting orders (admin):", error);
        res.status(500).json({ message: "שגיאה בייצוא רשימת ההזמנות" });
    }
});

// PUT /api/admin/orders/:id/status - Update order status (Admin Only)
router.put('/orders/:id/status', protect, admin, async (req, res) => {
    const orderId = req.params.id;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
        return res.status(400).json({ message: 'מזהה הזמנה לא תקין' });
    }

    // Validate the new status against the allowed enum values in the model
    const allowedStatuses = Order.schema.path('status').enumValues;
    if (!status || !allowedStatuses.includes(status)) {
        return res.status(400).json({ message: `סטטוס לא תקין. סטטוסים אפשריים: ${allowedStatuses.join(', ')}` });
    }

    try {
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ message: 'הזמנה לא נמצאה' });
        }

        order.status = status;
        // Optionally, update modificationDate when status changes? The pre-save hook handles general modifications.
        // order.modificationDate = new Date();

        const updatedOrder = await order.save();

        res.json(updatedOrder);

    } catch (error) {
        console.error(`Error updating status for order ${orderId}:`, error);
         if (error.name === 'ValidationError') { // Should not happen with enum check, but good practice
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        res.status(500).json({ message: 'שגיאה בעדכון סטטוס ההזמנה' });
    }
});


// --- Settings Management ---

// GET /api/admin/settings/completion-date - Get default completion date (Admin Only)
router.get('/settings/completion-date', protect, admin, async (req, res) => {
    try {
        const settings = await AdminSetting.findOne({ settingKey: 'globalSettings' });
        // Provide a calculated default if not set in DB, matching the schema default logic
        const defaultDate = settings ? settings.defaultCompletionDate : (() => {
             const date = new Date();
             date.setDate(date.getDate() + 3);
             date.setHours(17, 0, 0, 0);
             return date;
            })();
        res.json({ defaultCompletionDate: defaultDate });
    } catch (error) {
         console.error("Error fetching admin settings:", error);
        res.status(500).json({ message: "שגיאה בקבלת הגדרות ברירת מחדל" });
    }
});

// PUT /api/admin/settings/completion-date - Set default completion date (Admin Only)
router.put('/settings/completion-date', protect, admin, async (req, res) => {
    const { defaultCompletionDate } = req.body;

    // Validate the incoming date string
    const newDate = new Date(defaultCompletionDate);
    if (isNaN(newDate.getTime())) { // Check if the date is valid
        return res.status(400).json({ message: 'פורמט תאריך לא תקין' });
    }
     // Optional: Check if the date is in the future
    if (newDate < new Date()) {
        return res.status(400).json({ message: 'תאריך ההשלמה חייב להיות בעתיד' });
    }


    try {
        const updatedSettings = await AdminSetting.findOneAndUpdate(
            { settingKey: 'globalSettings' }, // Find the single settings document
            { defaultCompletionDate: newDate }, // Update the value
            { new: true, upsert: true } // Return the updated doc, create if it doesn't exist
        );
        res.json({
            message: 'תאריך השלמת הזמנות דיפולטיבי עודכן',
            defaultCompletionDate: updatedSettings.defaultCompletionDate
        });
    } catch (error) {
        console.error("Error updating admin settings:", error);
        res.status(500).json({ message: "שגיאה בעדכון הגדרות ברירת מחדל" });
    }
});

module.exports = router;
