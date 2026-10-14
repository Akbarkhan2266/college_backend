import { v2 as cloudinary } from 'cloudinary';

// Resolve Cloudinary credentials from environment
let cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
let api_key = process.env.CLOUDINARY_API_KEY;
let api_secret = process.env.CLOUDINARY_API_SECRET;

if (process.env.CLOUDINARY_URL) {
  try {
    const parsed = new URL(process.env.CLOUDINARY_URL);
    cloud_name = cloud_name || parsed.hostname;
    api_key = api_key || parsed.username;
    api_secret = api_secret || parsed.password;
  } catch (err) {
    console.warn('[Cloudinary Config] Warning parsing CLOUDINARY_URL:', err.message);
  }
}

// Ensure correct defaults if env is missing
cloud_name = cloud_name || 'alrtljl6';
api_key = api_key || '982216238631513';
api_secret = api_secret || 'f0WbkT0kIjNtKQ-x4UChECyBE3o';

cloudinary.config({
  cloud_name,
  api_key,
  api_secret,
  secure: true,
});

/**
 * Uploads a file buffer (from multer memoryStorage) to Cloudinary via stream
 *
 * @param {Buffer} buffer - File buffer from multer
 * @param {Object} options - Cloudinary upload options (folder, resource_type, etc.)
 * @returns {Promise<Object>} Cloudinary upload result containing secure_url, public_id, etc.
 */
export const uploadBufferToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'college_portal',
        resource_type: 'auto',
        ...options,
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve(result);
      }
    );

    // Write buffer directly to stream without external packages
    uploadStream.end(buffer);
  });
};

/**
 * Uploads a base64 string or remote URL to Cloudinary
 *
 * @param {string} fileStr - Base64 data URI or remote URL
 * @param {Object} options - Cloudinary upload options
 * @returns {Promise<Object>}
 */
export const uploadToCloudinary = async (fileStr, options = {}) => {
  return cloudinary.uploader.upload(fileStr, {
    folder: 'college_portal',
    resource_type: 'auto',
    ...options,
  });
};

/**
 * Safely deletes a file from Cloudinary given its public_id or URL
 *
 * @param {string} fileUrlOrPublicId - Full Cloudinary URL or public_id
 * @param {Object} [options] - Options (e.g. { resource_type: 'raw' })
 */
export const deleteFromCloudinary = async (fileUrlOrPublicId, options = {}) => {
  if (!fileUrlOrPublicId) return;

  try {
    let publicId = fileUrlOrPublicId;

    // If a full Cloudinary URL is passed, extract public_id
    if (fileUrlOrPublicId.includes('res.cloudinary.com')) {
      const parts = fileUrlOrPublicId.split('/upload/');
      if (parts.length > 1) {
        // e.g. v1234567890/college_portal/notices/filename.pdf
        const pathAfterUpload = parts[1].replace(/^v\d+\//, '');
        // For raw files (like PDFs), the extension is part of the public_id
        // For images, Cloudinary strips the extension from public_id
        if (options.resource_type === 'raw' || fileUrlOrPublicId.includes('/raw/')) {
          publicId = pathAfterUpload;
          options.resource_type = 'raw';
        } else {
          // Remove extension for images
          publicId = pathAfterUpload.substring(0, pathAfterUpload.lastIndexOf('.')) || pathAfterUpload;
        }
      }
    }

    const result = await cloudinary.uploader.destroy(publicId, options);
    return result;
  } catch (error) {
    console.warn(`[Cloudinary Cleanup Warning] Failed to delete ${fileUrlOrPublicId}:`, error.message);
  }
};

export default cloudinary;
