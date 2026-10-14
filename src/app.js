import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';

// Route imports
import adminRoutes from './routes/admin.routes.js';
import courseRoutes from './routes/course.routes.js';
import batchRoutes from './routes/batch.routes.js';
import noticeRoutes from './routes/notice.routes.js';
import admissionRoutes from './routes/admission.routes.js';
import studentRoutes from './routes/student.routes.js';
import publicRoutes from './routes/public.routes.js';
import studentPortalRoutes from './routes/studentPortal.routes.js';

const app = express();

// Security and utility middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

const allowedOrigins = process.env.CLIENT_URL
  ? [process.env.CLIENT_URL, 'http://localhost:3000', 'http://localhost:5173']
  : ['http://localhost:3000', 'http://localhost:5173'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman) or in allowed list
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive in dev, configurable for prod
      }
    },
    credentials: true,
  })
);

app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files for uploads
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const baseUploadDir = isServerless ? '/tmp/uploads' : path.resolve('uploads');
app.use('/uploads', express.static(baseUploadDir));

// Root welcome endpoint for Vercel / browser checks
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'College Portal Backend API is running successfully',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      health: '/health',
      public: '/api/public',
      admin: '/api/admin',
      student: '/api/student',
    },
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', uptime: process.uptime() });
});

// Route mountings
app.use('/api/admin', adminRoutes);
app.use('/api/admin/courses', courseRoutes);
app.use('/api/admin/batches', batchRoutes);
app.use('/api/admin/notices', noticeRoutes);
app.use('/api/admin/admissions', admissionRoutes);
app.use('/api/admin/students', studentRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/student', studentPortalRoutes);

// 404 Handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('[Global Error Handler]:', err);

  // Request payload too large (413)
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      message: 'Request payload is too large. Maximum allowed size is 50MB.',
    });
  }

  // Multer file upload errors
  if (err.name === 'MulterError') {
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`,
    });
  }

  // File filter custom error
  if (err.message && (err.message.includes('Only PDF files are allowed') || err.message.includes('Only image files'))) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  const statusCode = err.statusCode || 500;
  return res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

export default app;
