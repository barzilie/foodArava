// routes/productRoutes.js
const express = require('express');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const { protect, admin } = require('../middleware/authMiddleware');
const { upload, cloudinary } = require('../middleware/uploadMiddleware'); // require cloudinary instance too

const router = express.Router();

// --- Helper function to extract Cloudinary public_id from URL ---
const getPublicIdFromUrl = (url) => {
    if (!url) return null;
    try {
        // Example URL: http://res.cloudinary.com/cloud_name/image/upload/v1234567890/folder/public_id.jpg
        // Split by '/' and get the part before the file extension.
        const parts = url.split('/');
        const filenameWithExtension = parts[parts.length - 1];
        const publicIdWithFolder = parts.slice(parts.indexOf('upload') + 2).join('/').replace(/\.\w+$/, ''); // Remove extension
        return publicIdWithFolder;
    } catch (e) {
        console.error("Error extracting public_id from URL:", url, e);
        return null;
    }
};

// Helper function to parse serving options string (e.g., comma-separated) into an array
const parseServingOptions = (optionsString) => {
    if (!optionsString || typeof optionsString !== 'string') {
        return [];
    }
    return optionsString.split(',') // Split by comma
                      .map(option => option.trim()) // Trim whitespace
                      .filter(option => option.length > 0); // Remove empty options
};


// --- Public Routes ---

// GET /api/products - Fetch all products (Public)
router.get('/', async (req, res) => {
    try {
        const products = await Product.find({}).sort({ name: 1 }); // Sort alphabetically by name
        res.json(products);
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).json({ message: "שגיאה בקבלת רשימת המוצרים" });
    }
});

// GET /api/products/specials - Fetch special offer products (Public)
router.get('/specials', async (req, res) => {
    try {
        const specialProducts = await Product.find({ isSpecialOffer: true }).sort({ name: 1 });
        res.json(specialProducts);
    } catch (error) {
        console.error("Error fetching special products:", error);
        res.status(500).json({ message: "שגיאה בקבלת רשימת המבצעים" });
    }
});

    // --- NEW Route: GET /api/products/manufacturers ---
    // Fetches distinct manufacturer names (Public or Admin? Let's make it Admin for now)
// GET /api/products/manufacturers - Fetches distinct manufacturer names (Admin Only)
router.get('/manufacturers', protect, admin, async (req, res) => {
    try {
        // Log user making the request (optional, for debugging permissions)
        // console.log(`Admin User ID: ${req.user?._id}, Name: ${req.user?.name}`);

        // Find distinct non-null/non-empty manufacturer values
        const manufacturers = await Product.distinct('manufacturer', {
             // Ensure filter is correct: find where manufacturer is not null AND not empty string
             manufacturer: { $ne: null, $nin: ['', null] }
        });

        // Sort case-insensitively in JavaScript before sending
        const sortedManufacturers = manufacturers.sort((a, b) =>
            a.localeCompare(b, 'he', { sensitivity: 'base' }) // Hebrew locale-sensitive sort
        );

        res.json(sortedManufacturers);

    } catch (error) {
        // Log the detailed error on the server
        console.error(`[${new Date().toISOString()}] Error fetching distinct manufacturers:`, error);
        // Send a generic error to the client
        res.status(500).json({ message: "שגיאה בקבלת רשימת היצרנים" });
    }
});

// GET /api/products/:id - Fetch single product details (Public)
router.get('/:id', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'מזהה מוצר לא תקין' });
        }
        const product = await Product.findById(req.params.id);
        if (product) {
            res.json(product);
        } else {
            res.status(404).json({ message: 'מוצר לא נמצא' });
        }
    } catch (error) {
        console.error(`Error fetching product ${req.params.id}:`, error);
        res.status(500).json({ message: 'שגיאה בקבלת פרטי המוצר' });
    }
});


// --- Admin Only Routes ---

// POST /api/products - Add a new product (Admin Only) - Modified
router.post('/', protect, admin, upload.single('productImage'), async (req, res) => {
    // Added manufacturer and servingOptions
    const { name, pricePerUnit, description, isSpecialOffer, manufacturer, servingOptions, defaultPacketCount } = req.body;

    if (!name || !pricePerUnit) {
        return res.status(400).json({ message: 'שם מוצר ומחיר הם שדות חובה' });
    }

    try {
        let photoUrl = null;
        if (req.file) {
            photoUrl = req.file.path;
        }

        const newProduct = new Product({
            name,
            pricePerUnit: Number(pricePerUnit),
            description,
            isSpecialOffer: isSpecialOffer === 'true' || isSpecialOffer === true,
            photo: photoUrl,
            manufacturer: manufacturer ? manufacturer.trim() : null,
            servingOptions: parseServingOptions(servingOptions),
            // Add defaultPacketCount, ensuring it's a number
            defaultPacketCount: defaultPacketCount !== undefined ? Number(defaultPacketCount) : 0
        });

        await newProduct.validate();
        const savedProduct = await newProduct.save();
        res.status(201).json(savedProduct);

    } catch (error) {
        // ... (error handling including Cloudinary cleanup remains the same) ...
        console.error('Error creating product:', error);
        if (req.file && req.file.filename) { /* ... Cloudinary cleanup ... */ }
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        res.status(500).json({ message: 'שגיאה ביצירת המוצר' });
    }
});

// PUT /api/products/:id - Update a product (Admin Only) - Modified
router.put('/:id', protect, admin, upload.single('productImage'), async (req, res) => {
    // Added manufacturer and servingOptions
    const { name, pricePerUnit, description, isSpecialOffer, manufacturer, servingOptions, defaultPacketCount } = req.body;
    const productId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({ message: 'מזהה מוצר לא תקין' });
    }

    try {
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'מוצר לא נמצא' });
        }

        const oldPhotoUrl = product.photo;
        const oldPublicId = getPublicIdFromUrl(oldPhotoUrl);

        // Update fields - check if they exist in the request body
        product.name = name !== undefined ? name : product.name;
        product.pricePerUnit = pricePerUnit !== undefined ? Number(pricePerUnit) : product.pricePerUnit;
        product.description = description !== undefined ? description : product.description;
        product.isSpecialOffer = isSpecialOffer !== undefined ? (isSpecialOffer === 'true' || isSpecialOffer === true) : product.isSpecialOffer;
        product.manufacturer = manufacturer !== undefined ? (manufacturer ? manufacturer.trim() : null) : product.manufacturer; // Allow setting back to null

        // Update serving options - parse if needed
        if (servingOptions !== undefined) {
            product.servingOptions = parseServingOptions(servingOptions);
        }
        if (defaultPacketCount !== undefined) {
            product.defaultPacketCount = Number(defaultPacketCount);
        }


        // Handle image update (same as before)
        if (req.file) {
            if (oldPublicId) {
                try { await cloudinary.uploader.destroy(oldPublicId); } catch (e) { console.error('Error deleting old Cloudinary image:', e); }
            }
            product.photo = req.file.path;
        }

        await product.validate();
        const updatedProduct = await product.save();
        res.json(updatedProduct);

    } catch (error) {
         // ... (error handling including Cloudinary cleanup remains the same) ...
        console.error(`Error updating product ${productId}:`, error);
        if (req.file && req.file.filename) { /* ... Cloudinary cleanup ... */ }
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        res.status(500).json({ message: 'שגיאה בעדכון המוצר' });
    }
});

// DELETE /api/products/:id - Delete a product (Admin Only)
router.delete('/:id', protect, admin, async (req, res) => {
    const productId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({ message: 'מזהה מוצר לא תקין' });
    }

    try {
        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({ message: 'מוצר לא נמצא' });
        }

        const photoUrl = product.photo;
        const publicId = getPublicIdFromUrl(photoUrl);

        // Delete product from MongoDB
        await Product.deleteOne({ _id: productId }); // Use deleteOne for consistency

        // Delete image from Cloudinary if it exists
        if (publicId) {
            try {
                await cloudinary.uploader.destroy(publicId);
                console.log('Deleted Cloudinary image:', publicId);
            } catch (cloudinaryError) {
                console.error('Error deleting Cloudinary image during product delete:', cloudinaryError);
                // Log the error but proceed with successful product deletion response
            }
        }

        res.json({ message: 'המוצר נמחק בהצלחה' });

    } catch (error) {
        console.error(`Error deleting product ${productId}:`, error);
        res.status(500).json({ message: 'שגיאה במחיקת המוצר' });
    }
});


module.exports = router;
