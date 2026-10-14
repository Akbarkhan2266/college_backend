import app from '../src/app.js';
import { connectDB } from '../src/config/db.js';

/**
 * Vercel Serverless Function Entry Point
 * Ensures database connection is active (with connection pooling)
 * and passes the request to the Express application.
 */
export default async function handler(req, res) {
  try {
    await connectDB();
  } catch (error) {
    console.error('[Vercel Serverless DB Connection Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Database connection failed. Please ensure MONGODB_URI is set correctly in Vercel environment variables.',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message,
    });
  }

  return app(req, res);
}
