export default function errorMiddleware(err, req, res, next) {
  if (res.headersSent) return next(err);
  const status = err.statusCode || err.status || 500;
  res.status(status).json({
    success: false,
    message: status === 500 ? "Internal server error" : err.message,
    ...(process.env.NODE_ENV !== "production" ? { detail: err.message } : {}),
  });
}
