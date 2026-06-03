const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'data.db');

async function seed() {
  const SQL = await initSqlJs();
  let sqlDb;
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    sqlDb = new SQL.Database(buffer);
  } else {
    sqlDb = new SQL.Database();
  }

  const run = (sql, params = []) => {
    const stmt = sqlDb.prepare(sql);
    stmt.bind(params);
    stmt.step();
    stmt.free();
    const r = sqlDb.exec("SELECT last_insert_rowid()");
    return r[0]?.values[0]?.[0];
  };

  const get = (sql, params = []) => {
    const stmt = sqlDb.prepare(sql);
    stmt.bind(params);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return row;
    }
    stmt.free();
    return null;
  };

  console.log('=== Tạo dữ liệu mẫu cho Trung tâm Anh ngữ ===\n');

  // 1. Employees (users)
  console.log('[1/6] Tạo nhân viên...');
  const adminPw = bcrypt.hashSync('admin123', 10);
  const nv1Pw = bcrypt.hashSync('NV001', 10);
  const nv2Pw = bcrypt.hashSync('NV002', 10);
  const nv3Pw = bcrypt.hashSync('NV003', 10);

  if (!get("SELECT id FROM users WHERE email = ?", ['admin@trungtam.com'])) {
    run("INSERT INTO users (code, name, email, password, role, phone, address) VALUES (?,?,?,?,?,?,?)",
      ['ADMIN', 'Quản trị viên', 'admin@trungtam.com', adminPw, 'admin', '0900000000', '123 Nguyễn Huệ, Q1, TP.HCM']);
  }
  if (!get("SELECT id FROM users WHERE email = ?", ['tuan.nguyen@trungtam.com'])) {
    run("INSERT INTO users (code, name, email, password, role, phone, address) VALUES (?,?,?,?,?,?,?)",
      ['NV001', 'Nguyễn Văn Tuấn', 'tuan.nguyen@trungtam.com', nv1Pw, 'staff', '0901111222', '456 Lê Lợi, Q3, TP.HCM']);
  }
  if (!get("SELECT id FROM users WHERE email = ?", ['lan.tran@trungtam.com'])) {
    run("INSERT INTO users (code, name, email, password, role, phone, address) VALUES (?,?,?,?,?,?,?)",
      ['NV002', 'Trần Thị Lan', 'lan.tran@trungtam.com', nv2Pw, 'staff', '0903333444', '789 Điện Biên Phủ, Bình Thạnh, TP.HCM']);
  }
  if (!get("SELECT id FROM users WHERE email = ?", ['minh.pham@trungtam.com'])) {
    run("INSERT INTO users (code, name, email, password, role, phone, address) VALUES (?,?,?,?,?,?,?)",
      ['NV003', 'Phạm Văn Minh', 'minh.pham@trungtam.com', nv3Pw, 'staff', '0905555666', '12 CMT8, Tân Bình, TP.HCM']);
  }
  console.log('  ✓ 4 nhân viên (admin + 3 staff)');

  // 2. Courses
  console.log('[2/6] Tạo khóa học...');
  const courses = [
    { code: 'KH001', name: 'TOEIC Cơ Bản', desc: 'Luyện TOEIC 450-550+', duration: 36, price: 4500000, start: '2026-07-01', end: '2026-09-23' },
    { code: 'KH002', name: 'TOEIC Nâng Cao', desc: 'Luyện TOEIC 650-750+', duration: 48, price: 6500000, start: '2026-07-15', end: '2026-10-29' },
    { code: 'KH003', name: 'IELTS Foundation', desc: 'IELTS 4.0-5.5', duration: 40, price: 8000000, start: '2026-08-01', end: '2026-11-15' },
    { code: 'KH004', name: 'IELTS Advanced', desc: 'IELTS 6.0-7.5', duration: 52, price: 12000000, start: '2026-08-15', end: '2026-12-30' },
    { code: 'KH005', name: 'Tiếng Anh Giao Tiếp', desc: 'Giao tiếp cơ bản - nâng cao', duration: 24, price: 3500000, start: '2026-07-01', end: '2026-09-14' },
    { code: 'KH006', name: 'Tiếng Anh Thiếu Nhi', desc: 'Dành cho bé 6-12 tuổi', duration: 30, price: 3000000, start: '2026-07-01', end: '2026-10-08' },
    { code: 'KH007', name: 'Tiếng Anh Doanh Nghiệp', desc: 'Giao tiếp văn phòng, email, đàm phán', duration: 32, price: 7000000, start: '2026-09-01', end: '2026-12-05' },
  ];
  for (const c of courses) {
    if (!get("SELECT id FROM courses WHERE code = ?", [c.code])) {
      run("INSERT INTO courses (code, name, description, duration, price, start_date, end_date, status) VALUES (?,?,?,?,?,?,?,?)",
        [c.code, c.name, c.desc, c.duration, c.price, c.start, c.end, 'active']);
    }
  }
  console.log('  ✓ 7 khóa học');

  // 3. Students
  console.log('[3/6] Tạo học viên...');
  const students = [
    { name: 'Nguyễn Thị Mai', email: 'mai.nguyen@gmail.com', phone: '0912000111', address: '22 Nguyễn Trãi, Q5, TP.HCM', dob: '2002-03-15', gender: 'female' },
    { name: 'Trần Văn Hùng', email: 'hung.tran@gmail.com', phone: '0912000222', address: '33 Trần Hưng Đạo, Q1, TP.HCM', dob: '2001-08-20', gender: 'male' },
    { name: 'Lê Thị Hương', email: 'huong.le@gmail.com', phone: '0912000333', address: '44 Cách Mạng Tháng 8, Tân Bình', dob: '2003-01-10', gender: 'female' },
    { name: 'Phạm Quang Huy', email: 'huy.pham@gmail.com', phone: '0912000444', address: '55 Lý Tự Trọng, Q1, TP.HCM', dob: '2000-11-25', gender: 'male' },
    { name: 'Võ Thị Kim Anh', email: 'anhk.vo@gmail.com', phone: '0912000555', address: '66 Nguyễn Đình Chiểu, Q3, TP.HCM', dob: '2002-07-05', gender: 'female' },
    { name: 'Đặng Hữu Phúc', email: 'phuc.dang@gmail.com', phone: '0912000666', address: '77 Hai Bà Trưng, Q1, TP.HCM', dob: '2001-04-30', gender: 'male' },
    { name: 'Bùi Thanh Tâm', email: 'tam.bui@gmail.com', phone: '0912000777', address: '88 Phan Đăng Lưu, Phú Nhuận', dob: '2000-09-12', gender: 'female' },
    { name: 'Hồ Minh Nhật', email: 'nhat.ho@gmail.com', phone: '0912000888', address: '99 Nguyễn Văn Cừ, Q5, TP.HCM', dob: '2003-06-18', gender: 'male' },
    { name: 'Trịnh Hoàng Long', email: 'long.trinh@gmail.com', phone: '0912000999', address: '110 Hoàng Văn Thụ, Phú Nhuận', dob: '2002-12-01', gender: 'male' },
    { name: 'Lâm Ngọc Trâm', email: 'tram.lam@gmail.com', phone: '0912001000', address: '121 Nguyễn Thị Minh Khai, Q3', dob: '2001-02-22', gender: 'female' },
    { name: 'Đỗ Quốc Bảo', email: 'bao.do@gmail.com', phone: '0912001111', address: '132 Lê Văn Sỹ, Tân Bình, TP.HCM', dob: '2000-05-15', gender: 'male' },
    { name: 'Huỳnh Kim Ngân', email: 'ngan.huynh@gmail.com', phone: '0912001222', address: '143 Phạm Văn Đồng, Gò Vấp', dob: '2003-10-08', gender: 'female' },
  ];
  for (let i = 0; i < students.length; i++) {
    const s = students[i];
    const code = 'HV' + String(i + 1).padStart(3, '0');
    if (!get("SELECT id FROM students WHERE code = ?", [code])) {
      run("INSERT INTO students (code, name, email, phone, address, date_of_birth, gender) VALUES (?,?,?,?,?,?,?)",
        [code, s.name, s.email, s.phone, s.address, s.dob, s.gender]);
    }
  }
  console.log('  ✓ 12 học viên');

  // 4. Classes
  console.log('[4/6] Tạo lớp học...');
  const classes = [
    { code: 'LH001', course_id: 1, teacher_id: 2, name: 'TOEIC Cơ Bản - Ca Sáng', schedule: 'Thứ 2,4 - 08:00-10:00', room: 'P201', max: 25 },
    { code: 'LH002', course_id: 1, teacher_id: 2, name: 'TOEIC Cơ Bản - Ca Tối', schedule: 'Thứ 3,5 - 18:00-20:00', room: 'P202', max: 25 },
    { code: 'LH003', course_id: 2, teacher_id: 3, name: 'TOEIC Nâng Cao - Ca Sáng', schedule: 'Thứ 2,4,6 - 08:00-10:00', room: 'P301', max: 20 },
    { code: 'LH004', course_id: 2, teacher_id: 3, name: 'TOEIC Nâng Cao - Ca Chiều', schedule: 'Thứ 3,5 - 14:00-16:00', room: 'P302', max: 20 },
    { code: 'LH005', course_id: 3, teacher_id: 4, name: 'IELTS Foundation - Toàn Thời Gian', schedule: 'Thứ 2-5 - 09:00-11:30', room: 'P401', max: 15 },
    { code: 'LH006', course_id: 5, teacher_id: 4, name: 'Giao Tiếp - Cuối Tuần', schedule: 'Thứ 7,CN - 08:00-11:00', room: 'P101', max: 30 },
    { code: 'LH007', course_id: 6, teacher_id: 2, name: 'Thiếu Nhi - Hè 2026', schedule: 'Thứ 2,4,6 - 15:00-17:00', room: 'P102', max: 20 },
    { code: 'LH008', course_id: 4, teacher_id: 3, name: 'IELTS Advanced - Cấp Tốc', schedule: 'Thứ 2-6 - 13:00-16:00', room: 'P402', max: 12 },
    { code: 'LH009', course_id: 7, teacher_id: 4, name: 'Doanh Nghiệp - Sáng', schedule: 'Thứ 3,5 - 08:00-11:00', room: 'P501', max: 20 },
    { code: 'LH010', course_id: 5, teacher_id: 2, name: 'Giao Tiếp - Tối 2-4-6', schedule: 'Thứ 2,4,6 - 19:00-21:00', room: 'P103', max: 25 },
  ];
  for (const c of classes) {
    if (!get("SELECT id FROM classes WHERE code = ?", [c.code])) {
      run("INSERT INTO classes (code, course_id, teacher_id, name, schedule, room, max_students, status) VALUES (?,?,?,?,?,?,?,?)",
        [c.code, c.course_id, c.teacher_id, c.name, c.schedule, c.room, c.max, 'upcoming']);
    }
  }
  console.log('  ✓ 10 lớp học');

  // 5. Registrations
  console.log('[5/6] Tạo phiếu đăng ký...');
  const regs = [
    { code: 'PDK001', student_id: 1, class_id: 1, employee_id: 2, date: '2026-06-15', status: 'success', total: 4500000, class_ids: '1' },
    { code: 'PDK002', student_id: 2, class_id: 1, employee_id: 2, date: '2026-06-16', status: 'success', total: 4500000, class_ids: '1' },
    { code: 'PDK003', student_id: 3, class_id: 3, employee_id: 3, date: '2026-06-17', status: 'success', total: 6500000, class_ids: '3' },
    { code: 'PDK004', student_id: 4, class_id: 5, employee_id: 4, date: '2026-06-18', status: 'success', total: 8000000, class_ids: '5' },
    { code: 'PDK005', student_id: 5, class_id: 6, employee_id: 2, date: '2026-06-19', status: 'success', total: 3500000, class_ids: '6' },
    { code: 'PDK006', student_id: 6, class_id: 2, employee_id: 2, date: '2026-06-20', status: 'pending', total: 4500000, class_ids: '2' },
    { code: 'PDK007', student_id: 7, class_id: 7, employee_id: 3, date: '2026-06-21', status: 'success', total: 3000000, class_ids: '7' },
    { code: 'PDK008', student_id: 8, class_id: 8, employee_id: 4, date: '2026-06-22', status: 'success', total: 12000000, class_ids: '8' },
    { code: 'PDK009', student_id: 9, class_id: 4, employee_id: 3, date: '2026-06-23', status: 'pending', total: 6500000, class_ids: '4' },
    { code: 'PDK010', student_id: 10, class_id: 9, employee_id: 4, date: '2026-06-24', status: 'success', total: 7000000, class_ids: '9' },
    { code: 'PDK011', student_id: 11, class_id: 10, employee_id: 2, date: '2026-06-25', status: 'pending', total: 3500000, class_ids: '10' },
    { code: 'PDK012', student_id: 12, class_id: 6, employee_id: 3, date: '2026-06-26', status: 'success', total: 3500000, class_ids: '6' },
    // Multi-class registrations
    { code: 'PDK013', student_id: 1, class_id: 5, employee_id: 2, date: '2026-06-20', status: 'success', total: 11500000, class_ids: '1,5' },
    { code: 'PDK014', student_id: 4, class_id: 3, employee_id: 4, date: '2026-06-22', status: 'success', total: 14500000, class_ids: '3,5' },
    { code: 'PDK015', student_id: 8, class_id: 1, employee_id: 2, date: '2026-06-25', status: 'pending', total: 17000000, class_ids: '1,5,7' },
  ];
  for (const r of regs) {
    if (!get("SELECT id FROM registrations WHERE code = ?", [r.code])) {
      run("INSERT INTO registrations (code, student_id, class_id, employee_id, registration_date, status, total_amount, discount, final_amount, note, class_ids) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        [r.code, r.student_id, r.class_id, r.employee_id, r.date, r.status, r.total, 0, r.total, '', r.class_ids]);
    }
  }
  // Update class current_students
  for (let cid = 1; cid <= 10; cid++) {
    const count = get("SELECT COUNT(*) as c FROM registrations WHERE (class_id = ? OR class_ids LIKE ?) AND status != 'cancelled'", [cid, `%${cid}%`]);
    if (count) {
      run("UPDATE classes SET current_students = ? WHERE id = ?", [count.c, cid]);
    }
  }
  console.log('  ✓ 15 phiếu đăng ký (3 phiếu đa lớp)');

  // 6. Payments
  console.log('[6/6] Tạo phiếu thu...');
  const payments = [
    { receipt: 'PT2606001', reg_id: 1, student_id: 1, emp_id: 2, amount: 4500000, date: '2026-06-20' },
    { receipt: 'PT2606002', reg_id: 2, student_id: 2, emp_id: 2, amount: 4500000, date: '2026-06-21' },
    { receipt: 'PT2606003', reg_id: 3, student_id: 3, emp_id: 3, amount: 6500000, date: '2026-06-22' },
    { receipt: 'PT2606004', reg_id: 4, student_id: 4, emp_id: 4, amount: 8000000, date: '2026-06-23' },
    { receipt: 'PT2606005', reg_id: 5, student_id: 5, emp_id: 2, amount: 3500000, date: '2026-06-24' },
    { receipt: 'PT2606006', reg_id: 7, student_id: 7, emp_id: 3, amount: 3000000, date: '2026-06-25' },
    { receipt: 'PT2606007', reg_id: 8, student_id: 8, emp_id: 4, amount: 5000000, date: '2026-06-26' },
    { receipt: 'PT2606008', reg_id: 8, student_id: 8, emp_id: 4, amount: 7000000, date: '2026-06-28' },
    { receipt: 'PT2606009', reg_id: 10, student_id: 10, emp_id: 4, amount: 7000000, date: '2026-06-27' },
    { receipt: 'PT2606010', reg_id: 12, student_id: 12, emp_id: 3, amount: 3500000, date: '2026-06-28' },
    { receipt: 'PT2606011', reg_id: 13, student_id: 1, emp_id: 2, amount: 11500000, date: '2026-06-25' },
    { receipt: 'PT2606012', reg_id: 14, student_id: 4, emp_id: 4, amount: 14500000, date: '2026-06-27' },
  ];
  for (const p of payments) {
    if (!get("SELECT id FROM payments WHERE receipt_number = ?", [p.receipt])) {
      run("INSERT INTO payments (receipt_number, registration_id, student_id, employee_id, amount, payment_date, payment_method, payer_name, note) VALUES (?,?,?,?,?,?,?,?,?)",
        [p.receipt, p.reg_id, p.student_id, p.emp_id, p.amount, p.date, 'cash', '', '']);
    }
  }
  console.log('  ✓ 12 phiếu thu');

  // Save database
  const data = sqlDb.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
  sqlDb.close();

  console.log('\n=== Tạo dữ liệu mẫu thành công! ===');
  console.log(`Database: ${DB_PATH}`);
  console.log('\nTài khoản đăng nhập:');
  console.log('  Admin    : admin@trungtam.com / admin123');
  console.log('  Nhân viên: tuan.nguyen@trungtam.com / NV001');
  console.log('  Nhân viên: lan.tran@trungtam.com / NV002');
  console.log('  Nhân viên: minh.pham@trungtam.com / NV003');
  console.log('\nTổng quan dữ liệu:');
  console.log('  - 4 nhân viên (1 admin + 3 staff)');
  console.log('  - 7 khóa học');
  console.log('  - 12 học viên');
  console.log('  - 10 lớp học');
  console.log('  - 15 phiếu đăng ký (3 phiếu đa lớp)');
  console.log('  - 12 phiếu thu');
  console.log('  - Tổng doanh thu: ~70,500,000 VNĐ');
}

seed().catch(err => {
  console.error('Lỗi khi tạo dữ liệu mẫu:', err);
  process.exit(1);
});
