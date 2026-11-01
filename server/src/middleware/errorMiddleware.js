const SAFE_ERROR_MESSAGES = {
  400: "Please check your information and try again.",
  401: "Please sign in again to continue.",
  403: "You do not have permission to do that.",
  404: "The requested information was not found.",
  409: "This action conflicts with existing information.",
  413: "The submitted data is too large.",
  429: "Too many requests. Please try again later.",
};

export default function errorMiddleware(err, req, res, next) {
  if (res.headersSent) return next(err);

  const isDuplicate = err.code === 11000;
  const isValidation =
    err.name === "ValidationError" || err.name === "CastError";
  const requestedStatus = Number(err.statusCode || err.status);
  const status = isDuplicate
    ? 409
    : isValidation
      ? 400
      : requestedStatus >= 400 && requestedStatus < 500
        ? requestedStatus
        : 500;

  if (status >= 500) {
    console.error("Unhandled API error", {
      method: req.method,
      path: req.originalUrl?.split("?")[0],
      error: err,
    });
  }

  res.status(status).json({
    success: false,
    message:
      status >= 500
        ? "Something went wrong. Please try again."
        : SAFE_ERROR_MESSAGES[status] || "The request could not be completed.",
  });
}
