import { Counter } from '../models.js';

/**
 * Generates the next sequential 3-digit student ID (e.g., "001", "002").
 * Atomic increment on Counter collection with _id: 'student'.
 * Throws if sequence exceeds 999.
 */
export async function generateStudentId() {
  const getNextSeq = async () => {
    return Counter.findOneAndUpdate(
      { _id: 'student' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
  };

  let counterDoc;
  try {
    counterDoc = await getNextSeq();
  } catch (err) {
    // Retry once in case of duplicate key error (E11000) during initial upsert race
    if (err.code === 11000) {
      counterDoc = await getNextSeq();
    } else {
      throw err;
    }
  }

  const { seq } = counterDoc;

  if (seq > 999) {
    throw new Error('Student ID limit reached: Cannot generate 3-digit student ID beyond 999');
  }

  return String(seq).padStart(3, '0');
}

/**
 * Normalizes user-typed student ID.
 * e.g., "1" -> "001", "42" -> "042", "005" -> "005"
 */
export function normalizeStudentId(input) {
  if (!input) return input;
  const trimmed = String(input).trim();
  // If input is numeric and <= 3 digits
  if (/^\d{1,3}$/.test(trimmed)) {
    return trimmed.padStart(3, '0');
  }
  return trimmed.toUpperCase();
}
