import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User, StudentProfile, Enrollment, Batch } from '../../models.js';
import { generatePassword } from '../../utils/generatePassword.js';

export const updateStudentInfoSchema = z.object({
  name: z.string().trim().min(1).optional(),
  phone: z.string().trim().min(1).optional(),
  email: z.string().email().optional().or(z.literal('')),
  guardianName: z.string().trim().optional(),
  address: z.string().trim().optional(),
  dob: z.string().optional().refine((val) => !val || !isNaN(Date.parse(val)), {
    message: 'Invalid date format for Date of Birth',
  }),
});

export const changeStudentBatchSchema = z.object({
  enrollmentId: z.string().min(1, 'Enrollment ID is required'),
  newBatchId: z.string().min(1, 'New Batch ID is required'),
});

export const setStudentStatusSchema = z.object({
  isActive: z.boolean(),
});

/**
 * GET /api/admin/students
 * Query: ?search=&courseId=&batchId=&isActive=&page=&limit=
 */
export const getStudents = async (req, res) => {
  try {
    const { search, courseId, batchId, isActive, page, limit } = req.query;

    const userFilter = { role: 'student' };

    if (isActive !== undefined && isActive !== '') {
      userFilter.isActive = isActive === 'true';
    }

    if (search && search.trim()) {
      const regex = { $regex: search.trim(), $options: 'i' };
      userFilter.$or = [
        { name: regex },
        { phone: regex },
        { loginId: regex },
        { email: regex },
      ];
    }

    // If filtering by courseId or batchId, find matching student IDs first
    if (courseId || batchId) {
      const enrollmentQuery = {};
      if (courseId) enrollmentQuery.courseId = courseId;
      if (batchId) enrollmentQuery.batchId = batchId;
      enrollmentQuery.status = 'active';

      const studentIds = await Enrollment.distinct('studentId', enrollmentQuery);
      userFilter._id = { $in: studentIds };
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const [students, total] = await Promise.all([
      User.find(userFilter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments(userFilter),
    ]);

    // Attach enrollments and profile for each student
    const studentData = await Promise.all(
      students.map(async (student) => {
        const [profile, enrollments] = await Promise.all([
          StudentProfile.findOne({ userId: student._id }).lean(),
          Enrollment.find({ studentId: student._id })
            .populate('courseId', 'name slug')
            .populate('batchId', 'name schedule teacherName meetingLink')
            .lean(),
        ]);

        return {
          ...student,
          studentId: student.loginId,
          profile,
          enrollments,
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: {
        students: studentData,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum) || 1,
        },
      },
    });
  } catch (error) {
    console.error('[Get Students Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve students',
    });
  }
};

/**
 * GET /api/admin/students/:id
 */
export const getStudentById = async (req, res) => {
  try {
    const student = await User.findOne({ _id: req.params.id, role: 'student' }).select('-password');
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    const [profile, enrollments] = await Promise.all([
      StudentProfile.findOne({ userId: student._id }),
      Enrollment.find({ studentId: student._id })
        .populate('courseId', 'name slug description ageGroup')
        .populate('batchId', 'name teacherName meetingLink capacity schedule status'),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        ...student.toObject(),
        studentId: student.loginId,
        profile,
        enrollments,
      },
    });
  } catch (error) {
    console.error('[Get Student By Id Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve student details',
    });
  }
};

/**
 * PATCH /api/admin/students/:id
 * Updates allowed student personal info (User & StudentProfile)
 */
export const updateStudentInfo = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email, guardianName, address, dob } = req.body;

    const student = await User.findOne({ _id: id, role: 'student' });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Whitelist updates on User
    if (name !== undefined) student.name = name.trim();
    if (phone !== undefined) student.phone = phone.trim();
    if (email !== undefined) student.email = email ? email.toLowerCase().trim() : undefined;
    await student.save();

    // Whitelist updates on StudentProfile
    let profile = await StudentProfile.findOne({ userId: student._id });
    if (!profile) {
      profile = new StudentProfile({ userId: student._id });
    }

    if (guardianName !== undefined) profile.guardianName = guardianName.trim();
    if (address !== undefined) profile.address = address.trim();
    if (dob !== undefined) profile.dob = dob ? new Date(dob) : undefined;
    await profile.save();

    return res.status(200).json({
      success: true,
      message: 'Student information updated successfully',
      data: {
        student: {
          id: student._id,
          name: student.name,
          phone: student.phone,
          email: student.email,
          studentId: student.loginId,
        },
        profile,
      },
    });
  } catch (error) {
    console.error('[Update Student Info Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update student information',
    });
  }
};

/**
 * PATCH /api/admin/students/:id/batch
 * Transfers a student enrollment to a new batch of the same course
 */
export const changeStudentBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { enrollmentId, newBatchId } = req.body;

    // Verify student exists
    const student = await User.findOne({ _id: id, role: 'student' });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Verify enrollment belongs to student
    const enrollment = await Enrollment.findOne({ _id: enrollmentId, studentId: student._id });
    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment record not found for this student',
      });
    }

    // Verify new batch
    const newBatch = await Batch.findById(newBatchId);
    if (!newBatch) {
      return res.status(404).json({
        success: false,
        message: 'New batch not found',
      });
    }

    if (newBatch.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'The selected batch is not active',
      });
    }

    if (newBatch.courseId.toString() !== enrollment.courseId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'New batch does not belong to the same course as the current enrollment',
      });
    }

    // Check capacity of new batch
    if (newBatch.capacity) {
      const activeEnrollments = await Enrollment.countDocuments({
        batchId: newBatch._id,
        status: 'active',
      });
      if (activeEnrollments >= newBatch.capacity) {
        return res.status(400).json({
          success: false,
          message: `Batch "${newBatch.name}" is already at full capacity`,
        });
      }
    }

    // Update enrollment batch
    enrollment.batchId = newBatch._id;
    await enrollment.save();

    return res.status(200).json({
      success: true,
      message: `Student batch successfully changed to "${newBatch.name}"`,
      data: {
        enrollmentId: enrollment._id,
        newBatchId: newBatch._id,
        newBatchName: newBatch.name,
      },
    });
  } catch (error) {
    console.error('[Change Student Batch Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to change student batch',
    });
  }
};

/**
 * PATCH /api/admin/students/:id/status
 * Toggles student active status; marks enrollments as 'left' if deactivated
 */
export const setStudentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const student = await User.findOne({ _id: id, role: 'student' });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    student.isActive = isActive;
    await student.save();

    // If deactivating, mark active enrollments as 'left'
    if (!isActive) {
      await Enrollment.updateMany(
        { studentId: student._id, status: 'active' },
        { $set: { status: 'left' } }
      );
    }

    return res.status(200).json({
      success: true,
      message: `Student account has been ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        id: student._id,
        isActive: student.isActive,
      },
    });
  } catch (error) {
    console.error('[Set Student Status Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update student status',
    });
  }
};

/**
 * POST /api/admin/students/:id/reset-password
 * Generates and returns a new temporary password once
 */
export const resetStudentPassword = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await User.findOne({ _id: id, role: 'student' });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    const newPlainPassword = generatePassword(8);
    const salt = await bcrypt.genSalt(10);
    student.password = await bcrypt.hash(newPlainPassword, salt);
    student.mustChangePassword = true;
    await student.save();

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully. Share this temporary password with the student.',
      data: {
        studentId: student.loginId,
        name: student.name,
        newPassword: newPlainPassword,
      },
    });
  } catch (error) {
    console.error('[Reset Student Password Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reset student password',
    });
  }
};
