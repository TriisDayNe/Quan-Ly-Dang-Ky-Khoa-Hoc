const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data.db');
let wrapper = null;

class DbWrapper {
  constructor(sqlDb, filePath) {
    this.db = sqlDb;
    this.filePath = filePath;
    this._savePending = false;
  }

  prepare(sql) {
    const stmt = this.db.prepare(sql);
    const self = this;
    const safe = (params) => params.map(v => v === undefined ? null : v);
    return {
      get: (...params) => {
        stmt.bind(safe(params));
        if (stmt.step()) {
          const row = stmt.getAsObject();
          stmt.free();
          return row;
        }
        stmt.free();
        return undefined;
      },
      all: (...params) => {
        stmt.bind(safe(params));
        const rows = [];
        while (stmt.step()) {
          rows.push(stmt.getAsObject());
        }
        stmt.free();
        return rows;
      },
      run: (...params) => {
        stmt.bind(safe(params));
        stmt.step();
        stmt.free();
        const lastId = self.db.exec("SELECT last_insert_rowid()")[0].values[0][0];
        self._savePending = true;
        return { lastInsertRowid: lastId, changes: self.db.getRowsModified() };
      }
    };
  }

  exec(sql) {
    this.db.run(sql);
    this._savePending = true;
  }

  save() {
    if (this._savePending) {
      const data = this.db.export();
      fs.writeFileSync(this.filePath, Buffer.from(data));
      this._savePending = false;
    }
  }
}

async function initDb() {
  const SQL = await initSqlJs();
  let buffer;
  if (fs.existsSync(DB_PATH)) {
    buffer = fs.readFileSync(DB_PATH);
  }
  const sqlDb = new SQL.Database(buffer);
  sqlDb.run('PRAGMA foreign_keys = ON');

  sqlDb.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'staff',
      phone TEXT,
      address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  try { sqlDb.run("ALTER TABLE users ADD COLUMN code TEXT"); } catch(e) {}
  sqlDb.run(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      address TEXT,
      date_of_birth DATE,
      gender TEXT DEFAULT 'male',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  try { sqlDb.run("ALTER TABLE students ADD COLUMN gender TEXT DEFAULT 'male'"); } catch(e) {}
  sqlDb.run(`
    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      duration INTEGER,
      price REAL NOT NULL,
      start_date DATE,
      end_date DATE,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  // Add columns if upgrading from old schema
  try { sqlDb.run("ALTER TABLE courses ADD COLUMN start_date DATE"); } catch(e) {}
  try { sqlDb.run("ALTER TABLE courses ADD COLUMN end_date DATE"); } catch(e) {}
  sqlDb.run(`
    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      course_id INTEGER NOT NULL,
      teacher_id INTEGER,
      name TEXT NOT NULL,
      start_date DATE,
      end_date DATE,
      schedule TEXT,
      room TEXT,
      max_students INTEGER DEFAULT 20,
      current_students INTEGER DEFAULT 0,
      status TEXT DEFAULT 'upcoming',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (course_id) REFERENCES courses(id),
      FOREIGN KEY (teacher_id) REFERENCES users(id)
    )
  `);
  sqlDb.run(`
    CREATE TABLE IF NOT EXISTS registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      student_id INTEGER NOT NULL,
      class_id INTEGER NOT NULL,
      employee_id INTEGER,
      registration_date DATE NOT NULL,
      status TEXT DEFAULT 'pending',
      total_amount REAL NOT NULL,
      discount REAL DEFAULT 0,
      final_amount REAL NOT NULL,
      note TEXT,
      class_ids TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id),
      FOREIGN KEY (class_id) REFERENCES classes(id),
      FOREIGN KEY (employee_id) REFERENCES users(id)
    )
  `);
  try { sqlDb.run("ALTER TABLE registrations ADD COLUMN employee_id INTEGER"); } catch(e) {}
  try { sqlDb.run("ALTER TABLE registrations ADD COLUMN class_ids TEXT"); } catch(e) {}
  sqlDb.run(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_number TEXT UNIQUE NOT NULL,
      registration_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      employee_id INTEGER,
      amount REAL NOT NULL,
      payment_date DATE NOT NULL,
      payment_method TEXT DEFAULT 'cash',
      payer_name TEXT,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (registration_id) REFERENCES registrations(id),
      FOREIGN KEY (student_id) REFERENCES students(id),
      FOREIGN KEY (employee_id) REFERENCES users(id)
    )
  `);
  try { sqlDb.run("ALTER TABLE payments ADD COLUMN employee_id INTEGER"); } catch(e) {}

  wrapper = new DbWrapper(sqlDb, DB_PATH);

  const bcrypt = require('bcryptjs');
  const admin = wrapper.prepare("SELECT id FROM users WHERE role = ?").get('admin');
  if (!admin) {
    const hash = bcrypt.hashSync('admin123', 10);
    wrapper.prepare("INSERT INTO users (code, name, email, password, role, phone, address) VALUES (?,?,?,?,?,?,?)").run('ADMIN', 'Quản trị viên', 'admin@trungtam.com', hash, 'admin', '0900000000', 'Trung tâm Anh ngữ');
    console.log('Admin account created: admin@trungtam.com / admin123');
  } else if (!admin.code) {
    wrapper.prepare("UPDATE users SET code = ? WHERE id = ?").run('ADMIN', admin.id);
  }

  wrapper.save();
  setInterval(() => wrapper.save(), 10000);
}

function getDb() {
  if (!wrapper) throw new Error('Database not initialized');
  return wrapper;
}

// Proxy only for db operations (prepare, exec, save)
const dbProxy = new Proxy({}, {
  get(target, prop) {
    if (prop === 'initDb' || prop === 'getDb') return target[prop];
    if (!wrapper) throw new Error('Database not initialized');
    const val = wrapper[prop];
    return typeof val === 'function' ? val.bind(wrapper) : val;
  }
});

module.exports = dbProxy;
module.exports.initDb = initDb;
module.exports.getDb = getDb;
