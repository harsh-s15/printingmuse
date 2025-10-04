// middleware/authMiddleware.js


export function isAuthenticated(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.status(401).json({ msg: "Unauthorized. Please log in." });
}
