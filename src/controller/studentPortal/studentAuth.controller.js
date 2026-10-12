import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { User } from '../../models.js';
import { normalizeStudentId } from '../../utils/generateStudentId.js';

export const studentLoginSchema = z.object({
  studentId: z.string().trim().min(1, 'Student ID is required'),
  password: z.string().min(1, 'Password is required'),
});

export const updatePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long'),
});

/**
 * POST /api/student/login
 * Public route with rate limiting
 */
export const login = async (req, res) => {
  try {
    const { studentId, password } = req.body || {};

    if (!studentId || !password) {
      return res.status(400).json({
        success: false,
        message: 'Student ID and password are required',
      });
    }

    // Normalize student ID (pad to 3 digits if numeric, uppercase)
    const normalizedId = normalizeStudentId(studentId);

    // Find student with password field included
    const user = await User.findOne({
      loginId: normalizedId,
      role: 'student',
    }).select('+password');

    // Generic error message for both non-existent user and incorrect password
    const INVALID_CREDENTIALS_MSG = 'Invalid student ID or password';

    if (!user) {
      return res.status(400).json({
        success: false,
        message: INVALID_CREDENTIALS_MSG,
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact the administrator.',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: INVALID_CREDENTIALS_MSG,
      });
    }

    // Sign JWT
    const secret = process.env.JWT_SECRET || 'supersecretjwtkey_change_in_production';
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
    const token = jwt.sign({ id: user._id, role: user.role }, secret, { expiresIn });

    // Set httpOnly cookie
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.status(200).json({
      success: true,
      data: {
        name: user.name,
        mustChangePassword: user.mustChangePassword,
        token,
      },
    });
  } catch (error) {
    console.error('[Student Login Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during login',
    });
  }
};

/**
 * POST /api/student/logout
 * Requires auth('student')
 */
export const logout = async (req, res) => {
  try {
    res.clearCookie('token', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('[Student Logout Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during logout',
    });
  }
};

/**
 * PATCH /api/student/password
 * Requires auth('student') - allowed even while mustChangePassword is true
 */
export const updatePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body || {};

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required',
      });
    }

    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long',
      });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Student account not found',
      });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.mustChangePassword = false;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    console.error('[Student Update Password Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error updating password',
    });
  }
};

/**
 * GET /api/student/me
 * Requires auth('student') - allowed even while mustChangePassword is true
 */
export const getMe = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Student session not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        name: user.name,
        loginId: user.loginId,
        mustChangePassword: user.mustChangePassword,
      },
    });
  } catch (error) {
    console.error('[Student getMe Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error retrieving session',
    });
  }
};
