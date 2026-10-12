import { z } from 'zod';
import { Course, Batch, Enrollment, Admission } from '../../models.js';
import { generateUniqueCourseSlug } from '../../utils/slugify.js';

export const createCourseSchema = z.object({
  name: z.string().trim().min(1, 'Course name is required'),
  description: z.string().trim().optional(),
  ageGroup: z.string().trim().optional(),
  isActive: z.boolean().optional(),
  isPinned: z.boolean().optional(),
});

export const updateCourseSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().optional(),
  ageGroup: z.string().trim().optional(),
  isActive: z.boolean().optional(),
  isPinned: z.boolean().optional(),
});

/**
 * GET /api/admin/courses
 * Supports query: ?search=&isActive=&page=&limit=
 */
export const getCourses = async (req, res) => {
  try {
    const { search, isActive, page, limit } = req.query;
    const filter = {};

    if (isActive !== undefined && isActive !== '') {
      filter.isActive = isActive === 'true';
    }

    if (search && search.trim()) {
      filter.name = { $regex: search.trim(), $options: 'i' };
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const [courses, total] = await Promise.all([
      Course.find(filter)
        .sort({ isPinned: -1, createdAt: -1 })
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
  } catch (error) {
    console.error('[Get Courses Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve courses',
    });
  }
};

/**
 * GET /api/admin/courses/:id
 */
export const getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    // Also fetch associated batches for convenience in admin panel
    const batches = await Batch.find({ courseId: course._id });

    return res.status(200).json({
      success: true,
      data: {
        ...course.toObject(),
        batches,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve course',
    });
  }
};

/**
 * POST /api/admin/courses
 */
export const createCourse = async (req, res) => {
  try {
    const { name, description, ageGroup, isActive, isPinned } = req.body;
    const slug = await generateUniqueCourseSlug(name);

    const course = await Course.create({
      name: name.trim(),
      slug,
      description,
      ageGroup,
      isActive: isActive !== undefined ? isActive : true,
      isPinned: isPinned !== undefined ? isPinned : false,
    });

    return res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: course,
    });
  } catch (error) {
    console.error('[Create Course Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create course',
    });
  }
};

/**
 * PATCH /api/admin/courses/:id
 */
export const updateCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    const { name, description, ageGroup, isActive, isPinned } = req.body;

    if (name && name.trim() !== course.name) {
      course.name = name.trim();
      course.slug = await generateUniqueCourseSlug(name.trim(), course._id);
    }

    if (description !== undefined) course.description = description;
    if (ageGroup !== undefined) course.ageGroup = ageGroup;
    if (isActive !== undefined) course.isActive = isActive;
    if (isPinned !== undefined) course.isPinned = isPinned;

    await course.save();

    return res.status(200).json({
      success: true,
      message: 'Course updated successfully',
      data: course,
    });
  } catch (error) {
    console.error('[Update Course Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update course',
    });
  }
};

/**
 * DELETE /api/admin/courses/:id
 */
export const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    // Check references in enrollments, batches, or admissions
    const [hasEnrollments, hasBatches, hasAdmissions] = await Promise.all([
      Enrollment.exists({ courseId: id }),
      Batch.exists({ courseId: id }),
      Admission.exists({ courseId: id }),
    ]);

    if (hasEnrollments || hasBatches || hasAdmissions) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete course with associated enrollments, batches, or admissions. Please set isActive: false instead.',
      });
    }

    await Course.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Course deleted successfully',
    });
  } catch (error) {
    console.error('[Delete Course Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete course',
    });
  }
};
