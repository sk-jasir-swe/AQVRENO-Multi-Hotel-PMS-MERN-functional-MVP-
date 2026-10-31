export function validateRequest(schema) {
  return (req, res, next) => {
    const result = schema.safeParse
      ? schema.safeParse(req.body)
      : { success: true };
    if (!result.success)
      return res
        .status(400)
        .json({ message: "Validation failed", errors: result.error.flatten() });
    req.validatedBody = result.data;
    next();
  };
}
