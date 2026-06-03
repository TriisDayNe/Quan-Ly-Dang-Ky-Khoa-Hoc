const express = require('express');
const db = require('../db');
const { auth, adminOnly } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();
router.use(auth);

async function genCode() {
  const last = await db.prepare("SELECT code FROM courses ORDER BY id DESC LIMIT 1").get();
  if (!last) return 'KH001';
  const num = parseInt(last.code.replace('KH', '')) + 1;
  return 'KH' + String(num).padStart(3, '0');
}

router.get('/', asyncHandler(async (req, res) => {
  const { search, status } = req.query;
  let sql = 'SELECT * FROM courses WHERE 1=1';
  const params = [];
  if (search) { sql += ' AND (name LIKE ? OR code LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  if (status) { sql += ' AND status = ?'; params.push(status); }
  sql += ' ORDER BY id DESC';
  res.json(await db.prepare(sql).all(...params));
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const course = await db.prepare('SELECT * FROM courses WHERE id = ?').get(req.params.id);
  if (!course) return res.status(404).json({ error: 'Không tìm thấy khóa học' });
  res.json(course);
}));

router.post('/', adminOnly, asyncHandler(async (req, res) => {
  const { name, price, start_date, end_date, duration, description } = req.body;
  if (!name || !price) return res.status(400).json({ error: 'Vui lòng nhập tên và học phí' });
  const code = await genCode();
  const r = await db.prepare('INSERT INTO courses (code, name, description, duration, price, start_date, end_date, status) VALUES (?,?,?,?,?,?,?,?)').run(code, name, description || '', duration || 0, price, start_date || null, end_date || null, 'active');
  res.json({ message: 'Tạo khóa học thành công', id: r.lastInsertRowid, code });
}));

router.put('/:id', adminOnly, asyncHandler(async (req, res) => {
  const existing = await db.prepare('SELECT * FROM courses WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Không tìm thấy khóa học' });
  const { name, price, start_date, end_date, duration, description, status } = req.body;
  await db.prepare('UPDATE courses SET name=?, description=?, duration=?, price=?, start_date=?, end_date=?, status=? WHERE id=?').run(
    name ?? existing.name,
    description ?? existing.description,
    duration ?? existing.duration,
    price ?? existing.price,
    start_date ?? existing.start_date,
    end_date ?? existing.end_date,
    status ?? existing.status,
    req.params.id
  );
  res.json({ message: 'Cập nhật thành công' });
}));

router.delete('/:id', adminOnly, asyncHandler(async (req, res) => {
  const used = await db.prepare('SELECT id FROM classes WHERE course_id = ?').get(req.params.id);
  if (used) return res.status(400).json({ error: 'Khóa học đang có lớp học, không thể xóa' });
  await db.prepare('DELETE FROM courses WHERE id = ?').run(req.params.id);
  res.json({ message: 'Xóa thành công' });
}));

module.exports = router;
