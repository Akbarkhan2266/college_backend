import { Router } from 'express';
import {
  getBatches,
  getBatchById,
  createBatch,
  updateBatch,
  deleteBatch,
  createBatchSchema,
  updateBatchSchema,
} from '../controller/batch/batch.controller.js';
import { auth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

// Admin only for all batch management routes
router.use(auth('admin'));

router.get('/', getBatches);
router.get('/:id', getBatchById);
router.post('/', validate(createBatchSchema), createBatch);
router.patch('/:id', validate(updateBatchSchema), updateBatch);
router.delete('/:id', deleteBatch);

export default router;
