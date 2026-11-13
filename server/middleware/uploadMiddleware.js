import multer from 'multer';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 }, // 2 MB
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) return cb(null, true);

    const error = new Error('Only PNG, JPG, WEBP or GIF images are allowed');
    error.statusCode = 400;
    cb(error);
  },
});

// The form field must be named "image"
export const uploadSingleImage = upload.single('image');