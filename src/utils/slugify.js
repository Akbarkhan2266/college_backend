import { Course } from '../models.js';

/**
 * Converts a text string into a URL-friendly slug.
 */
export function toSlug(text) {
  return String(text)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Generates a unique course slug from a given course name.
 * If slug exists, appends -2, -3, etc.
 * @param {string} name - Course name
 * @param {string|null} excludeId - Course ID to exclude (when updating existing course)
 */
export async function generateUniqueCourseSlug(name, excludeId = null) {
  const baseSlug = toSlug(name) || 'course';
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const query = { slug };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    const existing = await Course.findOne(query).select('_id').lean();
    if (!existing) {
      return slug;
    }
    counter += 1;
    slug = `${baseSlug}-${counter}`;
  }
}
