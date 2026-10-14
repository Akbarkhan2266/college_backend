import { Router } from 'express';
import {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  createCourseSchema,
  updateCourseSchema,
} from '../controller/course/course.controller.js';
import { auth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { uploadCourseImage, uploadCourseImageMiddleware } from '../middleware/upload.js';

const router = Router();

// Admin only for all course management routes
router.use(auth('admin'));

router.get('/', getCourses);
router.get('/:id', getCourseById);
router.post(
  '/',
  uploadCourseImageMiddleware,
  validate(createCourseSchema),
  createCourse
);
router.patch(
  '/:id',
  uploadCourseImageMiddleware,
  validate(updateCourseSchema),
  updateCourse
);
router.delete('/:id', deleteCourse);

export default router;
