import { Router } from 'express';
import {
  getAdmissions,
  getAdmissionById,
  approveAdmission,
  rejectAdmission,
  approveAdmissionSchema,
  rejectAdmissionSchema,
} from '../controller/admission/admission.controller.js';
import { auth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

// Admin only for reviewing admissions
router.use(auth('admin'));

router.get('/', getAdmissions);
router.get('/:id', getAdmissionById);
router.post('/:id/approve', validate(approveAdmissionSchema), approveAdmission);
router.post('/:id/reject', validate(rejectAdmissionSchema), rejectAdmission);

export default router;
