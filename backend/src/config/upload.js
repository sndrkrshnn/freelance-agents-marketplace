const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

// Ensure upload directories exist
const uploadDir = process.env.UPLOAD_DIR || './uploads';
const subdirs = ['profiles', 'tasks', 'portfolio', 'temp', 'thumbnails'];

subdirs.forEach(dir => {
  const fullPath = path.join(uploadDir, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];

  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx', '.txt'];
  const fileExtension = path.extname(file.originalname).toLowerCase();

  if (allowedTypes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Allowed types: ' + allowedExtensions.join(', ')), false);
  }
};

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let subdir = 'temp';

    // Determine subdirectory based on file type or request parameter
    if (req.body.entityType === 'profile_picture' || req.body.entityType === 'task_attachment' || req.body.entityType === 'agent_portfolio') {
      subdir = req.body.entityType === 'profile_picture' ? 'profiles' :
               req.body.entityType === 'agent_portfolio' ? 'portfolio' : 'tasks';
    } else if (file.mimetype.startsWith('image/')) {
      subdir = 'temp';
    }

    const dest = path.join(uploadDir, subdir);
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: UUID-timestamp-extension
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}-${uniqueSuffix}${ext}`;
    cb(null, filename);
  }
});

// Multer configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.UPLOAD_MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB default
    files: parseInt(process.env.UPLOAD_MAX_FILES) || 10
  }
});

// Single file upload middleware
const uploadSingle = upload.single('file');

// Multiple files upload middleware
const uploadMultiple = upload.array('files', 10);

// Upload middleware with error handling
const uploadErrorHandler = (uploadMiddleware) => (req, res, next) => {
  uploadMiddleware(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // Multer error (file size, file count, etc.)
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File size exceeds the maximum limit'
        });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          success: false,
          message: 'Too many files uploaded'
        });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          success: false,
          message: 'Unexpected file field'
        });
      }
      return res.status(400).json({
        success: false,
        message: `Upload error: ${err.message}`
      });
    } else if (err) {
      // Other errors
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    next();
  });
};

// MIME type validation (additional security)
const validateMimeType = (file, allowedMimeTypes) => {
  return allowedMimeTypes.includes(file.mimetype);
};

// File type categories
const fileTypes = {
  image: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
};

module.exports = {
  upload,
  uploadSingle,
  uploadMultiple,
  uploadErrorHandler,
  fileFilter,
  validateMimeType,
  fileTypes,
  uploadDir
};
