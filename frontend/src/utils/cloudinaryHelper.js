/**
 * Central utility to optimize Cloudinary URLs using on-the-fly transformations.
 * Reduces file size, optimizes format (WebP/AVIF), and resizes images.
 */
export const getOptimizedUrl = (url, { width, height, quality = 'auto', format = 'auto', crop = 'limit' } = {}) => {
  if (!url) return '';
  
  // Only apply transformations to Cloudinary URLs
  if (!url.includes('cloudinary.com')) return url;

  const parts = url.split('/upload/');
  if (parts.length !== 2) return url;

  // Build transformation string
  // q_auto: Optimal compression
  // f_auto: Best format for browser (WebP/AVIF)
  const transformations = [];
  
  if (quality) transformations.push(`q_${quality}`);
  if (format) transformations.push(`f_${format}`);
  if (width) transformations.push(`w_${width}`);
  if (height) transformations.push(`h_${height}`);
  if (crop) transformations.push(`c_${crop}`);

  const transformStr = transformations.join(',');

  return `${parts[0]}/upload/${transformStr}/${parts[1]}`;
};

/**
 * Common presets for the app
 */
export const IMAGE_PRESETS = {
  AVATAR: { width: 100, height: 100, crop: 'fill' }, // Rounded avatars
  POST: { width: 800, crop: 'limit' },             // Main feed posts
  BANNER: { width: 1200, crop: 'limit' },           // Community/Profile banners
  THUMBNAIL: { width: 400, crop: 'limit' }         // Search results/Small grids
};
