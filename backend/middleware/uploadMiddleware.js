// middleware/uploadMiddleware.js
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const path = require('path');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Multer storage using Cloudinary
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'grocery-app-products', // Optional: specify a folder in Cloudinary
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'], // Specify allowed formats
        // Optional: transformation to apply on upload
        // transformation: [{ width: 500, height: 500, crop: 'limit' }]
        public_id: (req, file) => {
            // Optional: customize the public ID (filename in Cloudinary)
            // Avoid spaces and special characters in filenames
            const filename = path.parse(file.originalname).name.replace(/\s+/g, '_');
            return `product_${filename}_${Date.now()}`;
        },
    },
});

// Configure Multer upload middleware
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size (e.g., 5MB)
    fileFilter: (req, file, cb) => {
        // Validate file type
        const filetypes = /jpeg|jpg|png|webp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('ניתן להעלות קבצי תמונה בלבד (jpg, jpeg, png, webp)'), false);
        }
    },
});

module.exports = { upload, cloudinary }; // Export cloudinary instance too for potential direct use (e.g., deleting images)