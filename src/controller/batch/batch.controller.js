import { z } from 'zod';
import { Batch, Course, Enrollment, TIME_RE } from '../../models.js';

const slotSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(TIME_RE, 'Start time must be HH:MM format (e.g. 16:30)'),
  endTime: z.string().regex(TIME_RE, 'End time must be HH:MM format (e.g. 17:30)'),
});

export const createBatchSchema = z.object({
  courseId: z.string().min(1, 'Course ID is required'),
  name: z.string().trim().min(1, 'Batch name is required'),
  teacherName: z.string().trim().optional(),
  meetingLink: z.string().trim().optional(),
  capacity: z.number().int().positive().optional(),
  schedule: z.array(slotSchema).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export const updateBatchSchema = z.object({
  name: z.string().trim().min(1).optional(),
  teacherName: z.string().trim().optional(),
  meetingLink: z.string().trim().optional(),
  capacity: z.number().int().positive().optional(),
  schedule: z.array(slotSchema).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

/**
 * GET /api/admin/batches
 * Filter by ?courseId=&status=
 */
export const getBatches = async (req, res) => {
  try {
    const { courseId, status } = req.query;
    const filter = {};

    if (courseId) filter.courseId = courseId;
    if (status) filter.status = status;

    const batches = await Batch.find(filter)
      .populate('courseId', 'name slug')
      .sort({ createdAt: -1 })
      .lean();

    // Attach active enrollment counts
    const batchesWithCounts = await Promise.all(
      batches.map(async (batch) => {
        const activeEnrollments = await Enrollment.countDocuments({
          batchId: batch._id,
          status: 'active',
        });
        return {
          ...batch,
          enrolledCount: activeEnrollments,
          availableSeats: batch.capacity ? Math.max(0, batch.capacity - activeEnrollments) : null,
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: batchesWithCounts,
    });
  } catch (error) {
    console.error('[Get Batches Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve batches',
    });
  }
};

/**
 * GET /api/admin/batches/:id
 */
export const getBatchById = async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id).populate('courseId', 'name slug');
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found',
      });
    }

    const activeEnrollments = await Enrollment.countDocuments({
      batchId: batch._id,
      status: 'active',
    });

    return res.status(200).json({
      success: true,
      data: {
        ...batch.toObject(),
        enrolledCount: activeEnrollments,
        availableSeats: batch.capacity ? Math.max(0, batch.capacity - activeEnrollments) : null,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve batch',
    });
  }
};

/**
 * POST /api/admin/batches
 */
export const createBatch = async (req, res) => {
  try {
    const { courseId, name, teacherName, meetingLink, capacity, schedule, status } = req.body;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Specified course does not exist',
      });
    }

    const batch = await Batch.create({
      courseId,
      name: name.trim(),
      teacherName,
      meetingLink,
      capacity,
      schedule: schedule || [],
      status: status || 'active',
    });

    return res.status(201).json({
      success: true,
      message: 'Batch created successfully',
      data: batch,
    });
  } catch (error) {
    console.error('[Create Batch Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create batch',
    });
  }
};

/**
 * PATCH /api/admin/batches/:id
 */
export const updateBatch = async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found',
      });
    }

    const { name, teacherName, meetingLink, capacity, schedule, status } = req.body;

    if (name !== undefined) batch.name = name.trim();
    if (teacherName !== undefined) batch.teacherName = teacherName.trim();
    if (meetingLink !== undefined) batch.meetingLink = meetingLink.trim();
    if (capacity !== undefined) batch.capacity = capacity;
    if (schedule !== undefined) batch.schedule = schedule;
    if (status !== undefined) batch.status = status;

    await batch.save();

    return res.status(200).json({
      success: true,
      message: 'Batch updated successfully',
      data: batch,
    });
  } catch (error) {
    console.error('[Update Batch Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update batch',
    });
  }
};

/**
 * DELETE /api/admin/batches/:id
 */
export const deleteBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const batch = await Batch.findById(id);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found',
      });
    }

    const hasActiveEnrollments = await Enrollment.exists({ batchId: id, status: 'active' });
    if (hasActiveEnrollments) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete batch with active student enrollments. Set status to inactive instead.',
      });
    }

    await Batch.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Batch deleted successfully',
    });
  } catch (error) {
    console.error('[Delete Batch Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete batch',
    });
  }
};
