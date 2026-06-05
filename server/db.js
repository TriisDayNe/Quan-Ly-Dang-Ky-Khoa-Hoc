const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD ?? '';
const DB_NAME = process.env.DB_NAME || 'qly_dkikh';

let pool = null;
let wrapper = null;

class DbWrapper {
  constructor(connectionPool) {
    this.pool = connectionPool;
  }

  prepare(sql) {
    const safe = (params) => params.map((value) => (value === undefined ? null : value));
    return {
      get: async (...params) => {
        const [rows] = await this.pool.execute(sql, safe(params));
        return rows[0];
      },
      all: async (...params) => {
        const [rows] = await this.pool.execute(sql, safe(params));
        return rows;
      },
      run: async (...params) => {
        const [result] = await this.pool.execute(sql, safe(params));
        return { lastInsertRowid: result.insertId, changes: result.affectedRows };
      }
    };
  }

  exec(sql) {
    return this.pool.query(sql);
  }

  save() {
    // No-op for MySQL. Kept for compatibility with the old SQLite wrapper.
  }
}

async function ensureDatabaseExists() {
  const bootstrapPool = mysql.createPool({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    waitForConnections: true,
    connectionLimit: 5,
    charset: 'utf8mb4'
  });

  await bootstrapPool.execute(
    `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await bootstrapPool.end();
}

async function recreatePhoneValidationTriggers(connectionPool) {
  await connectionPool.query('DROP TRIGGER IF EXISTS trg_users_phone_before_insert');
  await connectionPool.query('DROP TRIGGER IF EXISTS trg_users_phone_before_update');
  await connectionPool.query('DROP TRIGGER IF EXISTS trg_students_phone_before_insert');
  await connectionPool.query('DROP TRIGGER IF EXISTS trg_students_phone_before_update');

  await connectionPool.query(`
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
    END
  `);

  await connectionPool.query(`
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
    END
  `);

  await connectionPool.query(`
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
    END
  `);

  await connectionPool.query(`
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
    END
  `);
}

async function ensureSchema(connectionPool) {
  await connectionPool.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(20) NOT NULL UNIQUE,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(20) DEFAULT 'staff',
      phone VARCHAR(20) UNIQUE,
      address VARCHAR(255),
      password_display VARCHAR(255),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const [passwordDisplayColumn] = await connectionPool.execute(`SHOW COLUMNS FROM users LIKE 'password_display'`);
  if (passwordDisplayColumn.length === 0) {
    try {
      await connectionPool.execute(`ALTER TABLE users ADD COLUMN password_display VARCHAR(255) AFTER address`);
    } catch (error) {
      console.warn('Could not add password_display column to users table:', error.message);
    }
  }

  await connectionPool.execute(`UPDATE users SET password_display = COALESCE(password_display, CASE WHEN email = 'admin@trungtam.com' THEN 'admin123' ELSE code END)`);
  const [blankStaffCodes] = await connectionPool.execute(`SELECT id FROM users WHERE (code IS NULL OR code = '') AND role != 'admin' ORDER BY id`);
  for (const row of blankStaffCodes) {
    const last = await connectionPool.execute("SELECT code FROM users WHERE code LIKE 'NV%' ORDER BY id DESC LIMIT 1");
    const lastCode = last[0][0]?.code;
    const nextCode = lastCode ? 'NV' + String(parseInt(lastCode.replace('NV', '')) + 1).padStart(3, '0') : 'NV001';
    await connectionPool.execute('UPDATE users SET code = ? WHERE id = ?', [nextCode, row.id]);
  }

  await connectionPool.execute(`UPDATE users SET phone = NULL WHERE phone = ''`);
  await connectionPool.execute(`UPDATE users SET phone = TRIM(phone) WHERE phone IS NOT NULL`);
  const [phoneIndexes] = await connectionPool.execute(`SHOW INDEX FROM users WHERE Key_name = 'uq_users_phone'`);
  if (phoneIndexes.length === 0) {
    try {
      await connectionPool.execute(`ALTER TABLE users ADD UNIQUE KEY uq_users_phone (phone)`);
    } catch (error) {
      console.warn('Could not add unique phone index to users table:', error.message);
    }
  }

  await connectionPool.execute(`
    CREATE TABLE IF NOT EXISTS students (
      id INT AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(20) NOT NULL UNIQUE,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100),
      phone VARCHAR(20),
      address VARCHAR(255),
      date_of_birth DATE,
      gender VARCHAR(10) DEFAULT 'male',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await connectionPool.execute(`UPDATE students SET phone = NULL WHERE phone = ''`);
  await connectionPool.execute(`UPDATE students SET phone = TRIM(phone) WHERE phone IS NOT NULL`);
  const [studentPhoneIndexes] = await connectionPool.execute(`SHOW INDEX FROM students WHERE Key_name = 'uq_students_phone'`);
  if (studentPhoneIndexes.length === 0) {
    try {
      await connectionPool.execute(`ALTER TABLE students ADD UNIQUE KEY uq_students_phone (phone)`);
    } catch (error) {
      console.warn('Could not add unique phone index to students table:', error.message);
    }
  }

  await connectionPool.execute(`
    CREATE TABLE IF NOT EXISTS courses (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await connectionPool.execute(`
    CREATE TABLE IF NOT EXISTS classes (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await connectionPool.execute(`
    CREATE TABLE IF NOT EXISTS registrations (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await connectionPool.execute(`
    CREATE TABLE IF NOT EXISTS payments (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const adminHash = bcrypt.hashSync('admin123', 10);
  await connectionPool.execute(
    `INSERT INTO users (code, name, email, password, role, phone, address)
     SELECT ?, ?, ?, ?, ?, ?, ?
     FROM DUAL
     WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = ?)
    `,
    ['ADMIN', 'Quản trị viên', 'admin@trungtam.com', adminHash, 'admin', '0900000000', 'Trung tâm Anh ngữ', 'admin@trungtam.com']
  );

  try {
    await recreatePhoneValidationTriggers(connectionPool);
  } catch (error) {
    console.warn('Could not create phone validation triggers:', error.message);
  }
}

async function initDb() {
  if (pool) {
    return wrapper;
  }

  await ensureDatabaseExists();
  pool = mysql.createPool({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    charset: 'utf8mb4'
  });

  await ensureSchema(pool);
  wrapper = new DbWrapper(pool);
  return wrapper;
}

function connectDb() {
  return initDb();
}

function getDb() {
  if (!wrapper) throw new Error('Database not initialized');
  return wrapper;
}

const dbProxy = new Proxy({}, {
  get(target, prop) {
    if (prop in target) return target[prop];
    if (!wrapper) throw new Error('Database not initialized');
    const value = wrapper[prop];
    return typeof value === 'function' ? value.bind(wrapper) : value;
  }
});

module.exports = dbProxy;
module.exports.initDb = initDb;
module.exports.connectDb = connectDb;
module.exports.getDb = getDb;
