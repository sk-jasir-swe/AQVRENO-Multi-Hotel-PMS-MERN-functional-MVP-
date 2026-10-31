export function tenantMiddleware(req, res, next) {
  if (req.user?.role === "super_admin") {
    req.tenantId = null;
    return next();
  }
  if (!req.user?.hotel) {
    return res.status(403).json({ message: "Hotel tenant context missing" });
  }
  req.tenantId = req.user.hotel._id;
  next();
}
