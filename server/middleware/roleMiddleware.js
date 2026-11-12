// Usage: authorize('examiner')  or  authorize('student')
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      res.status(403);
      return next(
        new Error(`Access denied: this route is only for ${allowedRoles.join(' / ')}`)
      );
    }
    next();
  };
};