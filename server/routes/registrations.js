const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();
router.use(auth);

const isValidPhone = (phone) => /^0\d{9}$/.test(String(phone || '').trim());

function normalizeClassIds(classIds, fallbackClassId) {
  if (Array.isArray(classIds)) {
    return classIds
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0);
  }
  if (typeof classIds === 'string') {
    return classIds
      .split(',')
      .map((id) => Number(String(id).trim()))
      .filter((id) => Number.isInteger(id) && id > 0);
  }
  if (fallbackClassId !== undefined && fallbackClassId !== null && fallbackClassId !== '') {
    const parsed = Number(fallbackClassId);
    return Number.isInteger(parsed) && parsed > 0 ? [parsed] : [];
  }
  return [];
}

async function genCode() {
  const last = await db.prepare("SELECT code FROM registrations ORDER BY id DESC LIMIT 1").get();
  if (!last) return 'PDK001';
  const num = parseInt(last.code.replace('PDK', '')) + 1;
  return 'PDK' + String(num).padStart(3, '0');
}

router.get('/', asyncHandler(async (req, res) => {
  const { search, status, from, to } = req.query;
  let sql = `SELECT r.*, s.name as student_name, s.code as student_code, s.phone as student_phone,
    c.name as class_name, c.code as class_code, co.name as course_name,
    u.name as employee_name, u.code as employee_code
    FROM registrations r
    JOIN students s ON r.student_id = s.id
    JOIN classes c ON r.class_id = c.id
    LEFT JOIN courses co ON c.course_id = co.id
    LEFT JOIN users u ON r.employee_id = u.id
    WHERE 1=1`;
  const params = [];
  if (search) { sql += ' AND (s.name LIKE ? OR s.code LIKE ? OR r.code LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  if (status) { sql += ' AND r.status = ?'; params.push(status); }
  if (from) { sql += ' AND r.registration_date >= ?'; params.push(from); }
  if (to) { sql += ' AND r.registration_date <= ?'; params.push(to); }
  sql += ' ORDER BY r.id DESC';
  res.json(await db.prepare(sql).all(...params));
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const r = await db.prepare(`SELECT r.*, s.name as student_name, s.code as student_code, s.phone as student_phone, s.email as student_email, s.address as student_address,
    c.name as class_name, c.code as class_code, c.schedule as class_schedule, c.start_date as class_start, c.end_date as class_end,
    co.name as course_name, co.code as course_code,
    u.name as employee_name, u.code as employee_code
    FROM registrations r
    JOIN students s ON r.student_id = s.id
    JOIN classes c ON r.class_id = c.id
    LEFT JOIN courses co ON c.course_id = co.id
    LEFT JOIN users u ON r.employee_id = u.id
    WHERE r.id = ?`).get(req.params.id);
  if (!r) return res.status(404).json({ error: 'Không tìm thấy phiếu đăng ký' });
  r.payments = await db.prepare('SELECT * FROM payments WHERE registration_id = ? ORDER BY payment_date DESC').all(r.id);
  // Parse class_ids and fetch all class details
  if (r.class_ids) {
    const ids = r.class_ids.split(',').map(Number);
    r.all_classes = [];
    for (const cid of ids) {
      const cls = await db.prepare(`SELECT c.*, co.name as course_name, co.price as course_price FROM classes c LEFT JOIN courses co ON c.course_id = co.id WHERE c.id = ?`).get(cid);
      if (cls) r.all_classes.push(cls);
    }
  } else {
    r.all_classes = [{ id: r.class_id, name: r.class_name, course_name: r.course_name }];
  }
  res.json(r);
}));

// POST: auto-calculate total from selected classes, create ONE registration
router.post('/', asyncHandler(async (req, res) => {
  const { student_id, class_ids, class_id, employee_id, registration_date, status } = req.body;
  if (!student_id) return res.status(400).json({ error: 'Vui lòng chọn học viên' });

  const classList = normalizeClassIds(class_ids, class_id);
  if (classList.length === 0) return res.status(400).json({ error: 'Vui lòng chọn ít nhất 1 lớp học' });

  const student = await db.prepare('SELECT id, phone FROM students WHERE id = ?').get(student_id);
  if (!student) return res.status(400).json({ error: 'Học viên không tồn tại' });
  if (!isValidPhone(student.phone)) {
    return res.status(400).json({ error: 'Số điện thoại học viên phải bắt đầu bằng số 0 và gồm đúng 10 chữ số' });
  }
  const duplicateEmployeePhone = await db.prepare('SELECT id FROM users WHERE phone = ?').get(student.phone);
  if (duplicateEmployeePhone) {
    return res.status(400).json({ error: 'Số điện thoại học viên đang trùng với nhân viên, vui lòng cập nhật lại trước khi tạo phiếu đăng ký' });
  }

  // Auto-calculate total from course prices
  let total = 0;
  for (const cid of classList) {
    const cls = await db.prepare(`SELECT co.price FROM classes c JOIN courses co ON c.course_id = co.id WHERE c.id = ?`).get(cid);
    if (cls) total += cls.price;
  }

  const code = await genCode();
  const mainClassId = classList[0];
  const classIdsStr = classList.join(',');

  const r = await db.prepare(`INSERT INTO registrations (code, student_id, class_id, employee_id, registration_date, status, total_amount, discount, final_amount, note, class_ids)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(
    code, student_id, mainClassId, employee_id || null,
    registration_date || new Date().toISOString().slice(0,10),
    status || 'pending', total, 0, total, '', classIdsStr
  );

  // Update current_students for all selected classes
  for (const cid of classList) {
    await db.prepare('UPDATE classes SET current_students = (SELECT COUNT(*) FROM registrations WHERE (class_id = ? OR FIND_IN_SET(?, class_ids) > 0) AND status != ?) WHERE id = ?').run(cid, String(cid), 'cancelled', cid);
  }

  res.json({ message: 'Tạo phiếu đăng ký thành công', id: r.lastInsertRowid, code, total_amount: total });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const existing = await db.prepare('SELECT * FROM registrations WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Không tìm thấy' });
  const { student_id, class_id, class_ids, employee_id, registration_date, status, total_amount } = req.body;

  const nextStudentId = student_id ?? existing.student_id;
  const student = await db.prepare('SELECT id, phone FROM students WHERE id = ?').get(nextStudentId);
  if (!student) return res.status(400).json({ error: 'Học viên không tồn tại' });
  if (!isValidPhone(student.phone)) {
    return res.status(400).json({ error: 'Số điện thoại học viên phải bắt đầu bằng số 0 và gồm đúng 10 chữ số' });
  }
  const duplicateEmployeePhone = await db.prepare('SELECT id FROM users WHERE phone = ?').get(student.phone);
  if (duplicateEmployeePhone) {
    return res.status(400).json({ error: 'Số điện thoại học viên đang trùng với nhân viên, vui lòng cập nhật lại trước khi sửa phiếu đăng ký' });
  }

  const normalizedClassList = normalizeClassIds(class_ids, class_id);
  const nextClassId = normalizedClassList.length > 0 ? normalizedClassList[0] : (class_id ?? existing.class_id);
  const nextClassIds = normalizedClassList.length > 0 ? normalizedClassList.join(',') : (class_ids ?? existing.class_ids);

  await db.prepare(`UPDATE registrations SET student_id=?, class_id=?, employee_id=?, registration_date=?, status=?, total_amount=?, final_amount=?, class_ids=? WHERE id=?`).run(
    nextStudentId, nextClassId, employee_id ?? existing.employee_id,
    registration_date ?? existing.registration_date, status ?? existing.status,
    total_amount ?? existing.total_amount, total_amount ?? existing.total_amount,
    nextClassIds, req.params.id
  );
  res.json({ message: 'Cập nhật thành công' });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  await db.prepare('DELETE FROM payments WHERE registration_id = ?').run(req.params.id);
  await db.prepare('DELETE FROM registrations WHERE id = ?').run(req.params.id);
  res.json({ message: 'Xóa thành công' });
}));

module.exports = router;
