// Handles URLs that don't exist
export const notFound = (req, res, next) => {
  res.status(404);
  next(new Error(`Route not found: ${req.originalUrl}`));
};

// Handles all errors in one place
export const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  let message = err.message;

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map((e) => e.message).join(', ');
  }

  // Duplicate key (unique email caught by MongoDB itself)
    // Duplicate key
  if (err.code === 11000) {
    statusCode = 409;
    message = err.keyPattern?.email
      ? 'This email is already registered'
      : 'Duplicate entry';
  }

  // Invalid MongoDB id format
  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  }

    // Errors that carry their own status (e.g. wrong image type)
  if (err.statusCode) {
    statusCode = err.statusCode;
  }

  // Multer errors (file too large, etc.)
  if (err.name === 'MulterError') {
    statusCode = 400;
    message =
      err.code === 'LIMIT_FILE_SIZE' ? 'Image is too large (maximum 2 MB)' : err.message;
  }

  res.status(statusCode).json({
    message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
};