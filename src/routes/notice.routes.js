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
import { uploadNoticePdf, uploadNoticePdfMiddleware } from '../middleware/upload.js';

const router = Router();

// Admin only for all notice management routes
router.use(auth('admin'));

router.get('/', getNotices);
router.get('/:id', getNoticeById);
router.post(
  '/',
  uploadNoticePdfMiddleware,
  validate(noticeSchema),
  createNotice
);
router.patch(
  '/:id',
  uploadNoticePdfMiddleware,
  validate(updateNoticeSchema),
  updateNotice
);
router.delete('/:id', deleteNotice);

export default router;
