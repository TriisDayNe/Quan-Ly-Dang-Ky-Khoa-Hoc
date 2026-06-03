# Hệ thống Quản lý Đăng ký Khóa học - Trung tâm Anh ngữ

Hệ thống quản lý trung tâm anh ngữ với đầy đủ chức năng: Dashboard thống kê, quản lý khóa học, lớp học, học viên, nhân viên, phiếu đăng ký và phiếu thu.

## Công nghệ sử dụng

| Layer | Công nghệ |
|-------|-----------|
| Backend | Node.js + Express |
| Database | SQLite (sql.js - chạy trực tiếp, không cần cài đặt DB server) |
| Frontend | React 18 + Vite |
| UI | Tailwind CSS |
| Biểu đồ | Recharts |
| Icons | Lucide React |

## Yêu cầu môi trường

- **Node.js** >= 18.x ([tải tại đây](https://nodejs.org/))
- **npm** (cài kèm Node.js)

## Cài đặt và chạy

### 1. Clone dự án

```bash
git clone https://github.com/TriisDayNe/Quan-Ly-Dang-Ky-Khoa-Hoc.git
cd Quan-Ly-Dang-Ky-Khoa-Hoc
```

### 2. Cài đặt dependencies

```bash
# Cài đặt backend
cd server
npm install

# Cài đặt frontend
cd ../client
npm install

# Quay lại thư mục gốc
cd ..
```

### 3. Tạo dữ liệu mẫu (tuỳ chọn)

```bash
cd server
node seed.js
cd ..
```

Dữ liệu mẫu bao gồm:
- 4 nhân viên (1 admin + 3 staff)
- 7 khóa học (TOEIC, IELTS, Giao tiếp, Thiếu nhi...)
- 12 học viên
- 10 lớp học
- 15 phiếu đăng ký
- 12 phiếu thu

### 4. Build và chạy

```bash
# Build frontend
cd client
npm run build

# Chạy server (từ thư mục gốc)
cd ..
node server/index.js
```

Hoặc chạy nhanh bằng lệnh:

```bash
# Chạy từ thư mục gốc dự án
npm run build --prefix client && node server/index.js
```

### 5. Truy cập

Mở trình duyệt: **http://localhost:3000**

## Tài khoản đăng nhập

| Vai trò | Email | Mật khẩu |
|---------|-------|----------|
| Admin | admin@trungtam.com | admin123 |
| Nhân viên | tuan.nguyen@trungtam.com | NV001 |
| Nhân viên | lan.tran@trungtam.com | NV002 |
| Nhân viên | minh.pham@trungtam.com | NV003 |

> **Lưu ý**: Khi tạo nhân viên mới, mật khẩu mặc định chính là mã nhân viên (VD: NV004 → mật khẩu: NV004)

## Chạy development

```bash
# Terminal 1 - Chạy backend (port 3000)
cd server
npm run dev

# Terminal 2 - Chạy frontend dev server (port 5173)
cd client
npm run dev
```

Frontend dev server sẽ tự động proxy API requests tới backend.

## Cấu trúc dự án

```
Quan-Ly-Dang-Ky-Khoa-Hoc/
├── server/                  # Backend Express + SQLite
│   ├── index.js             # Entry point
│   ├── db.js                # Database setup + schema
│   ├── seed.js              # Tạo dữ liệu mẫu
│   ├── middleware/
│   │   └── auth.js          # JWT authentication
│   └── routes/
│       ├── auth.js          # Đăng nhập / Đăng ký
│       ├── courses.js       # CRUD Khóa học
│       ├── classes.js       # CRUD Lớp học
│       ├── students.js      # CRUD Học viên
│       ├── employees.js     # CRUD Nhân viên
│       ├── registrations.js # Phiếu đăng ký
│       ├── payments.js      # Phiếu thu
│       └── dashboard.js     # Thống kê & biểu đồ
├── client/                  # Frontend React + Vite
│   ├── src/
│   │   ├── App.jsx          # Router
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── components/
│   │   │   ├── Layout.jsx   # Sidebar + Header
│   │   │   └── Modal.jsx
│   │   └── pages/
│   │       ├── Login.jsx
│   │       ├── Register.jsx
│   │       ├── Dashboard.jsx
│   │       ├── Courses.jsx
│   │       ├── Classes.jsx
│   │       ├── Students.jsx
│   │       ├── Employees.jsx
│   │       ├── Registrations.jsx
│   │       └── Payments.jsx
│   └── index.html
└── package.json
```

## Tính năng chính

### Dashboard
- 6 thẻ thống kê: doanh thu hôm nay, tổng doanh thu, học viên, khóa học, lớp học, đăng ký chờ xử lý
- Biểu đồ cột doanh thu: lọc theo ngày/tháng/quý/năm
- Bảng đăng ký gần đây với trạng thái

### Quản lý khóa học
- CRUD khóa học với mã tự động (KH001, KH002...)
- Học phí tự động format (10.000.000)
- Ngày bắt đầu, ngày kết thúc

### Quản lý lớp học
- CRUD lớp học với mã tự động (LH001, LH002...)
- Liên kết khóa học + giảng viên
- Lịch học, phòng học, sĩ số

### Quản lý học viên
- CRUD học viên với mã tự động (HV001, HV002...)
- Đầy đủ thông tin: họ tên, email, SĐT, ngày sinh, địa chỉ, giới tính

### Quản lý nhân viên
- CRUD nhân viên với mã tự động (NV001, NV002...)
- Mã nhân viên = mật khẩu mặc định (chỉ admin mới quản lý được)

### Phiếu đăng ký
- Tạo phiếu đăng ký với khả năng chọn nhiều lớp cùng lúc
- Tổng tiền tự động tính từ giá các khóa học đã chọn
- Một phiếu đăng ký có thể bao gồm nhiều lớp học
- Trạng thái: thành công / đang chờ / đã hủy

### Phiếu thu
- Nhân viên thu tự động gán theo người đăng nhập
- Mã phiếu thu format PT + YYMM + XXX
- Hiển thị số tiền bằng chữ
- Liên kết với phiếu đăng ký

## License

MIT
