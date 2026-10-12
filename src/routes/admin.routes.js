import { Router } from 'express';
import {
  login,
  logout,
  updatePassword,
  updateAdminInfo,
  getMe,
  adminLoginSchema,
  updatePasswordSchema,
  updateAdminInfoSchema,
} from '../controller/admin/admin.controller.js';
import { auth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { loginLimiter } from '../middleware/rateLimit.js';

const router = Router();

// Public login route
router.post('/login', loginLimiter, validate(adminLoginSchema), login);

// Protected routes (Admin only)
router.use(auth('admin'));

router.post('/logout', logout);
router.patch('/password', validate(updatePasswordSchema), updatePassword);
router.patch('/profile', validate(updateAdminInfoSchema), updateAdminInfo);
router.get('/me', getMe);

export default router;
