import { Router, Request, Response } from 'express';
import { pool } from '../config/db';
import { RowDataPacket } from 'mysql2';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const router = Router();

function getFontPaths() {
  const possibleDirs = [
    path.join(__dirname, '../fonts'),
    path.join(__dirname, 'fonts'),
    path.join(process.cwd(), 'fonts'),
    path.join(process.cwd(), 'src/fonts'),
    '/app/fonts'
  ];

  for (const dir of possibleDirs) {
    const regular = path.join(dir, 'THSarabunNew.ttf');
    const bold = path.join(dir, 'THSarabunNew-Bold.ttf');
    if (fs.existsSync(regular) && fs.existsSync(bold)) {
      return { regular, bold };
    }
  }
  return null;
}

// GET /api/v1/reports/pdf?term_id={id}&department_id={id|all}
router.get('/pdf', async (req: Request, res: Response): Promise<void> => {
  const { term_id, department_id } = req.query;

  if (!term_id) {
    res.status(400).json({ success: false, message: 'term_id is required' });
    return;
  }

  try {
    // 1. Fetch term info
    const [terms] = await pool.query<RowDataPacket[]>(
      'SELECT academic_year, semester, status FROM academic_terms WHERE id = ?',
      [term_id]
    );

    if (terms.length === 0) {
      res.status(404).json({ success: false, message: 'ไม่พบปีการศึกษา' });
      return;
    }
    const term = terms[0];

    // 2. Fetch System Settings for Official Header & Signatures
    const [settingsRows] = await pool.query<RowDataPacket[]>(
      'SELECT setting_key, setting_value FROM system_settings'
    );
    const settings: Record<string, string> = {};
    settingsRows.forEach((r) => {
      settings[r.setting_key] = r.setting_value;
    });

    const collegeName = settings.college_name || 'วิทยาลัยอาชีวศึกษาเชียงราย';
    const deptName = settings.department_name || 'งานวางแผนและงบประมาณ ฝ่ายแผนงานและความร่วมมือ';
    const affiliation = settings.affiliation || 'สำนักงานคณะกรรมการการอาชีวศึกษา กระทรวงศึกษาธิการ';
    const directorName = settings.director_name || 'ผู้อำนวยการสถานศึกษา';
    const plannerName = settings.planner_name || 'หัวหน้างานวางแผนและงบประมาณ';
    const operatorName = settings.default_operator || 'เจ้าหน้าที่งานวางแผนและงบประมาณ';

    // 3. Fetch Department Summary
    let deptQuery = `
      SELECT 
          d.id AS department_id,
          d.code AS department_code,
          d.name AS department_name,
          COALESCE(base.student_count, 0) AS student_count,
          COALESCE(base.total_base_budget, 0.00) AS base_budget,
          COALESCE(deduct.total_deducted, 0.00) AS total_deducted,
          COALESCE(trans.total_transferred, 0.00) AS total_transferred,
          (COALESCE(base.total_base_budget, 0.00) 
           - COALESCE(deduct.total_deducted, 0.00) 
           + COALESCE(trans.total_transferred, 0.00)) AS net_budget
      FROM departments d
      LEFT JOIN (
          SELECT cg.department_id, SUM(ba.student_count) as student_count, SUM(ba.base_budget) AS total_base_budget
          FROM budget_allocations ba
          JOIN class_groups cg ON ba.class_group_id = cg.id
          WHERE ba.academic_term_id = ?
          GROUP BY cg.department_id
      ) base ON d.id = base.department_id
      LEFT JOIN (
          SELECT s.source_department_id, SUM(s.share_amount) AS total_deducted
          FROM inter_department_shares s
          JOIN budget_allocations ba ON s.allocation_id = ba.id
          WHERE ba.academic_term_id = ?
          GROUP BY s.source_department_id
      ) deduct ON d.id = deduct.source_department_id
      LEFT JOIN (
          SELECT s.target_department_id, SUM(s.share_amount) AS total_transferred
          FROM inter_department_shares s
          JOIN budget_allocations ba ON s.allocation_id = ba.id
          WHERE ba.academic_term_id = ?
          GROUP BY s.target_department_id
      ) trans ON d.id = trans.target_department_id
    `;
    const deptParams: any[] = [term_id, term_id, term_id];

    if (department_id && department_id !== 'all') {
      deptQuery += ' WHERE d.id = ?';
      deptParams.push(department_id);
    }
    deptQuery += ' ORDER BY d.id ASC';

    const [departments] = await pool.query<RowDataPacket[]>(deptQuery, deptParams);

    // Create PDF Document
    const doc = new PDFDocument({ margin: 36, size: 'A4' });

    // Register Thai font
    const fontPaths = getFontPaths();
    if (fontPaths) {
      doc.registerFont('THSarabun', fontPaths.regular);
      doc.registerFont('THSarabun-Bold', fontPaths.bold);
    }
    const fontRegular = fontPaths ? 'THSarabun' : 'Helvetica';
    const fontBold = fontPaths ? 'THSarabun-Bold' : 'Helvetica-Bold';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="training_budget_report_term_${term.semester}_${term.academic_year}.pdf"`
    );

    doc.pipe(res);

    // Header Title
    doc.font(fontBold).fontSize(16).text(collegeName, { align: 'center' });
    doc.font(fontRegular).fontSize(12).text(`${deptName} • ${affiliation}`, { align: 'center' });
    doc.font(fontBold).fontSize(14).text(
      `รายงานสรุปการจัดสรรงบประมาณค่าวัสดุฝึกปฏิบัติการ ประจำภาคเรียนที่ ${term.semester} ปีการศึกษา ${term.academic_year}`,
      { align: 'center' }
    );
    doc.font(fontRegular).fontSize(10).text(
      `สถานะงวด: ${term.status === 'OPEN' ? 'เปิดงวดจัดสรร (OPEN)' : 'ปิดงวด (CLOSED)'}  |  พิมพ์เมื่อ: ${new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}`,
      { align: 'center' }
    );
    doc.moveDown(1.2);

    // Table Header
    const tableTop = doc.y;
    doc.rect(36, tableTop - 3, 523, 20).fill('#f1f5f9');
    doc.fillColor('#0f172a');
    doc.font(fontBold).fontSize(10);
    doc.text('รหัสแผนก', 42, tableTop + 2);
    doc.text('ชื่อแผนกวิชา', 105, tableTop + 2);
    doc.text('นักเรียน (คน)', 240, tableTop + 2, { width: 55, align: 'right' });
    doc.text('งบตั้งต้น (บาท)', 305, tableTop + 2, { width: 75, align: 'right' });
    doc.text('หักปันส่วน (-)', 385, tableTop + 2, { width: 55, align: 'right' });
    doc.text('รับโอน (+)', 445, tableTop + 2, { width: 50, align: 'right' });
    doc.text('งบสุทธิคงเหลือ', 500, tableTop + 2, { width: 55, align: 'right' });

    doc.moveTo(36, tableTop + 18).lineTo(559, tableTop + 18).stroke('#cbd5e1');

    let currentY = tableTop + 24;
    doc.font(fontRegular);

    let totalStudents = 0;
    let totalBase = 0;
    let totalDeduct = 0;
    let totalTrans = 0;
    let totalNet = 0;

    departments.forEach((dept, index) => {
      if (currentY > 730) {
        doc.addPage();
        currentY = 40;
      }

      const students = Number(dept.student_count);
      const base = Number(dept.base_budget);
      const deducted = Number(dept.total_deducted);
      const transferred = Number(dept.total_transferred);
      const net = Number(dept.net_budget);

      totalStudents += students;
      totalBase += base;
      totalDeduct += deducted;
      totalTrans += transferred;
      totalNet += net;

      // Alternating row background
      if (index % 2 === 1) {
        doc.rect(36, currentY - 2, 523, 16).fill('#f8fafc');
        doc.fillColor('#1e293b');
      } else {
        doc.fillColor('#1e293b');
      }

      doc.fontSize(10.5);
      doc.text(dept.department_code || '', 42, currentY);
      doc.text(dept.department_name || '', 105, currentY, { width: 135, ellipsis: true });
      doc.text(students > 0 ? students.toLocaleString() : '-', 240, currentY, { width: 55, align: 'right' });
      doc.text(base.toLocaleString('th-TH', { minimumFractionDigits: 2 }), 305, currentY, { width: 75, align: 'right' });
      doc.text(deducted > 0 ? deducted.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-', 385, currentY, { width: 55, align: 'right' });
      doc.text(transferred > 0 ? transferred.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-', 445, currentY, { width: 50, align: 'right' });
      doc.text(net.toLocaleString('th-TH', { minimumFractionDigits: 2 }), 500, currentY, { width: 55, align: 'right' });

      currentY += 17;
    });

    // Total Line
    doc.moveTo(36, currentY).lineTo(559, currentY).stroke('#475569');
    currentY += 4;
    doc.rect(36, currentY - 2, 523, 19).fill('#e2e8f0');
    doc.fillColor('#0f172a');
    doc.font(fontBold).fontSize(11);
    doc.text('รวมทั้งสิ้น (TOTAL SUMMARY)', 105, currentY + 2);
    doc.text(totalStudents.toLocaleString(), 240, currentY + 2, { width: 55, align: 'right' });
    doc.text(totalBase.toLocaleString('th-TH', { minimumFractionDigits: 2 }), 305, currentY + 2, { width: 75, align: 'right' });
    doc.text(totalDeduct.toLocaleString('th-TH', { minimumFractionDigits: 2 }), 385, currentY + 2, { width: 55, align: 'right' });
    doc.text(totalTrans.toLocaleString('th-TH', { minimumFractionDigits: 2 }), 445, currentY + 2, { width: 50, align: 'right' });
    doc.text(totalNet.toLocaleString('th-TH', { minimumFractionDigits: 2 }), 500, currentY + 2, { width: 55, align: 'right' });

    // Footer Signatures
    currentY += 50;
    if (currentY > 700) {
      doc.addPage();
      currentY = 50;
    }

    doc.fillColor('#1e293b');
    doc.font(fontRegular).fontSize(10.5);

    const sigY = currentY;
    // Signature 1: Operator
    doc.text('ลงชื่อ .....................................................', 45, sigY);
    doc.text(`( ${operatorName} )`, 55, sigY + 16);
    doc.text('เจ้าหน้าที่ผู้จัดทำงบประมาณ', 62, sigY + 30);

    // Signature 2: Planner
    doc.text('ลงชื่อ .....................................................', 215, sigY);
    doc.text(`( ${plannerName} )`, 225, sigY + 16);
    doc.text('หัวหน้างานวางแผนและงบประมาณ', 222, sigY + 30);

    // Signature 3: Director
    doc.text('ลงชื่อ .....................................................', 390, sigY);
    doc.text(`( ${directorName} )`, 400, sigY + 16);
    doc.text('ผู้อำนวยการสถานศึกษา', 420, sigY + 30);

    doc.end();
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
