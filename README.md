# ระบบการคิดคำนวณและจัดสรรงบประมาณค่าวัสดุฝึก
**Training Materials Budget Allocation System**
วิทยาลัยอาชีวศึกษาเชียงราย (Chiang Rai Vocational College)

พัฒนาตามสถาปัตยกรรมและข้อกำหนดใน [DESIGN.md](./DESIGN.md)

---

## 🛠 Tech Stack
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons (Served via Nginx)
- **Backend:** Node.js 22, Express, TypeScript, MySQL2/Promise, Zod, PDFKit
- **Database:** MariaDB 11.4 / MySQL 8.0+ (InnoDB with Generated Stored Columns)
- **Containerization:** Docker & Docker Compose (Multi-stage build)

---

## 🐳 การติดตั้งและใช้งานผ่าน Docker (แนะนำสำหรับการใช้งานจริง)

ระบบถูกออกแบบให้รองรับการติดตั้งด้วยคำสั่งเดียวผ่าน **Docker Compose** โดยมีครบทั้ง 3 Services (Database, Backend API, Frontend Web Application with Nginx Reverse Proxy):

### 1. ไฟล์การตั้งค่า (.env)
ระบบมีไฟล์ `.env` สำหรับกำหนดค่าพอร์ตและรหัสผ่าน (สามารถปรับแต่งได้ตามต้องการ):
```env
DB_ROOT_PASSWORD=cvcmedia2022
DB_NAME=training_budget_db
DB_PORT_HOST=3307

BACKEND_PORT_HOST=5080
FRONTEND_PORT_HOST=8888
```

### 2. คำสั่งเริ่มต้นระบบ (Start Containers)
```bash
docker compose up -d
```
> **หมายเหตุ:** ฐานข้อมูลจะทำการ Import ตารางและข้อมูลตั้งต้นจาก `schema.sql` ลงใน MariaDB อัตโนมัติเมื่อสร้าง Container ครั้งแรก

### 3. ช่องทางการเข้าใช้งานระบบบน Docker
* **Frontend Web Application (Nginx + Reverse Proxy):** **[http://localhost:8888](http://localhost:8888)**
* **Backend API (Direct):** [http://localhost:5080/health](http://localhost:5080/health)
* **รายงานสรุป PDF:** [http://localhost:8888/api/v1/reports/pdf?term_id=1](http://localhost:8888/api/v1/reports/pdf?term_id=1)
* **MariaDB Host Port:** `localhost:3307`

### 4. คำสั่งหยุดและจัดการ Docker
* **ตรวจสอบสถานะคอนเทนเนอร์:**
  ```bash
  docker compose ps
  ```
* **ดู Logs ของระบบ:**
  ```bash
  docker compose logs -f
  ```
* **หยุดการทำงาน:**
  ```bash
  docker compose down
  ```
* **หยุดการทำงานและล้างข้อมูลเก่าใน Volume:**
  ```bash
  docker compose down -v
  ```

---

## 💻 การรันสำหรับนักพัฒนา (Local Development Mode)

หากต้องการรันแก้ไขโค้ดแบบ Live-reload โดยไม่ใช้ Docker:

1. **Backend:**
   ```bash
   cd backend
   npm install
   npm run dev
   # Backend จะทำงานที่ http://localhost:5800
   ```

2. **Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   # Frontend จะทำงานที่ http://localhost:3100
   ```

---

## 📂 โครงสร้างโปรเจกต์
```
Training material calculation system/
├── docker-compose.yml             # จัดการ Container ทั้ง 3 Services
├── .env                           # คอนฟิกพอร์ตและรหัสผ่านสำหรับ Docker
├── .env.example                   # ตัวอย่างคอนฟิกสภาพแวดล้อม
├── schema.sql                     # MySQL 8.0 DDL & Master Seed Data
├── DESIGN.md                      # System Design Document
├── backend/
│   ├── Dockerfile                 # Multi-stage Dockerfile (Node 22 Alpine)
│   ├── .dockerignore
│   ├── src/
│   │   ├── config/db.ts           # การเชื่อมต่อ MariaDB/MySQL (Pool Connection)
│   │   ├── routes/
│   │   │   ├── terms.ts           # จัดการปีการศึกษา & สลับสถานะ OPEN/CLOSED
│   │   │   ├── departments.ts     # แผนกวิชา & ระดับการศึกษา
│   │   │   ├── groups.ts          # กลุ่มเรียนตามแผนกและระดับ
│   │   │   ├── allocations.ts     # จัดสรรงบ, สูตร Reactive, Inter-dept Shares, Audit Trail
│   │   │   ├── summary.ts         # Aggregation Query กระทบยอด Real-time & Level KPIs
│   │   │   └── reports.ts         # สร้างเอกสารทางการในรูปแบบ PDF
│   │   └── server.ts              # Express Server
│   └── package.json
└── frontend/
    ├── Dockerfile                 # Multi-stage Dockerfile (Node 22 Build + Nginx Alpine)
    ├── .dockerignore
    ├── nginx.conf                 # Nginx Config พร้อม Reverse Proxy ไปยัง /api/
    ├── src/
    │   ├── components/
    │   │   ├── Header.tsx         # หัวเรื่อง, ตัวเลือกเทอม, สลับโหมด OPEN/CLOSED, ปุ่ม PDF
    │   │   ├── AllocationForm.tsx # แผงบันทึกข้อมูลฝั่งซ้าย (Reactive Calculation & Shares)
    │   │   ├── SummaryDashboard.tsx # ตารางกระทบยอดสุทธิ, รายการกลุ่ม, จำแนกตามระดับ ปวช./ปวส./เรือนจำ
    │   │   └── AuditLogModal.tsx  # หน้าต่างสืบค้น Snapshot Audit Trail ย้อนหลัง
    │   ├── types.ts               # Data Contracts & Type Definitions
    │   ├── App.tsx                # Main Split-view Container & State Management
    │   └── index.css              # Tailwind Directives & Sarabun Font
    └── vite.config.ts             # Reverse Proxy API สำหรับ Local Dev
```
