import multer from 'multer';

// Memory storage for seamless serverless & Cloudinary streaming
const memoryStorage = multer.memoryStorage();

/* ---------------- Notice PDF Upload ---------------- */
const pdfFileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed.'), false);
  }
};

export const uploadNoticePdf = multer({
  storage: memoryStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: pdfFileFilter,
});

/* ---------------- Course Image Upload ---------------- */
const imageFileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (PNG, JPG, JPEG, WEBP, SVG) are allowed.'), false);
  }
};

export const uploadCourseImage = multer({
  storage: memoryStorage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
  fileFilter: imageFileFilter,
});

/**
 * Flexible middleware that accepts 'image', 'file', 'imageUrl', or any file field
 * and sets req.file properly.
 */
export const uploadCourseImageMiddleware = (req, res, next) => {
  uploadCourseImage.any()(req, res, (err) => {
    if (err) return next(err);
    if (req.files && req.files.length > 0) {
      req.file =
        req.files.find((f) => ['image', 'imageUrl', 'file', 'photo', 'thumbnail'].includes(f.fieldname)) ||
        req.files[0];
    }
    next();
  });
};

/**
 * Flexible middleware that accepts 'pdf', 'file', or any PDF file field
 */
export const uploadNoticePdfMiddleware = (req, res, next) => {
  uploadNoticePdf.any()(req, res, (err) => {
    if (err) return next(err);
    if (req.files && req.files.length > 0) {
      req.file =
        req.files.find((f) => ['pdf', 'file', 'document', 'pdfUrl'].includes(f.fieldname)) ||
        req.files[0];
    }
    next();
  });
};

