import { Router } from 'express';
import {
  getStudents,
  getStudentById,
  updateStudentInfo,
  changeStudentBatch,
  setStudentStatus,
  resetStudentPassword,
  updateStudentInfoSchema,
  changeStudentBatchSchema,
  setStudentStatusSchema,
} from '../controller/student/student.controller.js';
import { auth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

// Admin only for student management
router.use(auth('admin'));

router.get('/', getStudents);
router.get('/:id', getStudentById);
router.patch('/:id', validate(updateStudentInfoSchema), updateStudentInfo);
router.patch('/:id/batch', validate(changeStudentBatchSchema), changeStudentBatch);
router.patch('/:id/status', validate(setStudentStatusSchema), setStudentStatus);
router.post('/:id/reset-password', resetStudentPassword);

export default router;
