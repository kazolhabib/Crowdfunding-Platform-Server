const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "fundflow-super-secret-key-change-me-in-production";

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, error: "Not authenticated" });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ success: false, error: "Invalid token" });
  }
}

function supporterOnly(req, res, next) {
  if (req.user.role !== "Supporter") {
    return res.status(403).json({ success: false, error: "Only supporters can purchase credits." });
  }
  next();
}

function creatorOnly(req, res, next) {
  if (req.user.role !== "Creator") {
    return res.status(403).json({ success: false, error: "Only creators are allowed." });
  }
  next();
}

module.exports = { authMiddleware, supporterOnly, creatorOnly };
