import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { requirePasswordChange } from '../middleware/requirePasswordChange.js';
import { loginLimiter } from '../middleware/rateLimit.js';

import {
  login,
  logout,
  updatePassword,
  getMe,
} from '../controller/studentPortal/studentAuth.controller.js';

import {
  getDashboard,
  getMyCourses,
  getMyBatches,
  getNotices,
  getNoticeById,
  getProfile,
} from '../controller/studentPortal/studentPanel.controller.js';

const router = Router();

/* ---------------- Auth Routes ---------------- */
router.post('/login', loginLimiter, login);
router.post('/logout', auth('student'), logout);
router.patch('/password', auth('student'), updatePassword);
router.get('/me', auth('student'), getMe);

/* ---------------- Panel Routes ---------------- */
// Protected by auth('student') and requirePasswordChange
const panelAuth = [auth('student'), requirePasswordChange];

router.get('/dashboard', panelAuth, getDashboard);
router.get('/courses', panelAuth, getMyCourses);
router.get('/batches', panelAuth, getMyBatches);
router.get('/notices', panelAuth, getNotices);
router.get('/notices/:id', panelAuth, getNoticeById);
router.get('/profile', panelAuth, getProfile);

export default router;
