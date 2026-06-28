const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');
require('dotenv').config();

cloudinary.config({
  cloud_name:  process.env.CLOUDINARY_CLOUD_NAME,
  api_key:     process.env.CLOUDINARY_API_KEY,
  api_secret:  process.env.CLOUDINARY_API_SECRET,
  secure:      true
});

// Upload buffer to Cloudinary
async function uploadToCloudinary(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder:         options.folder       || 'device-returns/damage',
        transformation: options.transformation || [
          { width: 1200, height: 900, crop: 'limit', quality: 'auto', fetch_format: 'auto' }
        ],
        ...options
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    const stream = Readable.from(buffer);
    stream.pipe(uploadStream);
  });
}

// Generate thumbnail URL from Cloudinary public_id
function getThumbnailUrl(publicId) {
  return cloudinary.url(publicId, {
    width:       300,
    height:      300,
    crop:        'fill',
    quality:     'auto',
    fetch_format:'auto'
  });
}

// Delete from Cloudinary
async function deleteFromCloudinary(publicId) {
  return cloudinary.uploader.destroy(publicId);
}

module.exports = { cloudinary, uploadToCloudinary, getThumbnailUrl, deleteFromCloudinary };