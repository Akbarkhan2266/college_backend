import { Enrollment, Notice, StudentProfile, User } from '../../models.js';
import {
  getTodayIST,
  getNextClass,
  isBatchJoinable,
  isSlotJoinable,
  timeToMinutes,
} from '../../utils/istTime.js';

/**
 * Shared helper to fetch active enrollments for a student.
 * Populates course details and batch details.
 *
 * @param {string|import('mongoose').Types.ObjectId} userId
 * @returns {Promise<Array>}
 */
export const getActiveEnrollments = async (userId) => {
  return Enrollment.find({ studentId: userId, status: 'active' })
    .populate('courseId', 'name description ageGroup slug')
    .populate('batchId', 'name teacherName schedule meetingLink status')
    .lean();
};

/**
 * GET /api/student/dashboard
 * Returns todaysClasses and latest 3 active notices.
 */
export const getDashboard = async (req, res) => {
  try {
    const studentId = req.user._id;
    const { dayOfWeek, minutesNow } = getTodayIST();

    const [enrollments, latestNotices] = await Promise.all([
      getActiveEnrollments(studentId),
      Notice.find({ isActive: true })
        .sort({ publishedAt: -1 })
        .limit(3)
        .lean(),
    ]);

    const todaysClasses = [];

    for (const enr of enrollments) {
      const batch = enr.batchId;
      if (!batch || !Array.isArray(batch.schedule)) continue;

      for (const slot of batch.schedule) {
        if (slot.dayOfWeek === dayOfWeek) {
          todaysClasses.push({
            courseName: enr.courseId?.name || '',
            batchName: batch.name || '',
            teacher: batch.teacherName || '',
            startTime: slot.startTime,
            endTime: slot.endTime,
            meetingLink: batch.meetingLink || '',
            canJoin: isSlotJoinable(slot, dayOfWeek, minutesNow),
          });
        }
      }
    }

    // Sort chronologically by start time
    todaysClasses.sort(
      (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
    );

    return res.status(200).json({
      success: true,
      data: {
        todaysClasses,
        latestNotices,
      },
    });
  } catch (error) {
    console.error('[Student getDashboard Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard information',
    });
  }
};

/**
 * GET /api/student/courses
 * Returns the student's active course enrollments.
 */
export const getMyCourses = async (req, res) => {
  try {
    const studentId = req.user._id;
    const enrollments = await getActiveEnrollments(studentId);

    const courses = enrollments.map((enr) => ({
      course: enr.courseId || null,
      batchName: enr.batchId?.name || '',
      enrollmentStatus: enr.status,
      startDate: enr.startDate,
    }));

    return res.status(200).json({
      success: true,
      data: courses,
    });
  } catch (error) {
    console.error('[Student getMyCourses Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve courses',
    });
  }
};

/**
 * GET /api/student/batches
 * Returns the student's active batches, with canJoin and nextClass calculated.
 */
export const getMyBatches = async (req, res) => {
  try {
    const studentId = req.user._id;
    const { dayOfWeek, minutesNow } = getTodayIST();
    const enrollments = await getActiveEnrollments(studentId);

    const batches = enrollments
      .filter((enr) => enr.batchId)
      .map((enr) => {
        const batch = enr.batchId;
        const schedule = batch.schedule || [];
        const canJoin = isBatchJoinable(schedule, dayOfWeek, minutesNow);
        const nextClass = getNextClass(schedule, dayOfWeek, minutesNow);

        return {
          _id: batch._id,
          name: batch.name,
          courseName: enr.courseId?.name || '',
          courseId: enr.courseId?._id || null,
          teacherName: batch.teacherName || '',
          schedule,
          meetingLink: batch.meetingLink || '',
          canJoin,
          nextClass,
        };
      });

    return res.status(200).json({
      success: true,
      data: batches,
    });
  } catch (error) {
    console.error('[Student getMyBatches Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve batches',
    });
  }
};

/**
 * GET /api/student/notices
 * Query: ?category=&page=&limit=
 */
export const getNotices = async (req, res) => {
  try {
    const { category, page, limit } = req.query;
    const filter = { isActive: true };

    if (category) {
      filter.category = category;
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const [notices, total] = await Promise.all([
      Notice.find(filter)
        .sort({ publishedAt: -1 })
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
  } catch (error) {
    console.error('[Student getNotices Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve notices',
    });
  }
};

/**
 * GET /api/student/notices/:id
 * Returns detail of an active notice including full description and pdfUrl.
 */
export const getNoticeById = async (req, res) => {
  try {
    const notice = await Notice.findOne({
      _id: req.params.id,
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
    console.error('[Student getNoticeById Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve notice details',
    });
  }
};

/**
 * GET /api/student/profile
 * Read-only profile for the logged in student.
 */
export const getProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    const [user, profile] = await Promise.all([
      User.findById(userId).select('name phone email loginId role').lean(),
      StudentProfile.findOne({ userId }).lean(),
    ]);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        name: user.name,
        phone: user.phone || '',
        email: user.email || '',
        loginId: user.loginId,
        guardianName: profile?.guardianName || '',
        address: profile?.address || '',
        dob: profile?.dob || null,
      },
    });
  } catch (error) {
    console.error('[Student getProfile Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve profile',
    });
  }
};
