const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();
router.use(auth);

function genCode() {
  const last = db.prepare("SELECT code FROM students ORDER BY id DESC LIMIT 1").get();
  if (!last) return 'HV001';
  const num = parseInt(last.code.replace('HV', '')) + 1;
  return 'HV' + String(num).padStart(3, '0');
}

router.get('/', (req, res) => {
  const { search } = req.query;
  let sql = 'SELECT * FROM students WHERE 1=1';
  const params = [];
  if (search) { sql += ' AND (name LIKE ? OR code LIKE ? OR phone LIKE ? OR email LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`); }
  sql += ' ORDER BY id DESC';
  res.json(db.prepare(sql).all(...params));
});

router.get('/:id', (req, res) => {
  const s = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id);
  if (!s) return res.status(404).json({ error: 'Không tìm thấy học viên' });
  res.json(s);
});

router.post('/', (req, res) => {
  const { name, email, phone, address, date_of_birth, gender } = req.body;
  if (!name) return res.status(400).json({ error: 'Vui lòng nhập tên học viên' });
  const code = genCode();
  const r = db.prepare('INSERT INTO students (code, name, email, phone, address, date_of_birth, gender) VALUES (?,?,?,?,?,?,?)').run(code, name, email || '', phone || '', address || '', date_of_birth || null, gender || 'male');
  res.json({ message: 'Thêm học viên thành công', id: r.lastInsertRowid, code });
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Không tìm thấy học viên' });
  const { name, email, phone, address, date_of_birth, gender } = req.body;
  db.prepare('UPDATE students SET name=?, email=?, phone=?, address=?, date_of_birth=?, gender=? WHERE id=?').run(
    name ?? existing.name, email ?? existing.email, phone ?? existing.phone, address ?? existing.address,
    date_of_birth ?? existing.date_of_birth, gender ?? existing.gender, req.params.id
  );
  res.json({ message: 'Cập nhật thành công' });
});

router.delete('/:id', (req, res) => {
  const used = db.prepare('SELECT id FROM registrations WHERE student_id = ?').get(req.params.id);
  if (used) return res.status(400).json({ error: 'Học viên đã có phiếu đăng ký, không thể xóa' });
  db.prepare('DELETE FROM students WHERE id = ?').run(req.params.id);
  res.json({ message: 'Xóa thành công' });
});

module.exports = router;
