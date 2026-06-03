const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();
router.use(auth);

// Revenue chart data (by day/month/quarter/year)
router.get('/revenue', asyncHandler(async (req, res) => {
  const { period = 'month', year, from, to } = req.query;

  let dateFormat;
  let groupBy;
  switch (period) {
    case 'day': dateFormat = '%Y-%m-%d'; groupBy = "DATE_FORMAT(p.payment_date, '%Y-%m-%d')"; break;
    case 'quarter': dateFormat = '%Y-Q'; groupBy = "CONCAT(DATE_FORMAT(p.payment_date, '%Y'), '-Q', QUARTER(p.payment_date))"; break;
    case 'year': dateFormat = '%Y'; groupBy = "DATE_FORMAT(p.payment_date, '%Y')"; break;
    default: dateFormat = '%Y-%m'; groupBy = "DATE_FORMAT(p.payment_date, '%Y-%m')"; break; // month
  }

  let sql = `SELECT ${groupBy} as label, SUM(p.amount) as revenue, COUNT(DISTINCT p.registration_id) as total_registrations, COUNT(p.id) as total_payments
    FROM payments p
    WHERE 1=1`;
  const params = [];

  if (from && to) {
    sql += ' AND p.payment_date >= ? AND p.payment_date <= ?';
    params.push(from, to);
  } else if (year) {
    sql += " AND DATE_FORMAT(p.payment_date, '%Y') = ?";
    params.push(String(year));
  }

  sql += ` GROUP BY ${groupBy} ORDER BY label`;

  res.json(await db.prepare(sql).all(...params));
}));

// Recent registrations
router.get('/recent-registrations', asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const data = await db.prepare(`SELECT r.*, s.name as student_name, s.code as student_code,
    c.name as class_name, co.name as course_name
    FROM registrations r
    JOIN students s ON r.student_id = s.id
    JOIN classes c ON r.class_id = c.id
    LEFT JOIN courses co ON c.course_id = co.id
    ORDER BY r.id DESC LIMIT ?`).all(limit);
  res.json(data);
}));

// Summary counts
router.get('/summary', asyncHandler(async (req, res) => {
  const totalStudents = (await db.prepare('SELECT COUNT(*) as count FROM students').get()).count;
  const totalCourses = (await db.prepare('SELECT COUNT(*) as count FROM courses WHERE status = ?').get('active')).count;
  const totalClasses = (await db.prepare('SELECT COUNT(*) as count FROM classes WHERE status IN (?,?)').get('upcoming', 'ongoing')).count;
  const totalRevenue = (await db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM payments').get()).total;
  const pendingRegs = (await db.prepare("SELECT COUNT(*) as count FROM registrations WHERE status = ?").get('pending')).count;
  const todayRevenue = (await db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE payment_date = ?").get(new Date().toISOString().slice(0,10))).total;

  res.json({
    totalStudents,
    totalCourses,
    totalClasses,
    totalRevenue,
    pendingRegs,
    todayRevenue
  });
}));

module.exports = router;
