/**
 * Middleware that blocks student panel routes if the user must change their password.
 * Returns 403 Forbidden while mustChangePassword is true.
 */
export const requirePasswordChange = (req, res, next) => {
  if (req.user?.mustChangePassword) {
    return res.status(403).json({
      success: false,
      message: 'Password change is required before accessing the student panel. Please update your password.',
    });
  }
  next();
};

export default requirePasswordChange;
