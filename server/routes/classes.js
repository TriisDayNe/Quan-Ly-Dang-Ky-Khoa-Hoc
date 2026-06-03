const express = require('express');
const db = require('../db');
const { auth, adminOnly } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();
router.use(auth);

async function genCode() {
  const last = await db.prepare("SELECT code FROM classes ORDER BY id DESC LIMIT 1").get();
  if (!last) return 'LH001';
  const num = parseInt(last.code.replace('LH', '')) + 1;
  return 'LH' + String(num).padStart(3, '0');
}

router.get('/', asyncHandler(async (req, res) => {
  const { search, course_id, status } = req.query;
  let sql = `SELECT c.*, co.name as course_name, co.code as course_code, co.price as course_price, u.name as teacher_name
    FROM classes c
    LEFT JOIN courses co ON c.course_id = co.id
    LEFT JOIN users u ON c.teacher_id = u.id
    WHERE 1=1`;
  const params = [];
  if (search) { sql += ' AND (c.name LIKE ? OR c.code LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  if (course_id) { sql += ' AND c.course_id = ?'; params.push(course_id); }
  if (status) { sql += ' AND c.status = ?'; params.push(status); }
  sql += ' ORDER BY c.id DESC';
  res.json(await db.prepare(sql).all(...params));
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const c = await db.prepare(`SELECT c.*, co.name as course_name, u.name as teacher_name
    FROM classes c LEFT JOIN courses co ON c.course_id = co.id LEFT JOIN users u ON c.teacher_id = u.id WHERE c.id = ?`).get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Không tìm thấy lớp học' });
  res.json(c);
}));

router.post('/', adminOnly, asyncHandler(async (req, res) => {
  const { course_id, teacher_id, name, schedule, room, max_students, status } = req.body;
  if (!course_id || !name) return res.status(400).json({ error: 'Vui lòng chọn khóa học và nhập tên lớp' });
  const code = await genCode();
  const r = await db.prepare(`INSERT INTO classes (code, course_id, teacher_id, name, schedule, room, max_students, status)
    VALUES (?,?,?,?,?,?,?,?)`).run(code, course_id, teacher_id || null, name, schedule || '', room || '', max_students || 20, status || 'upcoming');
  res.json({ message: 'Tạo lớp học thành công', id: r.lastInsertRowid, code });
}));

router.put('/:id', adminOnly, asyncHandler(async (req, res) => {
  const existing = await db.prepare('SELECT * FROM classes WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Không tìm thấy lớp học' });
  const { course_id, teacher_id, name, schedule, room, max_students, status } = req.body;
  await db.prepare(`UPDATE classes SET course_id=?, teacher_id=?, name=?, schedule=?, room=?, max_students=?, status=? WHERE id=?`).run(
    course_id ?? existing.course_id,
    teacher_id ?? existing.teacher_id,
    name ?? existing.name,
    schedule ?? existing.schedule,
    room ?? existing.room,
    max_students ?? existing.max_students,
    status ?? existing.status,
    req.params.id
  );
  res.json({ message: 'Cập nhật thành công' });
}));

router.delete('/:id', adminOnly, asyncHandler(async (req, res) => {
  const used = await db.prepare('SELECT id FROM registrations WHERE class_id = ?').get(req.params.id);
  if (used) return res.status(400).json({ error: 'Lớp học đã có học viên đăng ký, không thể xóa' });
  await db.prepare('DELETE FROM classes WHERE id = ?').run(req.params.id);
  res.json({ message: 'Xóa thành công' });
}));

module.exports = router;
