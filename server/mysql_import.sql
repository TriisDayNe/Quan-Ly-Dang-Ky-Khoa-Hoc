SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS=0;

DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS registrations;
DROP TABLE IF EXISTS classes;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'staff',
  phone VARCHAR(20) NOT NULL UNIQUE,
  address VARCHAR(255),
  password_display VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  phone VARCHAR(20) NOT NULL UNIQUE,
  address VARCHAR(255),
  date_of_birth DATE,
  gender VARCHAR(10) DEFAULT 'male',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TRIGGER IF EXISTS trg_users_phone_before_insert;
DROP TRIGGER IF EXISTS trg_users_phone_before_update;
DROP TRIGGER IF EXISTS trg_students_phone_before_insert;
DROP TRIGGER IF EXISTS trg_students_phone_before_update;

DELIMITER $$
CREATE TRIGGER trg_users_phone_before_insert
BEFORE INSERT ON users
FOR EACH ROW
BEGIN
  SET NEW.phone = TRIM(NEW.phone);
  IF NEW.phone IS NULL OR NEW.phone = '' OR NEW.phone NOT REGEXP '^0[0-9]{9}$' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Số điện thoại nhân viên phải bắt đầu bằng số 0 và gồm đúng 10 chữ số';
  END IF;
  IF EXISTS (SELECT 1 FROM students WHERE phone = NEW.phone) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Số điện thoại đã tồn tại ở học viên';
  END IF;
END$$

CREATE TRIGGER trg_users_phone_before_update
BEFORE UPDATE ON users
FOR EACH ROW
BEGIN
  SET NEW.phone = TRIM(NEW.phone);
  IF NEW.phone IS NULL OR NEW.phone = '' OR NEW.phone NOT REGEXP '^0[0-9]{9}$' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Số điện thoại nhân viên phải bắt đầu bằng số 0 và gồm đúng 10 chữ số';
  END IF;
  IF EXISTS (SELECT 1 FROM students WHERE phone = NEW.phone) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Số điện thoại đã tồn tại ở học viên';
  END IF;
END$$

CREATE TRIGGER trg_students_phone_before_insert
BEFORE INSERT ON students
FOR EACH ROW
BEGIN
  SET NEW.phone = TRIM(NEW.phone);
  IF NEW.phone IS NULL OR NEW.phone = '' OR NEW.phone NOT REGEXP '^0[0-9]{9}$' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Số điện thoại học viên phải bắt đầu bằng số 0 và gồm đúng 10 chữ số';
  END IF;
  IF EXISTS (SELECT 1 FROM users WHERE phone = NEW.phone) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Số điện thoại đã tồn tại ở nhân viên';
  END IF;
END$$

CREATE TRIGGER trg_students_phone_before_update
BEFORE UPDATE ON students
FOR EACH ROW
BEGIN
  SET NEW.phone = TRIM(NEW.phone);
  IF NEW.phone IS NULL OR NEW.phone = '' OR NEW.phone NOT REGEXP '^0[0-9]{9}$' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Số điện thoại học viên phải bắt đầu bằng số 0 và gồm đúng 10 chữ số';
  END IF;
  IF EXISTS (SELECT 1 FROM users WHERE phone = NEW.phone) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Số điện thoại đã tồn tại ở nhân viên';
  END IF;
END$$
DELIMITER ;

CREATE TABLE courses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  duration INT,
  price DECIMAL(15,2) NOT NULL,
  start_date DATE,
  end_date DATE,
  status VARCHAR(20) DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE classes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  course_id INT NOT NULL,
  teacher_id INT,
  name VARCHAR(150) NOT NULL,
  start_date DATE,
  end_date DATE,
  schedule VARCHAR(100),
  room VARCHAR(20),
  max_students INT DEFAULT 20,
  current_students INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'upcoming',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_classes_course FOREIGN KEY (course_id) REFERENCES courses(id),
  CONSTRAINT fk_classes_teacher FOREIGN KEY (teacher_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE registrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  student_id INT NOT NULL,
  class_id INT NOT NULL,
  employee_id INT,
  registration_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  total_amount DECIMAL(15,2) NOT NULL,
  discount DECIMAL(15,2) DEFAULT 0,
  final_amount DECIMAL(15,2) NOT NULL,
  note TEXT,
  class_ids VARCHAR(50),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_regs_student FOREIGN KEY (student_id) REFERENCES students(id),
  CONSTRAINT fk_regs_class FOREIGN KEY (class_id) REFERENCES classes(id),
  CONSTRAINT fk_regs_employee FOREIGN KEY (employee_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  receipt_number VARCHAR(20) NOT NULL UNIQUE,
  registration_id INT NOT NULL,
  student_id INT NOT NULL,
  employee_id INT,
  amount DECIMAL(15,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method VARCHAR(20) DEFAULT 'cash',
  payer_name VARCHAR(100),
  note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_payments_registration FOREIGN KEY (registration_id) REFERENCES registrations(id),
  CONSTRAINT fk_payments_student FOREIGN KEY (student_id) REFERENCES students(id),
  CONSTRAINT fk_payments_employee FOREIGN KEY (employee_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO users (id, code, name, email, password, role, phone, address, password_display) VALUES
(1, 'ADMIN', 'Quản trị viên', 'admin@trungtam.com', '$2a$11$0s0fwdlrtRp86kDOdAMGMObZ1wswdovpGKY9qYkvXIibwI5l2gFEW', 'admin', '0900000000', '123 Nguyễn Huệ, Q1, TP.HCM', 'admin123'),
(2, 'NV001', 'Nguyễn Văn Tuấn', 'tuan.nguyen@trungtam.com', '$2a$11$GkLTlMkgg5wEn3mAb2UHKuQ41WoQriY7x7V0bfZ/UJ3kCL.jIQoxO', 'staff', '0901111222', '456 Lê Lợi, Q3, TP.HCM', 'NV001'),
(3, 'NV002', 'Trần Thị Lan', 'lan.tran@trungtam.com', '$2a$11$nHj7jy1kkJEqUqCvu.MPLOdeAniihGbKbVNJnvpGbJO/YADRl35a6', 'staff', '0903333444', '789 Điện Biên Phủ, Bình Thạnh, TP.HCM', 'NV002'),
(4, 'NV003', 'Phạm Văn Minh', 'minh.pham@trungtam.com', '$2a$11$emF.wdEmsD71xWww6nez2OyVcMXIYHrI35XTmFisMhlLzUlnuUecC', 'staff', '0905555666', '12 CMT8, Tân Bình, TP.HCM', 'NV003');

INSERT INTO courses (id, code, name, description, duration, price, start_date, end_date, status) VALUES
(1, 'KH001', 'TOEIC Cơ Bản', 'Luyện TOEIC 450-550+', 36, 4500000, '2026-07-01', '2026-09-23', 'active'),
(2, 'KH002', 'TOEIC Nâng Cao', 'Luyện TOEIC 650-750+', 48, 6500000, '2026-07-15', '2026-10-29', 'active'),
(3, 'KH003', 'IELTS Foundation', 'IELTS 4.0-5.5', 40, 8000000, '2026-08-01', '2026-11-15', 'active'),
(4, 'KH004', 'IELTS Advanced', 'IELTS 6.0-7.5', 52, 12000000, '2026-08-15', '2026-12-30', 'active'),
(5, 'KH005', 'Tiếng Anh Giao Tiếp', 'Giao tiếp cơ bản - nâng cao', 24, 3500000, '2026-07-01', '2026-09-14', 'active'),
(6, 'KH006', 'Tiếng Anh Thiếu Nhi', 'Dành cho bé 6-12 tuổi', 30, 3000000, '2026-07-01', '2026-10-08', 'active'),
(7, 'KH007', 'Tiếng Anh Doanh Nghiệp', 'Giao tiếp văn phòng, email, đàm phán', 32, 7000000, '2026-09-01', '2026-12-05', 'active');

INSERT INTO students (id, code, name, email, phone, address, date_of_birth, gender) VALUES
(1, 'HV001', 'Nguyễn Thị Mai', 'mai.nguyen@gmail.com', '0912000111', '22 Nguyễn Trãi, Q5, TP.HCM', '2002-03-15', 'female'),
(2, 'HV002', 'Trần Văn Hùng', 'hung.tran@gmail.com', '0912000222', '33 Trần Hưng Đạo, Q1, TP.HCM', '2001-08-20', 'male'),
(3, 'HV003', 'Lê Thị Hương', 'huong.le@gmail.com', '0912000333', '44 Cách Mạng Tháng 8, Tân Bình', '2003-01-10', 'female'),
(4, 'HV004', 'Phạm Quang Huy', 'huy.pham@gmail.com', '0912000444', '55 Lý Tự Trọng, Q1, TP.HCM', '2000-11-25', 'male'),
(5, 'HV005', 'Võ Thị Kim Anh', 'anhk.vo@gmail.com', '0912000555', '66 Nguyễn Đình Chiểu, Q3, TP.HCM', '2002-07-05', 'female'),
(6, 'HV006', 'Đặng Hữu Phúc', 'phuc.dang@gmail.com', '0912000666', '77 Hai Bà Trưng, Q1, TP.HCM', '2001-04-30', 'male'),
(7, 'HV007', 'Bùi Thanh Tâm', 'tam.bui@gmail.com', '0912000777', '88 Phan Đăng Lưu, Phú Nhuận', '2000-09-12', 'female'),
(8, 'HV008', 'Hồ Minh Nhật', 'nhat.ho@gmail.com', '0912000888', '99 Nguyễn Văn Cừ, Q5, TP.HCM', '2003-06-18', 'male'),
(9, 'HV009', 'Trịnh Hoàng Long', 'long.trinh@gmail.com', '0912000999', '110 Hoàng Văn Thụ, Phú Nhuận', '2002-12-01', 'male'),
(10, 'HV010', 'Lâm Ngọc Trâm', 'tram.lam@gmail.com', '0912001000', '121 Nguyễn Thị Minh Khai, Q3', '2001-02-22', 'female'),
(11, 'HV011', 'Đỗ Quốc Bảo', 'bao.do@gmail.com', '0912001111', '132 Lê Văn Sỹ, Tân Bình, TP.HCM', '2000-05-15', 'male'),
(12, 'HV012', 'Huỳnh Kim Ngân', 'ngan.huynh@gmail.com', '0912001222', '143 Phạm Văn Đồng, Gò Vấp', '2003-10-08', 'female');

INSERT INTO classes (id, code, course_id, teacher_id, name, schedule, room, max_students, current_students, status) VALUES
(1, 'LH001', 1, 2, 'TOEIC Cơ Bản - Ca Sáng', 'Thứ 2,4 - 08:00-10:00', 'P201', 25, 4, 'upcoming'),
(2, 'LH002', 1, 2, 'TOEIC Cơ Bản - Ca Tối', 'Thứ 3,5 - 18:00-20:00', 'P202', 25, 1, 'upcoming'),
(3, 'LH003', 2, 3, 'TOEIC Nâng Cao - Ca Sáng', 'Thứ 2,4,6 - 08:00-10:00', 'P301', 20, 2, 'upcoming'),
(4, 'LH004', 2, 3, 'TOEIC Nâng Cao - Ca Chiều', 'Thứ 3,5 - 14:00-16:00', 'P302', 20, 1, 'upcoming'),
(5, 'LH005', 3, 4, 'IELTS Foundation - Toàn Thời Gian', 'Thứ 2-5 - 09:00-11:30', 'P401', 15, 4, 'upcoming'),
(6, 'LH006', 5, 4, 'Giao Tiếp - Cuối Tuần', 'Thứ 7,CN - 08:00-11:00', 'P101', 30, 2, 'upcoming'),
(7, 'LH007', 6, 2, 'Thiếu Nhi - Hè 2026', 'Thứ 2,4,6 - 15:00-17:00', 'P102', 20, 2, 'upcoming'),
(8, 'LH008', 4, 3, 'IELTS Advanced - Cấp Tốc', 'Thứ 2-6 - 13:00-16:00', 'P402', 12, 1, 'upcoming'),
(9, 'LH009', 7, 4, 'Doanh Nghiệp - Sáng', 'Thứ 3,5 - 08:00-11:00', 'P501', 20, 1, 'upcoming'),
(10, 'LH010', 5, 2, 'Giao Tiếp - Tối 2-4-6', 'Thứ 2,4,6 - 19:00-21:00', 'P103', 25, 1, 'upcoming');

INSERT INTO registrations (id, code, student_id, class_id, employee_id, registration_date, status, total_amount, discount, final_amount, note, class_ids) VALUES
(1, 'PDK001', 1, 1, 2, '2026-06-15', 'success', 4500000, 0, 4500000, '', '1'),
(2, 'PDK002', 2, 1, 2, '2026-06-16', 'success', 4500000, 0, 4500000, '', '1'),
(3, 'PDK003', 3, 3, 3, '2026-06-17', 'success', 6500000, 0, 6500000, '', '3'),
(4, 'PDK004', 4, 5, 4, '2026-06-18', 'success', 8000000, 0, 8000000, '', '5'),
(5, 'PDK005', 5, 6, 2, '2026-06-19', 'success', 3500000, 0, 3500000, '', '6'),
(6, 'PDK006', 6, 2, 2, '2026-06-20', 'pending', 4500000, 0, 4500000, '', '2'),
(7, 'PDK007', 7, 7, 3, '2026-06-21', 'success', 3000000, 0, 3000000, '', '7'),
(8, 'PDK008', 8, 8, 4, '2026-06-22', 'success', 12000000, 0, 12000000, '', '8'),
(9, 'PDK009', 9, 4, 3, '2026-06-23', 'pending', 6500000, 0, 6500000, '', '4'),
(10, 'PDK010', 10, 9, 4, '2026-06-24', 'success', 7000000, 0, 7000000, '', '9'),
(11, 'PDK011', 11, 10, 2, '2026-06-25', 'pending', 3500000, 0, 3500000, '', '10'),
(12, 'PDK012', 12, 6, 3, '2026-06-26', 'success', 3500000, 0, 3500000, '', '6'),
(13, 'PDK013', 1, 5, 2, '2026-06-20', 'success', 11500000, 0, 11500000, '', '1,5'),
(14, 'PDK014', 4, 3, 4, '2026-06-22', 'success', 14500000, 0, 14500000, '', '3,5'),
(15, 'PDK015', 8, 1, 2, '2026-06-25', 'pending', 17000000, 0, 17000000, '', '1,5,7');

INSERT INTO payments (id, receipt_number, registration_id, student_id, employee_id, amount, payment_date, payment_method, payer_name, note) VALUES
(1, 'PT2606001', 1, 1, 2, 4500000, '2026-06-20', 'cash', '', ''),
(2, 'PT2606002', 2, 2, 2, 4500000, '2026-06-21', 'cash', '', ''),
(3, 'PT2606003', 3, 3, 3, 6500000, '2026-06-22', 'cash', '', ''),
(4, 'PT2606004', 4, 4, 4, 8000000, '2026-06-23', 'cash', '', ''),
(5, 'PT2606005', 5, 5, 2, 3500000, '2026-06-24', 'cash', '', ''),
(6, 'PT2606006', 7, 7, 3, 3000000, '2026-06-25', 'cash', '', ''),
(7, 'PT2606007', 8, 8, 4, 5000000, '2026-06-26', 'cash', '', ''),
(8, 'PT2606008', 8, 8, 4, 7000000, '2026-06-28', 'cash', '', ''),
(9, 'PT2606009', 10, 10, 4, 7000000, '2026-06-27', 'cash', '', ''),
(10, 'PT2606010', 12, 12, 3, 3500000, '2026-06-28', 'cash', '', ''),
(11, 'PT2606011', 13, 1, 2, 11500000, '2026-06-25', 'cash', '', ''),
(12, 'PT2606012', 14, 4, 4, 14500000, '2026-06-27', 'cash', '', '');

SET FOREIGN_KEY_CHECKS=1;