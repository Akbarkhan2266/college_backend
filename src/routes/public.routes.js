import { Router } from 'express';
import mongoose from 'mongoose';
import {
  submitAdmissionForm,
  submitAdmissionSchema,
} from '../controller/admission/admission.controller.js';
import { Course, Notice, Batch } from '../models.js';
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
 * Lists active courses for public website showcase
 * Supports optional query params: ?search=&ageGroup=&page=&limit=
 */
router.get('/courses', async (req, res) => {
  try {
    const { search, ageGroup, page, limit } = req.query;
    const filter = { isActive: true };

    if (search && search.trim()) {
      filter.name = { $regex: search.trim(), $options: 'i' };
    }

    if (ageGroup && ageGroup.trim()) {
      filter.ageGroup = ageGroup.trim();
    }

    const sortOrder = { isPinned: -1, createdAt: -1 };

    // If pagination requested
    if (page || limit) {
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.max(1, parseInt(limit, 10) || 20);
      const skip = (pageNum - 1) * limitNum;

      const [courses, total] = await Promise.all([
        Course.find(filter)
          .sort(sortOrder)
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Course.countDocuments(filter),
      ]);

      return res.status(200).json({
        success: true,
        data: {
          courses,
          pagination: {
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum) || 1,
          },
        },
      });
    }

    // Default: Return list directly for simple frontend rendering
    const courses = await Course.find(filter).sort(sortOrder).lean();

    return res.status(200).json({
      success: true,
      data: courses,
    });
  } catch (error) {
    console.error('[Public Get Courses Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve courses',
    });
  }
});

/**
 * GET /api/public/courses/:idOrSlug
 * Gets single course details by unique slug or MongoDB ObjectId.
 * Includes public batch timing details (excluding private meeting links).
 */
router.get('/courses/:idOrSlug', async (req, res) => {
  try {
    const param = req.params.idOrSlug.trim();
    let query = { isActive: true };

    if (mongoose.Types.ObjectId.isValid(param)) {
      query._id = param;
    } else {
      query.slug = param.toLowerCase();
    }

    const course = await Course.findOne(query).lean();

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    // Include public batch schedules (names, teacher, schedule; meeting links kept private)
    const batches = await Batch.find({
      courseId: course._id,
      status: 'active',
    })
      .select('name teacherName schedule capacity')
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        ...course,
        batches,
      },
    });
  } catch (error) {
    console.error('[Public Get Course Detail Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve course details',
    });
  }
});

/**
 * GET /api/public/notices
 * Lists active published notices and news ticker items for public website
 * Supports optional query params: ?tickerOnly=true&category=&page=&limit=
 */
router.get('/notices', async (req, res) => {
  try {
    const { tickerOnly, category, page, limit } = req.query;
    const filter = { isActive: true };

    if (tickerOnly === 'true') {
      filter.showOnTicker = true;
    }
    if (category && category.trim()) {
      filter.category = category.trim();
    }

    const sortOrder = { publishedAt: -1 };

    // If pagination requested
    if (page || limit) {
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.max(1, parseInt(limit, 10) || 20);
      const skip = (pageNum - 1) * limitNum;

      const [notices, total] = await Promise.all([
        Notice.find(filter)
          .sort(sortOrder)
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Notice.countDocuments(filter),
      ]);

      return res.status(200).json({
        success: true,
        data: {
          notices,
          pagination: {
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum) || 1,
          },
        },
      });
    }

    // Default: Return list directly
    const notices = await Notice.find(filter).sort(sortOrder).lean();

    return res.status(200).json({
      success: true,
      data: notices,
    });
  } catch (error) {
    console.error('[Public Get Notices Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve notices',
    });
  }
});

/**
 * GET /api/public/notices/:id
 * Gets single notice detail by ID (including description and attachment PDF URL)
 */
router.get('/notices/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notice ID format',
      });
    }

    const notice = await Notice.findOne({
      _id: id,
      isActive: true,
    }).lean();

    if (!notice) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: notice,
    });
  } catch (error) {
    console.error('[Public Get Notice Detail Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve notice details',
    });
  }
});

export default router;
