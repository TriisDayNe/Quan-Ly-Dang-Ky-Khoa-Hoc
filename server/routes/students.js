const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();
router.use(auth);

const isValidPhone = (phone) => /^0\d{9}$/.test(String(phone || '').trim());

async function genCode() {
  const last = await db.prepare("SELECT code FROM students ORDER BY id DESC LIMIT 1").get();
  if (!last) return 'HV001';
  const num = parseInt(last.code.replace('HV', '')) + 1;
  return 'HV' + String(num).padStart(3, '0');
}

router.get('/', asyncHandler(async (req, res) => {
  const { search } = req.query;
  let sql = 'SELECT * FROM students WHERE 1=1';
  const params = [];
  if (search) { sql += ' AND (name LIKE ? OR code LIKE ? OR phone LIKE ? OR email LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`); }
  sql += ' ORDER BY id DESC';
  res.json(await db.prepare(sql).all(...params));
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const s = await db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id);
  if (!s) return res.status(404).json({ error: 'Không tìm thấy học viên' });
  res.json(s);
}));

router.post('/', asyncHandler(async (req, res) => {
  const { name, email, phone, address, date_of_birth, gender } = req.body;
  if (!name) return res.status(400).json({ error: 'Vui lòng nhập tên học viên' });
  if (!isValidPhone(phone)) return res.status(400).json({ error: 'Số điện thoại phải bắt đầu bằng số 0 và gồm đúng 10 chữ số' });
  const existingStudentPhone = await db.prepare('SELECT id FROM students WHERE phone = ?').get(phone);
  if (existingStudentPhone) return res.status(400).json({ error: 'Số điện thoại học viên đã tồn tại' });
  const existingEmployeePhone = await db.prepare('SELECT id FROM users WHERE phone = ?').get(phone);
  if (existingEmployeePhone) return res.status(400).json({ error: 'Số điện thoại đã trùng với nhân viên' });
  const code = await genCode();
  const r = await db.prepare('INSERT INTO students (code, name, email, phone, address, date_of_birth, gender) VALUES (?,?,?,?,?,?,?)').run(code, name, email || '', phone, address || '', date_of_birth || null, gender || 'male');
  res.json({ message: 'Thêm học viên thành công', id: r.lastInsertRowid, code });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const existing = await db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Không tìm thấy học viên' });
  const { name, email, phone, address, date_of_birth, gender } = req.body;
  const nextPhone = (phone ?? existing.phone);
  if (!isValidPhone(nextPhone)) return res.status(400).json({ error: 'Số điện thoại phải bắt đầu bằng số 0 và gồm đúng 10 chữ số' });
  const duplicateStudentPhone = await db.prepare('SELECT id FROM students WHERE phone = ? AND id != ?').get(nextPhone, req.params.id);
  if (duplicateStudentPhone) return res.status(400).json({ error: 'Số điện thoại học viên đã tồn tại' });
  const duplicateEmployeePhone = await db.prepare('SELECT id FROM users WHERE phone = ?').get(nextPhone);
  if (duplicateEmployeePhone) return res.status(400).json({ error: 'Số điện thoại đã trùng với nhân viên' });
  await db.prepare('UPDATE students SET name=?, email=?, phone=?, address=?, date_of_birth=?, gender=? WHERE id=?').run(
    name ?? existing.name, email ?? existing.email, nextPhone, address ?? existing.address,
    date_of_birth ?? existing.date_of_birth, gender ?? existing.gender, req.params.id
  );
  res.json({ message: 'Cập nhật thành công' });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const used = await db.prepare('SELECT id FROM registrations WHERE student_id = ?').get(req.params.id);
  if (used) return res.status(400).json({ error: 'Học viên đã có phiếu đăng ký, không thể xóa' });
  await db.prepare('DELETE FROM students WHERE id = ?').run(req.params.id);
  res.json({ message: 'Xóa thành công' });
}));

module.exports = router;
