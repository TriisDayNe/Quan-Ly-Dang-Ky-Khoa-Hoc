const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();
router.use(auth);

function genCode() {
  const last = db.prepare("SELECT code FROM users WHERE code LIKE 'NV%' ORDER BY id DESC LIMIT 1").get();
  if (!last) return 'NV001';
  const num = parseInt(last.code.replace('NV', '')) + 1;
  return 'NV' + String(num).padStart(3, '0');
}

router.get('/', (req, res) => {
  const { search } = req.query;
  let sql = "SELECT id, code, name, email, role, phone, address, created_at FROM users WHERE 1=1";
  const params = [];
  if (search) { sql += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ? OR code LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`); }
  sql += ' ORDER BY id DESC';
  res.json(db.prepare(sql).all(...params));
});

router.get('/teachers', (req, res) => {
  res.json(db.prepare("SELECT id, code, name FROM users WHERE role IN ('admin','staff') ORDER BY name").all());
});

router.get('/:id', (req, res) => {
  const u = db.prepare('SELECT id, code, name, email, role, phone, address, created_at FROM users WHERE id = ?').get(req.params.id);
  if (!u) return res.status(404).json({ error: 'Không tìm thấy nhân viên' });
  res.json(u);
});

router.post('/', adminOnly, (req, res) => {
  const { name, email, role, phone, address } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Vui lòng nhập họ tên và email' });
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (exists) return res.status(400).json({ error: 'Email đã được sử dụng' });
  const code = genCode();
  const hash = bcrypt.hashSync(code, 10); // password = code
  const r = db.prepare('INSERT INTO users (code, name, email, password, role, phone, address) VALUES (?,?,?,?,?,?,?)').run(code, name, email, hash, role || 'staff', phone || '', address || '');
  res.json({ message: 'Thêm nhân viên thành công', id: r.lastInsertRowid, code });
});

router.put('/:id', adminOnly, (req, res) => {
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Không tìm thấy' });
  const { name, email, role, phone, address } = req.body;
  db.prepare('UPDATE users SET name=?, email=?, role=?, phone=?, address=? WHERE id=?').run(
    name ?? existing.name, email ?? existing.email, role ?? existing.role, phone ?? existing.phone, address ?? existing.address, req.params.id
  );
  res.json({ message: 'Cập nhật thành công' });
});

router.delete('/:id', adminOnly, (req, res) => {
  const u = db.prepare('SELECT role FROM users WHERE id = ?').get(req.params.id);
  if (!u) return res.status(404).json({ error: 'Không tìm thấy' });
  if (u.role === 'admin') return res.status(400).json({ error: 'Không thể xóa admin' });
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ message: 'Xóa thành công' });
});

module.exports = router;
