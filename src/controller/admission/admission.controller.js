import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { z } from 'zod';
import {
  Admission,
  Course,
  Batch,
  User,
  StudentProfile,
  Enrollment,
} from '../../models.js';
import { generateStudentId } from '../../utils/generateStudentId.js';
import { generatePassword } from '../../utils/generatePassword.js';
import { sendNewAdmissionEmail } from '../../utils/mailer.js';

export const submitAdmissionSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  phone: z.string().trim().min(7, 'Valid phone number is required'),
  email: z.string().email('Valid email is required').optional().or(z.literal('')),
  guardianName: z.string().trim().optional(),
  address: z.string().trim().optional(),
  dob: z.string().optional().refine((val) => !val || !isNaN(Date.parse(val)), {
    message: 'Invalid date format for Date of Birth',
  }),
  courseId: z.string().min(1, 'Course ID is required'),
  website: z.string().optional(), // Honeypot spam trap
});

export const approveAdmissionSchema = z.object({
  batchId: z.string().min(1, 'Batch ID is required'),
});

export const rejectAdmissionSchema = z.object({
  reason: z.string().trim().optional(),
});

/**
 * POST /api/public/admissions
 * Public submission of admission form
 */
export const submitAdmissionForm = async (req, res) => {
  try {
    const { name, phone, email, guardianName, address, dob, courseId, website } = req.body;

    // Honeypot check: If the hidden 'website' field is populated, bot was detected
    if (website) {
      return res.status(200).json({
        success: true,
        message: 'Admission form submitted successfully',
      });
    }

    // Verify course exists and is active
    const course = await Course.findById(courseId);
    if (!course || !course.isActive) {
      return res.status(400).json({
        success: false,
        message: 'The selected course is either inactive or does not exist',
      });
    }

    const admission = await Admission.create({
      name: name.trim(),
      phone: phone.trim(),
      email: email ? email.toLowerCase().trim() : undefined,
      guardianName: guardianName ? guardianName.trim() : undefined,
      address: address ? address.trim() : undefined,
      dob: dob ? new Date(dob) : undefined,
      courseId,
      status: 'pending',
    });

    // Send email notification in the background
    sendNewAdmissionEmail({
      admission,
      courseName: course.name,
    }).catch((mailErr) => {
      console.error('[Admission Mail Notification Error]:', mailErr);
    });

    return res.status(201).json({
      success: true,
      message: 'Admission form submitted successfully. We will review it shortly.',
      data: {
        id: admission._id,
        name: admission.name,
        courseId: admission.courseId,
        status: admission.status,
      },
    });
  } catch (error) {
    console.error('[Submit Admission Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit admission application',
    });
  }
};

/**
 * GET /api/admin/admissions
 * Query: ?status=pending|approved|rejected&search=&page=&limit=
 */
export const getAdmissions = async (req, res) => {
  try {
    const { status, search, page, limit } = req.query;
    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (search && search.trim()) {
      const regex = { $regex: search.trim(), $options: 'i' };
      filter.$or = [
        { name: regex },
        { phone: regex },
        { email: regex },
      ];
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const [admissions, total] = await Promise.all([
      Admission.find(filter)
        .populate('courseId', 'name slug')
        .populate('studentUserId', 'name loginId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Admission.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        admissions,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum) || 1,
        },
      },
    });
  } catch (error) {
    console.error('[Get Admissions Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve admission applications',
    });
  }
};

/**
 * GET /api/admin/admissions/:id
 */
export const getAdmissionById = async (req, res) => {
  try {
    const admission = await Admission.findById(req.params.id)
      .populate('courseId', 'name slug description')
      .populate('studentUserId', 'name loginId email phone');

    if (!admission) {
      return res.status(404).json({
        success: false,
        message: 'Admission application not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: admission,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve admission application',
    });
  }
};

/**
 * POST /api/admin/admissions/:id/approve
 * Approves admission, creates/reuses student account, assigns to batch, returns generated credentials
 */
export const approveAdmission = async (req, res) => {
  let createdUser = null;
  let createdProfile = null;
  let createdEnrollment = null;

  try {
    const { id } = req.params;
    const { batchId } = req.body;

    // 1. Admission must exist and be 'pending'
    const admission = await Admission.findById(id);
    if (!admission) {
      return res.status(404).json({
        success: false,
        message: 'Admission application not found',
      });
    }

    if (admission.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Admission is already ${admission.status}. Only pending applications can be approved.`,
      });
    }

    // 2. Batch must exist, be active, belong to admission.courseId, and have free capacity
    const batch = await Batch.findById(batchId);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Specified batch not found',
      });
    }

    if (batch.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'The selected batch is not active',
      });
    }

    if (batch.courseId.toString() !== admission.courseId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'The selected batch does not belong to this admission course',
      });
    }

    if (batch.capacity) {
      const activeEnrolledCount = await Enrollment.countDocuments({
        batchId: batch._id,
        status: 'active',
      });
      if (activeEnrolledCount >= batch.capacity) {
        return res.status(400).json({
          success: false,
          message: `Batch "${batch.name}" is currently full (Capacity: ${batch.capacity})`,
        });
      }
    }

    // 3. Check if student with same phone already exists
    let studentUser = await User.findOne({
      phone: admission.phone.trim(),
      role: 'student',
    });

    let plainPassword = null;
    let reusedAccount = false;

    if (studentUser) {
      // Reuse existing account
      reusedAccount = true;

      // Check if student is already enrolled in this course actively
      const existingEnrollment = await Enrollment.findOne({
        studentId: studentUser._id,
        courseId: admission.courseId,
        status: 'active',
      });

      if (existingEnrollment) {
        return res.status(400).json({
          success: false,
          message: 'Student with this phone number is already actively enrolled in this course',
        });
      }
    } else {
      // 4. Generate new student credentials
      const studentId = await generateStudentId();
      plainPassword = generatePassword(8);

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(plainPassword, salt);

      // 5. Create User
      createdUser = await User.create({
        role: 'student',
        name: admission.name,
        email: admission.email || undefined,
        phone: admission.phone,
        loginId: studentId,
        password: hashedPassword,
        isActive: true,
        mustChangePassword: true,
      });
      studentUser = createdUser;

      // 6. Create StudentProfile
      createdProfile = await StudentProfile.create({
        userId: studentUser._id,
        guardianName: admission.guardianName,
        address: admission.address,
        dob: admission.dob,
      });
    }

    // 7. Create Enrollment
    createdEnrollment = await Enrollment.create({
      studentId: studentUser._id,
      courseId: admission.courseId,
      batchId: batch._id,
      status: 'active',
      startDate: new Date(),
    });

    // 8. Update admission status
    admission.status = 'approved';
    admission.studentUserId = studentUser._id;
    admission.reviewedAt = new Date();
    await admission.save();

    return res.status(200).json({
      success: true,
      message: 'Admission approved and student enrolled successfully',
      data: {
        studentId: studentUser.loginId,
        name: studentUser.name,
        phone: studentUser.phone,
        password: plainPassword, // Only returned on creation
        reusedAccount,
        batchName: batch.name,
        enrollmentId: createdEnrollment._id,
      },
    });
  } catch (error) {
    console.error('[Approve Admission Error]:', error);

    // Rollback any newly created documents on error
    if (createdEnrollment) await Enrollment.findByIdAndDelete(createdEnrollment._id).catch(() => {});
    if (createdProfile) await StudentProfile.findByIdAndDelete(createdProfile._id).catch(() => {});
    if (createdUser) await User.findByIdAndDelete(createdUser._id).catch(() => {});

    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to approve admission',
    });
  }
};

/**
 * POST /api/admin/admissions/:id/reject
 */
export const rejectAdmission = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const admission = await Admission.findById(id);
    if (!admission) {
      return res.status(404).json({
        success: false,
        message: 'Admission application not found',
      });
    }

    if (admission.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Only pending applications can be rejected. Current status is ${admission.status}.`,
      });
    }

    admission.status = 'rejected';
    admission.rejectReason = reason ? reason.trim() : undefined;
    admission.reviewedAt = new Date();
    await admission.save();

    return res.status(200).json({
      success: true,
      message: 'Admission rejected successfully',
      data: {
        id: admission._id,
        status: admission.status,
        rejectReason: admission.rejectReason,
      },
    });
  } catch (error) {
    console.error('[Reject Admission Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reject admission',
    });
  }
};
