const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { auth, adminOnly } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();
router.use(auth);

const isValidPhone = (phone) => /^\d{10}$/.test(String(phone || ''));

async function genCode() {
  const last = await db.prepare("SELECT code FROM users WHERE code LIKE 'NV%' ORDER BY id DESC LIMIT 1").get();
  if (!last) return 'NV001';
  const num = parseInt(last.code.replace('NV', '')) + 1;
  return 'NV' + String(num).padStart(3, '0');
}

router.get('/', asyncHandler(async (req, res) => {
  const { search } = req.query;
  let sql = "SELECT id, code, name, email, role, phone, address, password_display, created_at FROM users WHERE 1=1";
  const params = [];
  if (search) { sql += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ? OR code LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`); }
  sql += ' ORDER BY id DESC';
  res.json(await db.prepare(sql).all(...params));
}));

router.get('/teachers', asyncHandler(async (req, res) => {
  res.json(await db.prepare("SELECT id, code, name FROM users WHERE role IN ('admin','staff') ORDER BY name").all());
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const u = await db.prepare('SELECT id, code, name, email, role, phone, address, password_display, created_at FROM users WHERE id = ?').get(req.params.id);
  if (!u) return res.status(404).json({ error: 'Không tìm thấy nhân viên' });
  res.json(u);
}));

router.post('/', adminOnly, asyncHandler(async (req, res) => {
  const { name, email, role, phone, address, password } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Vui lòng nhập họ tên và email' });
  const exists = await db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (exists) return res.status(400).json({ error: 'Email đã được sử dụng' });
  if (phone && !isValidPhone(phone)) return res.status(400).json({ error: 'Số điện thoại phải gồm đúng 10 chữ số' });
  if (phone) {
    const existingPhone = await db.prepare('SELECT id FROM users WHERE phone = ?').get(phone);
    if (existingPhone) return res.status(400).json({ error: 'Số điện thoại đã được sử dụng' });
  }
  const code = await genCode();
  const hash = bcrypt.hashSync(password || code, 10);
  const r = await db.prepare('INSERT INTO users (code, name, email, password, role, phone, address, password_display) VALUES (?,?,?,?,?,?,?,?)').run(code, name, email, hash, role || 'staff', phone || null, address || '', password || code);
  res.json({ message: 'Thêm nhân viên thành công', id: r.lastInsertRowid, code });
}));

router.put('/:id', adminOnly, asyncHandler(async (req, res) => {
  const existing = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Không tìm thấy' });
  const { name, email, role, phone, address, password } = req.body;
  if (phone && !isValidPhone(phone)) return res.status(400).json({ error: 'Số điện thoại phải gồm đúng 10 chữ số' });
  if (phone) {
    const existingPhone = await db.prepare('SELECT id FROM users WHERE phone = ? AND id != ?').get(phone, req.params.id);
    if (existingPhone) return res.status(400).json({ error: 'Số điện thoại đã được sử dụng' });
  }
  const nextPassword = password ? bcrypt.hashSync(password, 10) : existing.password;
  await db.prepare('UPDATE users SET name=?, email=?, role=?, phone=?, address=? WHERE id=?').run(
    name ?? existing.name, email ?? existing.email, role ?? existing.role, phone ?? existing.phone, address ?? existing.address, req.params.id
  );
  if (password) {
    await db.prepare('UPDATE users SET password=?, password_display=? WHERE id=?').run(nextPassword, password, req.params.id)
  }
  res.json({ message: 'Cập nhật thành công' });
}));

router.delete('/:id', adminOnly, asyncHandler(async (req, res) => {
  const u = await db.prepare('SELECT role FROM users WHERE id = ?').get(req.params.id);
  if (!u) return res.status(404).json({ error: 'Không tìm thấy' });
  if (u.role === 'admin') return res.status(400).json({ error: 'Không thể xóa admin' });
  await db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ message: 'Xóa thành công' });
}));

module.exports = router;
