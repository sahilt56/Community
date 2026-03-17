const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const multerCloudinary = require('multer-storage-cloudinary');
const dotenv = require('dotenv');

dotenv.config();

let storage;

if (process.env.STORAGE_TYPE === 'cloudinary') {
  // Cloudinary configuration
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });

  // 🧠 Smart Fallback: Check if we are using v4 or older version of the package
  if (multerCloudinary.CloudinaryStorage) {
    // Version 4.x Syntax
    storage = new multerCloudinary.CloudinaryStorage({
      cloudinary: cloudinary,
      params: {
        folder: 'vartalap',
        allowed_formats: ['jpg', 'png', 'jpeg', 'gif', 'mp4', 'mov', 'avi','webp'],
        resource_type: "auto",
        public_id: (req, file) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          return uniqueSuffix + '-' + file.originalname.split('.')[0];
        }
      }
    });
  } else {
    // Version 2.x / 3.x Syntax (Fallback)
    storage = multerCloudinary({
      cloudinary: require('cloudinary'), // pass the root module, since v2 is accessed inside
      folder: 'vartalap',
      allowedFormats: ['jpg', 'png', 'jpeg', 'gif', 'mp4', 'mov', 'avi', 'webp'],
      params: {
        resource_type: 'auto'
      },
      filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname.split('.')[0]);
      }
    });
  }
  console.log("Using Cloudinary Storage ☁️");
} else {
  // Ensure the 'uploads' directory exists
  const uploadDir = path.join(__dirname, '../uploads');
  if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Local Disk Storage setup
  storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads/'); 
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
      cb(null, uniqueSuffix + path.extname(file.originalname)); // Use only the extension from originalname
    }
  });
  console.log("Using Local Disk Storage 💻");
}

// File filter taaki images aur videos dono allow hon
const fileFilter = (req, file, cb) => {
  // 🛡️ Security: Sirf Mimetype nahi, Extension bhi verify karein (Prevent MIME Spoofing)
  const allowedExts = /jpeg|jpg|png|gif|webp|mp4|mov|avi/i;
  const isExtValid = allowedExts.test(path.extname(file.originalname).toLowerCase());
  const isMimeValid = file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/');

  if (isExtValid && isMimeValid) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type! Only valid images and videos are allowed.', false));
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 10 // 10MB limit
  }
});

module.exports = upload;
