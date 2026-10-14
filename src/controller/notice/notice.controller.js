import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { Notice } from '../../models.js';
import { uploadBufferToCloudinary, deleteFromCloudinary } from '../../config/cloudinary.js';

export const noticeSchema = z.object({
  title: z.string().trim().min(1, 'Notice title is required'),
  category: z.enum(['urgent', 'holiday', 'exam', 'new_batch', 'general']).optional(),
  description: z.string().trim().optional(),
  pdfUrl: z.string().trim().optional(),
  showOnTicker: z.preprocess((val) => val === 'true' || val === true, z.boolean()).optional(),
  isActive: z.preprocess((val) => val === 'true' || val === true, z.boolean()).optional(),
});

export const updateNoticeSchema = z.object({
  title: z.string().trim().min(1).optional(),
  category: z.enum(['urgent', 'holiday', 'exam', 'new_batch', 'general']).optional(),
  description: z.string().trim().optional(),
  pdfUrl: z.string().trim().optional(),
  showOnTicker: z.preprocess((val) => val === 'true' || val === true, z.boolean()).optional(),
  isActive: z.preprocess((val) => val === 'true' || val === true, z.boolean()).optional(),
});

// Helper to safely delete file from filesystem
const deleteFileSafe = (fileUrl) => {
  if (!fileUrl) return;
  // If local upload path, e.g. /uploads/notices/filename.pdf
  const filename = path.basename(fileUrl);
  const filePath = path.resolve('uploads/notices', filename);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (e) {
      console.error(`[Notice File Cleanup Error] Failed to delete ${filePath}:`, e.message);
    }
  }
};

/**
 * GET /api/admin/notices
 * Query: ?category=&page=&limit=&showOnTicker=&isActive=
 */
export const getNotices = async (req, res) => {
  try {
    const { category, showOnTicker, isActive, page, limit } = req.query;
    const filter = {};

    if (category) filter.category = category;
    if (showOnTicker !== undefined && showOnTicker !== '') {
      filter.showOnTicker = showOnTicker === 'true';
    }
    if (isActive !== undefined && isActive !== '') {
      filter.isActive = isActive === 'true';
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
    console.error('[Get Notices Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve notices',
    });
  }
};

/**
 * GET /api/admin/notices/:id
 */
export const getNoticeById = async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id);
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
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve notice',
    });
  }
};

/**
 * POST /api/admin/notices
 * Supports multipart/form-data with file field 'pdf' or JSON body
 */
export const createNotice = async (req, res) => {
  try {
    const { title, category, description, showOnTicker, isActive } = req.body;

    let pdfUrl = req.body.pdfUrl;
    if (req.file && req.file.buffer) {
      const uploadResult = await uploadBufferToCloudinary(req.file.buffer, {
        folder: 'college_portal/notices',
        resource_type: 'raw',
        format: 'pdf',
      });
      pdfUrl = uploadResult.secure_url;
    }

    const notice = await Notice.create({
      title: title.trim(),
      category: category || 'general',
      description,
      pdfUrl,
      showOnTicker: showOnTicker === 'true' || showOnTicker === true,
      isActive: isActive !== undefined ? (isActive === 'true' || isActive === true) : true,
      publishedAt: new Date(),
    });

    return res.status(201).json({
      success: true,
      message: 'Notice created successfully',
      data: notice,
    });
  } catch (error) {
    console.error('[Create Notice Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create notice',
    });
  }
};

/**
 * PATCH /api/admin/notices/:id
 */
export const updateNotice = async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id);
    if (!notice) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found',
      });
    }

    const { title, category, description, showOnTicker, isActive, pdfUrl } = req.body;

    if (title !== undefined) notice.title = title.trim();
    if (category !== undefined) notice.category = category;
    if (description !== undefined) notice.description = description;
    if (showOnTicker !== undefined) notice.showOnTicker = showOnTicker === 'true' || showOnTicker === true;
    if (isActive !== undefined) notice.isActive = isActive === 'true' || isActive === true;

    if (req.file && req.file.buffer) {
      // Remove previous PDF file if exists
      if (notice.pdfUrl) {
        if (notice.pdfUrl.includes('res.cloudinary.com')) {
          deleteFromCloudinary(notice.pdfUrl, { resource_type: 'raw' }).catch((e) =>
            console.warn('[Notice Cloudinary Cleanup Warning]:', e.message)
          );
        } else {
          deleteFileSafe(notice.pdfUrl);
        }
      }
      const uploadResult = await uploadBufferToCloudinary(req.file.buffer, {
        folder: 'college_portal/notices',
        resource_type: 'raw',
        format: 'pdf',
      });
      notice.pdfUrl = uploadResult.secure_url;
    } else if (pdfUrl !== undefined) {
      notice.pdfUrl = pdfUrl;
    }

    await notice.save();

    return res.status(200).json({
      success: true,
      message: 'Notice updated successfully',
      data: notice,
    });
  } catch (error) {
    console.error('[Update Notice Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update notice',
    });
  }
};

/**
 * DELETE /api/admin/notices/:id
 */
export const deleteNotice = async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id);
    if (!notice) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found',
      });
    }

    // Clean up associated PDF file
    if (notice.pdfUrl) {
      if (notice.pdfUrl.includes('res.cloudinary.com')) {
        deleteFromCloudinary(notice.pdfUrl, { resource_type: 'raw' }).catch((e) =>
          console.warn('[Notice Cloudinary Cleanup Warning]:', e.message)
        );
      } else {
        deleteFileSafe(notice.pdfUrl);
      }
    }

    await Notice.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Notice deleted successfully',
    });
  } catch (error) {
    console.error('[Delete Notice Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete notice',
    });
  }
};
