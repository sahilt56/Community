const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');

dotenv.config();

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Extracts public_id from a Cloudinary URL and deletes the image.
 * URL format: https://res.cloudinary.com/cloud_name/image/upload/v1234567/folder/public_id.jpg
 * @param {string} url - The full Cloudinary URL
 * @returns {Promise} - Cloudinary deletion response
 */
const deleteFromCloudinary = async (url) => {
  try {
    if (!url || !url.includes('cloudinary.com')) {
      console.log('Skipping deletion: Not a Cloudinary URL or empty.');
      return null;
    }

    // Extracting public_id
    // regex explains: 
    // /upload\/(?:v\d+\/)?(.+)\.[a-z]+$/ 
    // capture everything after /upload/ (skipping optional version v123/) until the file extension
    const regex = /\/upload\/(?:v\d+\/)?(.+)\.[a-z]+$/;
    const match = url.match(regex);

    if (match && match[1]) {
      const publicId = match[1];
      console.log(`🗑️ Deleting from Cloudinary: ${publicId}`);
      const result = await cloudinary.uploader.destroy(publicId);
      return result;
    } else {
      console.error('Could not extract public_id from Cloudinary URL');
      return null;
    }
  } catch (error) {
    console.error('Cloudinary deletion error:', error);
    throw error;
  }
};

module.exports = { deleteFromCloudinary };
