const express = require("express");
const router = express.Router();

// POST /api/auth/register
router.post("/register", (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: "All fields are required" });
  }
  // Mock registration - return a fake token
  res.status(201).json({
    success: true,
    data: {
      user: {
        _id: "user_" + Date.now(),
        name,
        email,
        credits: 500,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=7c3aed&color=fff`,
      },
      token: "mock_jwt_token_" + Date.now(),
    },
  });
});

// POST /api/auth/login
router.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: "All fields are required" });
  }
  // Mock login
  res.json({
    success: true,
    data: {
      user: {
        _id: "user_001",
        name: "John Doe",
        email,
        credits: 1250,
        avatar: "https://ui-avatars.com/api/?name=John+Doe&background=7c3aed&color=fff",
      },
      token: "mock_jwt_token_login_" + Date.now(),
    },
  });
});

module.exports = router;
