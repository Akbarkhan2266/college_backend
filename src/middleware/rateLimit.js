import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for Admin and user login routes
 * 10 attempts per 15 minutes window
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts from this IP. Please try again after 15 minutes.',
  },
});

/**
 * Rate limiter for Public Admission Form submission
 * 5 attempts per 15 minutes window
 */
export const admissionFormLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many admission submissions from this IP. Please try again later.',
  },
});
