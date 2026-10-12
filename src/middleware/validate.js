import { z } from 'zod';

/**
 * Zod request validation middleware
 * Validates req.body (or optionally params / query if wrapped) against a Zod schema.
 * @param {z.ZodSchema} schema
 */
export const validate = (schema) => {
  return async (req, res, next) => {
    try {
      const parsed = await schema.parseAsync(req.body);
      req.body = parsed;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        return res.status(400).json({
          success: false,
          message: errorMessages[0]?.message || 'Validation failed',
          errors: errorMessages,
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
      });
    }
  };
};
