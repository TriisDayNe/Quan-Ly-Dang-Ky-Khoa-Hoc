const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();
router.use(auth);

async function genReceiptNumber() {
  const now = new Date();
  const prefix = 'PT' + now.getFullYear().toString().slice(2) + String(now.getMonth() + 1).padStart(2, '0');
  const last = await db.prepare("SELECT receipt_number FROM payments WHERE receipt_number LIKE ? ORDER BY id DESC LIMIT 1").get(prefix + '%');
  if (!last) return prefix + '001';
  const num = parseInt(last.receipt_number.slice(-3)) + 1;
  return prefix + String(num).padStart(3, '0');
}

router.get('/', asyncHandler(async (req, res) => {
  const { search, from, to, method } = req.query;
  let sql = `SELECT p.*, s.name as student_name, s.code as student_code,
    r.code as registration_code, c.name as class_name, co.name as course_name,
    u.name as employee_name, u.code as employee_code
    FROM payments p
    JOIN students s ON p.student_id = s.id
    JOIN registrations r ON p.registration_id = r.id
    JOIN classes c ON r.class_id = c.id
    LEFT JOIN courses co ON c.course_id = co.id
    LEFT JOIN users u ON p.employee_id = u.id
    WHERE 1=1`;
  const params = [];
  if (search) { sql += ' AND (p.receipt_number LIKE ? OR s.name LIKE ? OR s.code LIKE ? OR r.code LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`); }
  if (from) { sql += ' AND p.payment_date >= ?'; params.push(from); }
  if (to) { sql += ' AND p.payment_date <= ?'; params.push(to); }
  if (method) { sql += ' AND p.payment_method = ?'; params.push(method); }
  sql += ' ORDER BY p.id DESC';
  res.json(await db.prepare(sql).all(...params));
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const p = await db.prepare(`SELECT p.*, s.name as student_name, s.code as student_code, s.phone as student_phone, s.email as student_email,
    r.code as registration_code, r.total_amount as reg_total, r.discount as reg_discount, r.final_amount as reg_final,
    c.name as class_name, co.name as course_name,
    u.name as employee_name, u.code as employee_code
    FROM payments p
    JOIN students s ON p.student_id = s.id
    JOIN registrations r ON p.registration_id = r.id
    JOIN classes c ON r.class_id = c.id
    LEFT JOIN courses co ON c.course_id = co.id
    LEFT JOIN users u ON p.employee_id = u.id
    WHERE p.id = ?`).get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Không tìm thấy phiếu thu' });
  res.json(p);
}));

router.post('/', asyncHandler(async (req, res) => {
  const { registration_id, student_id, employee_id, amount, payment_date, payment_method, payer_name, note } = req.body;
  if (!registration_id || !student_id || !amount) return res.status(400).json({ error: 'Vui lòng nhập đầy đủ thông tin' });
  const receipt_number = await genReceiptNumber();
  const r = await db.prepare(`INSERT INTO payments (receipt_number, registration_id, student_id, employee_id, amount, payment_date, payment_method, payer_name, note)
    VALUES (?,?,?,?,?,?,?,?,?)`).run(receipt_number, registration_id, student_id, employee_id || null, amount, payment_date || new Date().toISOString().slice(0,10), payment_method || 'cash', payer_name || '', note || '');
  res.json({ message: 'Tạo phiếu thu thành công', id: r.lastInsertRowid, receipt_number });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const existing = await db.prepare('SELECT * FROM payments WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Không tìm thấy' });
  const { amount, payment_date, employee_id } = req.body;
  await db.prepare('UPDATE payments SET amount=?, payment_date=?, employee_id=? WHERE id=?').run(
    amount ?? existing.amount, payment_date ?? existing.payment_date, employee_id ?? existing.employee_id, req.params.id
  );
  res.json({ message: 'Cập nhật thành công' });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  await db.prepare('DELETE FROM payments WHERE id = ?').run(req.params.id);
  res.json({ message: 'Xóa thành công' });
}));

module.exports = router;
