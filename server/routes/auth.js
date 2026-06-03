const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { JWT_SECRET } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Vui lòng nhập email và mật khẩu' });

  const user = await db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
  }

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone } });
}));

router.post('/register', asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Vui lòng nhập đầy đủ thông tin' });

  const existing = await db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(400).json({ error: 'Email đã được sử dụng' });

  const hash = bcrypt.hashSync(password, 10);
  const result = await db.prepare('INSERT INTO users (name, email, password, role, phone) VALUES (?, ?, ?, ?, ?)').run(name, email, hash, 'staff', phone || '');
  res.json({ message: 'Đăng ký thành công', id: result.lastInsertRowid });
}));

router.get('/me', asyncHandler(async (req, res) => {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'Vui lòng đăng nhập' });
  try {
    const user = jwt.verify(header.split(' ')[1], JWT_SECRET);
    const dbUser = await db.prepare('SELECT id, name, email, role, phone, address FROM users WHERE id = ?').get(user.id);
    res.json(dbUser);
  } catch {
    res.status(401).json({ error: 'Token không hợp lệ' });
  }
}));

module.exports = router;
