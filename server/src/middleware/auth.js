import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Missing token" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user?.role || req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin only" });
  }
  return next();
}

