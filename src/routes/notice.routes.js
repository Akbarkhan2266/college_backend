import { Router } from 'express';
import {
  getNotices,
  getNoticeById,
  createNotice,
  updateNotice,
  deleteNotice,
  noticeSchema,
  updateNoticeSchema,
} from '../controller/notice/notice.controller.js';
import { auth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { uploadNoticePdf } from '../middleware/upload.js';

const router = Router();

// Admin only for all notice management routes
router.use(auth('admin'));

router.get('/', getNotices);
router.get('/:id', getNoticeById);
router.post(
  '/',
  uploadNoticePdf.single('pdf'),
  validate(noticeSchema),
  createNotice
);
router.patch(
  '/:id',
  uploadNoticePdf.single('pdf'),
  validate(updateNoticeSchema),
  updateNotice
);
router.delete('/:id', deleteNotice);

export default router;
