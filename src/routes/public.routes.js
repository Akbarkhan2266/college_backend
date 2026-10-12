import { Router } from 'express';
import {
  submitAdmissionForm,
  submitAdmissionSchema,
} from '../controller/admission/admission.controller.js';
import { Course, Notice } from '../models.js';
import { validate } from '../middleware/validate.js';
import { admissionFormLimiter } from '../middleware/rateLimit.js';

const router = Router();

/**
 * POST /api/public/admissions
 * Public admission form submission with rate limiting and honeypot check
 */
router.post(
  '/admissions',
  admissionFormLimiter,
  validate(submitAdmissionSchema),
  submitAdmissionForm
);

/**
 * GET /api/public/courses
 * Lists active courses for public view
 */
router.get('/courses', async (req, res) => {
  try {
    const courses = await Course.find({ isActive: true })
      .sort({ isPinned: -1, createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: courses,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve courses',
    });
  }
});

/**
 * GET /api/public/courses/:slug
 * Gets single course details by unique slug
 */
router.get('/courses/:slug', async (req, res) => {
  try {
    const course = await Course.findOne({
      slug: req.params.slug.toLowerCase().trim(),
      isActive: true,
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: course,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve course details',
    });
  }
});

/**
 * GET /api/public/notices
 * Lists active published notices and news ticker items
 */
router.get('/notices', async (req, res) => {
  try {
    const { tickerOnly, category } = req.query;
    const filter = { isActive: true };

    if (tickerOnly === 'true') {
      filter.showOnTicker = true;
    }
    if (category) {
      filter.category = category;
    }

    const notices = await Notice.find(filter)
      .sort({ publishedAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: notices,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve notices',
    });
  }
});

export default router;
