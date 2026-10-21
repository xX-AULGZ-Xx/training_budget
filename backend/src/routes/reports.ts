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
  const { term_id, department_id, calculation_type } = req.query;

  if (!term_id) {
    res.status(400).json({ success: false, message: 'term_id is required' });
    return;
  }

  const hasCalcType = calculation_type && calculation_type !== 'all';
  const calcCondition = hasCalcType ? ' AND ba.calculation_type = ?' : '';

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

    const collegeName = settings.college_name || 'วิทยาลัยการอาชีพเชียงราย';
    const deptName = settings.department_name || 'งานวางแผนและงบประมาณ ฝ่ายแผนงานและความร่วมมือ';
    const affiliation = settings.affiliation || 'สำนักงานคณะกรรมการการอาชีวศึกษา กระทรวงศึกษาธิการ';

    // 1. Operator
    const operatorName = settings.default_operator || 'เจ้าหน้าที่แผนงาน';

    // 2. Planner (หัวหน้างานพัฒนายุทธศาสตร์แผนงานและงบประมาณ)
    const rawPlannerName = settings.planner_name || '';
    const plannerTitle = 'หัวหน้างานพัฒนายุทธศาสตร์\nแผนงานและงบประมาณ';
    const displayPlannerName =
      !rawPlannerName ||
      rawPlannerName === 'หัวหน้างานวางแผนและงบประมาณ' ||
      rawPlannerName === 'หัวหน้างานพัฒนายุทธศาสตร์แผนงานและงบประมาณ' ||
      rawPlannerName.includes('หัวหน้างาน')
        ? '.....................................................'
        : rawPlannerName;

    // 3. Director (ผู้บริหาร)
    const rawDirectorName = settings.director_name || '';
    let directorTitle = settings.director_title || '';
    if (!directorTitle) {
      if (collegeName.startsWith('วิทยาลัย') || collegeName.startsWith('สถาบัน')) {
        directorTitle = `ผู้อำนวยการ${collegeName}`;
      } else {
        directorTitle = `ผู้อำนวยการ${collegeName ? collegeName : 'สถานศึกษา'}`;
      }
    }
    const displayDirectorName =
      !rawDirectorName ||
      rawDirectorName.includes('ผู้อำนวยการ') ||
      rawDirectorName.includes('วิทยาลัย')
        ? '.....................................................'
        : rawDirectorName;

    // 3. Fetch Department Summary
    const CALC_LABELS: Record<string, string> = {
      ALL: 'ทุกประเภทงบ',
      REGULAR: 'ภาคปกติ',
      SPECIAL_SUPPLEMENTARY: 'ภาคสมทบ',
      DUAL_EDUCATION: 'ภาคทวิศึกษา',
      SHORT_COURSE: 'ระยะสั้น'
    };
    const calcUpper = String(calculation_type || 'all').toUpperCase();
    const calcLabel = CALC_LABELS[calcUpper] || 'ทุกประเภทงบ';
    const isSpecial = ['SPECIAL_SUPPLEMENTARY', 'DUAL_EDUCATION', 'SHORT_COURSE'].includes(calcUpper);

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
          SELECT 
            COALESCE(ba.department_id, cg.department_id) AS department_id, 
            SUM(ba.student_count) AS student_count, 
            SUM(ba.base_budget) AS total_base_budget
          FROM budget_allocations ba
          LEFT JOIN class_groups cg ON ba.class_group_id = cg.id
          WHERE ba.academic_term_id = ? ${calcCondition}
          GROUP BY COALESCE(ba.department_id, cg.department_id)
      ) base ON d.id = base.department_id
      LEFT JOIN (
          SELECT s.source_department_id, SUM(s.share_amount) AS total_deducted
          FROM inter_department_shares s
          JOIN budget_allocations ba ON s.allocation_id = ba.id
          WHERE ba.academic_term_id = ? ${calcCondition}
          GROUP BY s.source_department_id
      ) deduct ON d.id = deduct.source_department_id
      LEFT JOIN (
          SELECT s.target_department_id, SUM(s.share_amount) AS total_transferred
          FROM inter_department_shares s
          JOIN budget_allocations ba ON s.allocation_id = ba.id
          WHERE ba.academic_term_id = ? ${calcCondition}
          GROUP BY s.target_department_id
      ) trans ON d.id = trans.target_department_id
    `;

    const deptParams: any[] = [];
    if (hasCalcType) {
      deptParams.push(term_id, calculation_type, term_id, calculation_type, term_id, calculation_type);
    } else {
      deptParams.push(term_id, term_id, term_id);
    }

    if (department_id && department_id !== 'all') {
      deptQuery += ' WHERE d.id = ?';
      deptParams.push(department_id);
    }
    deptQuery += ' ORDER BY d.id ASC';

    const [departments] = await pool.query<RowDataPacket[]>(deptQuery, deptParams);

    // 4. Fetch Itemized Allocations for this calculation type
    let allocQuery = `
      SELECT 
          ba.id,
          ba.calculation_type,
          ba.batch_name,
          ba.step_level,
          ba.school_name,
          ba.course_name,
          ba.student_count,
          ba.total_practice_hours,
          ba.rate_per_head,
          ba.base_budget,
          COALESCE(d.code, '') AS department_code,
          COALESCE(d.name, 'ไม่ระบุแผนก') AS department_name,
          COALESCE(cg.group_name, ba.batch_name, ba.course_name, ba.school_name, '-') AS group_name,
          COALESCE(el.name, '-') AS education_level
      FROM budget_allocations ba
      LEFT JOIN class_groups cg ON ba.class_group_id = cg.id
      LEFT JOIN departments d ON COALESCE(ba.department_id, cg.department_id) = d.id
      LEFT JOIN education_levels el ON cg.education_level_id = el.id
      WHERE ba.academic_term_id = ? ${calcCondition}
    `;
    const allocParams: any[] = [term_id];
    if (hasCalcType) {
      allocParams.push(calculation_type);
    }
    if (department_id && department_id !== 'all') {
      allocQuery += ' AND COALESCE(ba.department_id, cg.department_id) = ?';
      allocParams.push(department_id);
    }
    allocQuery += ' ORDER BY d.id ASC, ba.id ASC';

    const [allocations] = await pool.query<RowDataPacket[]>(allocQuery, allocParams);

    // Fetch shares for itemized allocations
    if (allocations.length > 0) {
      const allocIds = allocations.map((a) => a.id);
      const [shares] = await pool.query<RowDataPacket[]>(
        `
        SELECT 
          s.id,
          s.allocation_id,
          s.source_department_id,
          s.target_department_id,
          s.share_amount,
          s.teaching_hours,
          s.remark,
          td.name as target_department_name,
          td.code as target_department_code
        FROM inter_department_shares s
        JOIN departments td ON s.target_department_id = td.id
        WHERE s.allocation_id IN (?)
        ORDER BY s.id ASC
        `,
        [allocIds]
      );

      const sharesByAlloc: Record<number, any[]> = {};
      shares.forEach((s) => {
        if (!sharesByAlloc[s.allocation_id]) {
          sharesByAlloc[s.allocation_id] = [];
        }
        sharesByAlloc[s.allocation_id].push(s);
      });

      allocations.forEach((a) => {
        a.shares = sharesByAlloc[a.id] || [];
        a.total_shares = (a.shares as any[]).reduce((sum, s) => sum + Number(s.share_amount), 0);
        a.remaining_budget = Number(a.base_budget) - a.total_shares;
      });
    }

    // Filter departments for special calculation types
    const displayedDepartments = isSpecial
      ? departments.filter((dept) => {
          const base = Number(dept.base_budget || 0);
          const students = Number(dept.student_count || 0);
          const net = Number(dept.net_budget || 0);
          const deducted = Number(dept.total_deducted || 0);
          const transferred = Number(dept.total_transferred || 0);
          return base > 0 || students > 0 || net > 0 || deducted > 0 || transferred > 0;
        })
      : departments;

    // Create PDF Document (A4 Landscape)
    const doc = new PDFDocument({ margin: 36, size: 'A4', layout: 'landscape' });

    // Register Thai font
    const fontPaths = getFontPaths();
    if (fontPaths) {
      doc.registerFont('THSarabun', fontPaths.regular);
      doc.registerFont('THSarabun-Bold', fontPaths.bold);
    }
    const fontRegular = fontPaths ? 'THSarabun' : 'Helvetica';
    const fontBold = fontPaths ? 'THSarabun-Bold' : 'Helvetica-Bold';

    const calcFileSuffix = hasCalcType ? `_${calcUpper.toLowerCase()}` : '_all';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="training_budget_report_${term.semester}_${term.academic_year}${calcFileSuffix}.pdf"`
    );

    doc.pipe(res);

    // Header Title (Centered across 769 pt)
    doc.font(fontBold).fontSize(16).text(collegeName, 36, 36, { width: 769, align: 'center' });
    doc.font(fontRegular).fontSize(12).text(`${deptName} • ${affiliation}`, 36, doc.y, { width: 769, align: 'center' });
    doc.font(fontBold).fontSize(13.5).text(
      `รายงานสรุปการจัดสรรงบประมาณค่าวัสดุฝึกปฏิบัติการ (${calcLabel}) ประจำภาคเรียนที่ ${term.semester} ปีการศึกษา ${term.academic_year}`,
      36,
      doc.y,
      { width: 769, align: 'center' }
    );
    doc.font(fontRegular).fontSize(9.5).text(
      `สถานะงวด: ${term.status === 'OPEN' ? 'เปิดงวดจัดสรร (OPEN)' : 'ปิดงวด (CLOSED)'}  |  พิมพ์เมื่อ: ${new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}`,
      36,
      doc.y,
      { width: 769, align: 'center' }
    );
    doc.moveDown(0.8);

    // ==========================================
    // Table 1: Summary / Reconciliation Table
    // ==========================================
    doc.font(fontBold).fontSize(11).fillColor('#0f172a').text(
      `1. ตารางสรุปงบประมาณสุทธิรายแผนก (${calcLabel})`,
      36,
      doc.y
    );
    doc.moveDown(0.3);

    const drawDeptTableHeader = (topY: number) => {
      doc.rect(36, topY - 3, 769, 20).fill('#f1f5f9');
      doc.fillColor('#0f172a');
      doc.font(fontBold).fontSize(10);

      if (isSpecial) {
        doc.text('แผนกวิชา', 42, topY + 2);
        doc.text('จำนวนคน (คน)', 280, topY + 2, { width: 90, align: 'right' });
        doc.text('งบตั้งต้น (+)', 380, topY + 2, { width: 100, align: 'right' });
        doc.text('หักจ่าย (-)', 490, topY + 2, { width: 95, align: 'right' });
        doc.text('รับโอน (+)', 595, topY + 2, { width: 95, align: 'right' });
        doc.text(`งบสุทธิ ${calcLabel}`, 700, topY + 2, { width: 100, align: 'right' });
      } else {
        doc.text('รหัสแผนก', 42, topY + 2);
        doc.text('ชื่อแผนกวิชา', 105, topY + 2);
        doc.text('นักเรียน (คน)', 345, topY + 2, { width: 85, align: 'right' });
        doc.text('งบตั้งต้น (บาท)', 440, topY + 2, { width: 100, align: 'right' });
        doc.text('หักปันส่วน (-)', 550, topY + 2, { width: 80, align: 'right' });
        doc.text('รับโอน (+)', 640, topY + 2, { width: 75, align: 'right' });
        doc.text('งบสุทธิคงเหลือ', 720, topY + 2, { width: 80, align: 'right' });
      }

      doc.moveTo(36, topY + 18).lineTo(805, topY + 18).stroke('#cbd5e1');
    };

    const tableTop = doc.y;
    drawDeptTableHeader(tableTop);

    let currentY = tableTop + 24;
    doc.font(fontRegular);

    let totalStudents = 0;
    let totalBase = 0;
    let totalDeduct = 0;
    let totalTrans = 0;
    let totalNet = 0;

    if (displayedDepartments.length === 0) {
      doc.rect(36, currentY - 2, 769, 22).fill('#f8fafc');
      doc.fillColor('#64748b').font(fontRegular).fontSize(10);
      doc.text(`ยังไม่มีข้อมูลของ${calcLabel}ในงวดนี้ (แสดงเฉพาะแผนกที่มีข้อมูล)`, 36, currentY + 3, {
        width: 769,
        align: 'center'
      });
      currentY += 26;
    } else {
      displayedDepartments.forEach((dept, index) => {
        if (currentY > 490) {
          doc.addPage({ size: 'A4', layout: 'landscape', margin: 36 });
          currentY = 36;
          drawDeptTableHeader(currentY);
          currentY += 24;
        }

        const students = Number(dept.student_count || 0);
        const base = Number(dept.base_budget || 0);
        const deducted = Number(dept.total_deducted || 0);
        const transferred = Number(dept.total_transferred || 0);
        const net = Number(dept.net_budget || 0);

        totalStudents += students;
        totalBase += base;
        totalDeduct += deducted;
        totalTrans += transferred;
        totalNet += net;

        // Alternating row background
        if (index % 2 === 1) {
          doc.rect(36, currentY - 2, 769, 16).fill('#f8fafc');
        }
        doc.fillColor('#1e293b');
        doc.fontSize(10);

        if (isSpecial) {
          doc.text(dept.department_name || '', 42, currentY, { width: 230, ellipsis: true });
          doc.text(students > 0 ? students.toLocaleString() : '-', 280, currentY, { width: 90, align: 'right' });
          doc.text(base.toLocaleString('th-TH', { minimumFractionDigits: 2 }), 380, currentY, { width: 100, align: 'right' });
          doc.text(deducted > 0 ? deducted.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-', 490, currentY, { width: 95, align: 'right' });
          doc.text(transferred > 0 ? transferred.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-', 595, currentY, { width: 95, align: 'right' });
          doc.text(net.toLocaleString('th-TH', { minimumFractionDigits: 2 }), 700, currentY, { width: 100, align: 'right' });
        } else {
          doc.text(dept.department_code || '', 42, currentY);
          doc.text(dept.department_name || '', 105, currentY, { width: 230, ellipsis: true });
          doc.text(students > 0 ? students.toLocaleString() : '-', 345, currentY, { width: 85, align: 'right' });
          doc.text(base.toLocaleString('th-TH', { minimumFractionDigits: 2 }), 440, currentY, { width: 100, align: 'right' });
          doc.text(deducted > 0 ? deducted.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-', 550, currentY, { width: 80, align: 'right' });
          doc.text(transferred > 0 ? transferred.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-', 640, currentY, { width: 75, align: 'right' });
          doc.text(net.toLocaleString('th-TH', { minimumFractionDigits: 2 }), 720, currentY, { width: 80, align: 'right' });
        }

        currentY += 17;
      });

      // Total Summary Line
      doc.moveTo(36, currentY).lineTo(805, currentY).stroke('#475569');
      currentY += 4;
      doc.rect(36, currentY - 2, 769, 19).fill('#e2e8f0');
      doc.fillColor('#0f172a');
      doc.font(fontBold).fontSize(10.5);

      if (isSpecial) {
        doc.text(`รวมทั้งสิ้น (${displayedDepartments.length} แผนก)`, 42, currentY + 2);
        doc.text(totalStudents.toLocaleString(), 280, currentY + 2, { width: 90, align: 'right' });
        doc.text(totalBase.toLocaleString('th-TH', { minimumFractionDigits: 2 }), 380, currentY + 2, { width: 100, align: 'right' });
        doc.text(totalDeduct.toLocaleString('th-TH', { minimumFractionDigits: 2 }), 490, currentY + 2, { width: 95, align: 'right' });
        doc.text(totalTrans.toLocaleString('th-TH', { minimumFractionDigits: 2 }), 595, currentY + 2, { width: 95, align: 'right' });
        doc.text(totalNet.toLocaleString('th-TH', { minimumFractionDigits: 2 }), 700, currentY + 2, { width: 100, align: 'right' });
      } else {
        doc.text('รวมทั้งสิ้น (TOTAL SUMMARY)', 105, currentY + 2);
        doc.text(totalStudents.toLocaleString(), 345, currentY + 2, { width: 85, align: 'right' });
        doc.text(totalBase.toLocaleString('th-TH', { minimumFractionDigits: 2 }), 440, currentY + 2, { width: 100, align: 'right' });
        doc.text(totalDeduct.toLocaleString('th-TH', { minimumFractionDigits: 2 }), 550, currentY + 2, { width: 80, align: 'right' });
        doc.text(totalTrans.toLocaleString('th-TH', { minimumFractionDigits: 2 }), 640, currentY + 2, { width: 75, align: 'right' });
        doc.text(totalNet.toLocaleString('th-TH', { minimumFractionDigits: 2 }), 720, currentY + 2, { width: 80, align: 'right' });
      }
      currentY += 21;
    }

    // ==========================================
    // Table 2: Itemized Allocations Table
    // ==========================================
    if (allocations.length > 0) {
      currentY += 15;
      if (currentY > 460) {
        doc.addPage({ size: 'A4', layout: 'landscape', margin: 36 });
        currentY = 36;
      }

      doc.font(fontBold).fontSize(11).fillColor('#0f172a').text(
        `2. ตารางกระทบยอดรายการจัดสรร / รายวิชา (${calcLabel} - ทั้งหมด ${allocations.length} รายการ)`,
        36,
        currentY
      );
      currentY += 16;

      const drawAllocTableHeader = (topY: number) => {
        doc.rect(36, topY - 3, 769, 20).fill('#e0e7ff');
        doc.fillColor('#1e1b4b').font(fontBold).fontSize(9);

        if (calcUpper === 'SPECIAL_SUPPLEMENTARY') {
          doc.text('แผนกวิชา', 42, topY + 2);
          doc.text('ชื่อรุ่น', 260, topY + 2);
          doc.text('จำนวนคน (คน)', 500, topY + 2, { width: 90, align: 'right' });
          doc.text('เงินต่อหัว (บาท)', 600, topY + 2, { width: 95, align: 'right' });
          doc.text('รวม (บาท)', 705, topY + 2, { width: 95, align: 'right' });
        } else if (calcUpper === 'DUAL_EDUCATION') {
          doc.text('แผนกวิชา', 42, topY + 2);
          doc.text('ขั้น', 230, topY + 2, { width: 60, align: 'center' });
          doc.text('โรงเรียน', 300, topY + 2);
          doc.text('จำนวนคน (คน)', 510, topY + 2, { width: 85, align: 'right' });
          doc.text('เงินต่อหัว (บาท)', 605, topY + 2, { width: 90, align: 'right' });
          doc.text('รวม (บาท)', 705, topY + 2, { width: 95, align: 'right' });
        } else if (calcUpper === 'SHORT_COURSE') {
          doc.text('แผนกวิชา', 42, topY + 2);
          doc.text('โรงเรียน / หน่วยงาน', 210, topY + 2);
          doc.text('รายวิชา', 400, topY + 2);
          doc.text('จำนวนคน (คน)', 580, topY + 2, { width: 65, align: 'right' });
          doc.text('เงินต่อหัว (บาท)', 655, topY + 2, { width: 70, align: 'right' });
          doc.text('รวม (บาท)', 730, topY + 2, { width: 72, align: 'right' });
        } else if (calcUpper === 'REGULAR') {
          doc.text('กลุ่มเรียน / แผนกวิชา', 40, topY + 2);
          doc.text('ระดับ', 205, topY + 2, { width: 50, align: 'center' });
          doc.text('จำนวน นร. (คน)', 260, topY + 2, { width: 55, align: 'right' });
          doc.text('ชม.ฝึก (ชม.)', 320, topY + 2, { width: 50, align: 'right' });
          doc.text('เงินต่อหัว (บาท)', 375, topY + 2, { width: 60, align: 'right' });
          doc.text('รวมงบตั้งต้น (บาท)', 440, topY + 2, { width: 85, align: 'right' });
          doc.text('ปันส่วนสอนช่วย', 535, topY + 2);
          doc.text('งบสุทธิคงเหลือ (บาท)', 715, topY + 2, { width: 85, align: 'right' });
        } else {
          // ALL
          doc.text('รายการ / แผนก', 40, topY + 2);
          doc.text('ประเภท', 195, topY + 2, { width: 65, align: 'center' });
          doc.text('ข้อมูลจำเพาะ', 265, topY + 2);
          doc.text('จำนวนคน', 385, topY + 2, { width: 50, align: 'right' });
          doc.text('เงินต่อหัว', 440, topY + 2, { width: 55, align: 'right' });
          doc.text('งบตั้งต้น (บาท)', 500, topY + 2, { width: 80, align: 'right' });
          doc.text('ปันส่วนสอนช่วย (บาท)', 585, topY + 2, { width: 115, align: 'right' });
          doc.text('งบคงเหลือ (บาท)', 705, topY + 2, { width: 95, align: 'right' });
        }

        doc.moveTo(36, topY + 18).lineTo(805, topY + 18).stroke('#a5b4fc');
      };

      drawAllocTableHeader(currentY);
      currentY += 23;

      let sumAllocStudents = 0;
      let sumAllocBase = 0;
      let sumAllocDeduct = 0;
      let sumAllocNet = 0;

      allocations.forEach((alloc, index) => {
        const count = Number(alloc.student_count || 0);
        const rate = Number(alloc.rate_per_head || 0);
        const base = Number(alloc.base_budget || 0);
        const shares = (alloc.shares as any[]) || [];
        const totalShares = Number(alloc.total_shares || 0);
        const netRemain = Number(alloc.remaining_budget !== undefined ? alloc.remaining_budget : base);

        sumAllocStudents += count;
        sumAllocBase += base;
        sumAllocDeduct += totalShares;
        sumAllocNet += netRemain;

        const rowHeight = calcUpper === 'REGULAR' && shares.length > 1
          ? Math.max(22, shares.length * 10 + 6)
          : (calcUpper === 'REGULAR' || calcUpper === 'ALL' ? 22 : 18);

        if (currentY + rowHeight > 490) {
          doc.addPage({ size: 'A4', layout: 'landscape', margin: 36 });
          currentY = 36;
          drawAllocTableHeader(currentY);
          currentY += 23;
        }

        if (index % 2 === 1) {
          doc.rect(36, currentY - 2, 769, rowHeight).fill('#f8fafc');
        }
        doc.fillColor('#1e293b');

        if (calcUpper === 'SPECIAL_SUPPLEMENTARY') {
          doc.font(fontRegular).fontSize(9);
          doc.text(alloc.department_name || '', 42, currentY, { width: 210, ellipsis: true });
          doc.text(alloc.batch_name || alloc.group_name || '-', 260, currentY, { width: 230, ellipsis: true });
          doc.text(count.toLocaleString(), 500, currentY, { width: 90, align: 'right' });
          doc.text(rate.toLocaleString('th-TH', { minimumFractionDigits: 2 }), 600, currentY, { width: 95, align: 'right' });
          doc.text(base.toLocaleString('th-TH', { minimumFractionDigits: 2 }), 705, currentY, { width: 95, align: 'right' });
        } else if (calcUpper === 'DUAL_EDUCATION') {
          doc.font(fontRegular).fontSize(9);
          doc.text(alloc.department_name || '', 42, currentY, { width: 180, ellipsis: true });
          doc.text(alloc.step_level || '-', 230, currentY, { width: 60, align: 'center' });
          doc.text(alloc.school_name || '-', 300, currentY, { width: 200, ellipsis: true });
          doc.text(count.toLocaleString(), 510, currentY, { width: 85, align: 'right' });
          doc.text(rate.toLocaleString('th-TH', { minimumFractionDigits: 2 }), 605, currentY, { width: 90, align: 'right' });
          doc.text(base.toLocaleString('th-TH', { minimumFractionDigits: 2 }), 705, currentY, { width: 95, align: 'right' });
        } else if (calcUpper === 'SHORT_COURSE') {
          doc.font(fontRegular).fontSize(9);
          doc.text(alloc.department_name || '', 42, currentY, { width: 160, ellipsis: true });
          doc.text(alloc.school_name || '-', 210, currentY, { width: 180, ellipsis: true });
          doc.text(alloc.course_name || '-', 400, currentY, { width: 170, ellipsis: true });
          doc.text(count.toLocaleString(), 580, currentY, { width: 65, align: 'right' });
          doc.text(rate.toLocaleString('th-TH', { minimumFractionDigits: 2 }), 655, currentY, { width: 70, align: 'right' });
          doc.text(base.toLocaleString('th-TH', { minimumFractionDigits: 2 }), 730, currentY, { width: 72, align: 'right' });
        } else if (calcUpper === 'REGULAR') {
          // ภาคปกติ: กลุ่มเรียน / แผนก, ระดับ, จำนวน นร., ชม.ฝึก, เงินต่อหัว, รวมงบตั้งต้น, ปันส่วนสอนช่วย, งบสุทธิคงเหลือ
          doc.font(fontBold).fontSize(8.5);
          doc.text(alloc.group_name || '-', 40, currentY, { width: 160, ellipsis: true });
          doc.font(fontRegular).fontSize(7.5).fillColor('#64748b');
          doc.text(alloc.department_name || '', 40, currentY + 10, { width: 160, ellipsis: true });

          doc.fillColor('#1e293b').font(fontRegular).fontSize(8.5);
          doc.text(alloc.education_level || '-', 205, currentY + 2, { width: 50, align: 'center' });
          doc.text(count.toLocaleString(), 260, currentY + 2, { width: 55, align: 'right' });
          doc.text(alloc.total_practice_hours !== undefined && alloc.total_practice_hours !== null ? String(alloc.total_practice_hours) : '-', 320, currentY + 2, { width: 50, align: 'right' });
          doc.text(rate.toLocaleString('th-TH'), 375, currentY + 2, { width: 60, align: 'right' });
          doc.text(base.toLocaleString('th-TH', { minimumFractionDigits: 2 }), 440, currentY + 2, { width: 85, align: 'right' });

          // Shares column
          if (shares.length > 0) {
            let shareY = currentY;
            shares.forEach((s) => {
              const teachText = s.teaching_hours !== undefined && s.teaching_hours !== null && Number(s.teaching_hours) > 0
                ? `${Number(s.teaching_hours)} ชม.`
                : '';
              const prefix = teachText ? `${s.target_department_name} (${teachText})` : s.target_department_name;
              doc.fontSize(7.5).fillColor('#92400e');
              doc.text(`${prefix}:`, 535, shareY, { width: 105, ellipsis: true });
              doc.text(`${Number(s.share_amount).toLocaleString('th-TH')} ฿`, 645, shareY, { width: 60, align: 'right' });
              shareY += 10;
            });
            doc.fillColor('#1e293b');
          } else {
            doc.fontSize(8.5).fillColor('#94a3b8');
            doc.text('-', 535, currentY + 2, { width: 170, align: 'center' });
            doc.fillColor('#1e293b');
          }

          // Net remaining
          doc.font(fontBold).fontSize(8.5).fillColor('#047857');
          doc.text(netRemain.toLocaleString('th-TH', { minimumFractionDigits: 2 }), 715, currentY + 2, { width: 85, align: 'right' });
          doc.fillColor('#1e293b');
        } else {
          // ALL (ทุกประเภทงบ)
          const typeName = CALC_LABELS[alloc.calculation_type] || alloc.calculation_type || 'ภาคปกติ';
          doc.font(fontBold).fontSize(8.5);
          doc.text(alloc.group_name || alloc.batch_name || alloc.course_name || '-', 40, currentY, { width: 150, ellipsis: true });
          doc.font(fontRegular).fontSize(7.5).fillColor('#64748b');
          doc.text(alloc.department_name || '', 40, currentY + 10, { width: 150, ellipsis: true });

          doc.fillColor('#1e293b').font(fontRegular).fontSize(8.5);
          doc.text(typeName, 195, currentY + 2, { width: 65, align: 'center' });

          let detailText = alloc.education_level || '-';
          if (alloc.calculation_type === 'SPECIAL_SUPPLEMENTARY') {
            detailText = alloc.batch_name || '-';
          } else if (alloc.calculation_type === 'DUAL_EDUCATION') {
            detailText = `${alloc.school_name || '-'}${alloc.step_level ? ` (${alloc.step_level})` : ''}`;
          } else if (alloc.calculation_type === 'SHORT_COURSE') {
            detailText = `${alloc.course_name || '-'}${alloc.school_name ? ` (${alloc.school_name})` : ''}`;
          }
          doc.text(detailText, 265, currentY + 2, { width: 115, ellipsis: true });
          doc.text(count.toLocaleString(), 385, currentY + 2, { width: 50, align: 'right' });
          doc.text(rate.toLocaleString('th-TH'), 440, currentY + 2, { width: 55, align: 'right' });
          doc.text(base.toLocaleString('th-TH', { minimumFractionDigits: 2 }), 500, currentY + 2, { width: 80, align: 'right' });

          if (totalShares > 0) {
            doc.fillColor('#be123c').text(`(${totalShares.toLocaleString('th-TH', { minimumFractionDigits: 2 })})`, 585, currentY + 2, { width: 115, align: 'right' });
            doc.fillColor('#1e293b');
          } else {
            doc.fillColor('#94a3b8').text('-', 585, currentY + 2, { width: 115, align: 'center' });
            doc.fillColor('#1e293b');
          }

          doc.font(fontBold).fillColor('#047857').text(netRemain.toLocaleString('th-TH', { minimumFractionDigits: 2 }), 705, currentY + 2, { width: 95, align: 'right' });
          doc.fillColor('#1e293b');
        }

        currentY += rowHeight;
      });

      // Total Line for Allocations
      doc.moveTo(36, currentY).lineTo(805, currentY).stroke('#a5b4fc');
      currentY += 4;
      doc.rect(36, currentY - 2, 769, 19).fill('#e0e7ff');
      doc.fillColor('#1e1b4b').font(fontBold).fontSize(9);

      if (calcUpper === 'SPECIAL_SUPPLEMENTARY') {
        doc.text(`รวมรายการจัดสรรทั้งสิ้น (${allocations.length} รายการ)`, 42, currentY + 2);
        doc.text(sumAllocStudents.toLocaleString(), 500, currentY + 2, { width: 90, align: 'right' });
        doc.text(sumAllocBase.toLocaleString('th-TH', { minimumFractionDigits: 2 }), 705, currentY + 2, { width: 95, align: 'right' });
      } else if (calcUpper === 'DUAL_EDUCATION') {
        doc.text(`รวมรายการจัดสรรทั้งสิ้น (${allocations.length} รายการ)`, 42, currentY + 2);
        doc.text(sumAllocStudents.toLocaleString(), 510, currentY + 2, { width: 85, align: 'right' });
        doc.text(sumAllocBase.toLocaleString('th-TH', { minimumFractionDigits: 2 }), 705, currentY + 2, { width: 95, align: 'right' });
      } else if (calcUpper === 'SHORT_COURSE') {
        doc.text(`รวมรายการจัดสรรทั้งสิ้น (${allocations.length} รายการ)`, 42, currentY + 2);
        doc.text(sumAllocStudents.toLocaleString(), 580, currentY + 2, { width: 65, align: 'right' });
        doc.text(sumAllocBase.toLocaleString('th-TH', { minimumFractionDigits: 2 }), 730, currentY + 2, { width: 72, align: 'right' });
      } else if (calcUpper === 'REGULAR') {
        doc.text(`รวมรายการจัดสรร (${allocations.length} รายการ)`, 40, currentY + 2);
        doc.text(sumAllocStudents.toLocaleString(), 260, currentY + 2, { width: 55, align: 'right' });
        doc.text(sumAllocBase.toLocaleString('th-TH', { minimumFractionDigits: 2 }), 440, currentY + 2, { width: 85, align: 'right' });
        if (sumAllocDeduct > 0) {
          doc.text(`(${sumAllocDeduct.toLocaleString('th-TH', { minimumFractionDigits: 2 })})`, 535, currentY + 2, { width: 170, align: 'right' });
        } else {
          doc.text('-', 535, currentY + 2, { width: 170, align: 'center' });
        }
        doc.text(sumAllocNet.toLocaleString('th-TH', { minimumFractionDigits: 2 }), 715, currentY + 2, { width: 85, align: 'right' });
      } else {
        // ALL
        doc.text(`รวมรายการจัดสรร (${allocations.length} รายการ)`, 40, currentY + 2);
        doc.text(sumAllocStudents.toLocaleString(), 385, currentY + 2, { width: 50, align: 'right' });
        doc.text(sumAllocBase.toLocaleString('th-TH', { minimumFractionDigits: 2 }), 500, currentY + 2, { width: 80, align: 'right' });
        if (sumAllocDeduct > 0) {
          doc.text(`(${sumAllocDeduct.toLocaleString('th-TH', { minimumFractionDigits: 2 })})`, 585, currentY + 2, { width: 115, align: 'right' });
        } else {
          doc.text('-', 585, currentY + 2, { width: 115, align: 'center' });
        }
        doc.text(sumAllocNet.toLocaleString('th-TH', { minimumFractionDigits: 2 }), 705, currentY + 2, { width: 95, align: 'right' });
      }

      currentY += 21;
    }

    // ==========================================
    // Footer Signatures (Landscape - 3 Columns)
    // ==========================================
    currentY += 30;
    if (currentY > 440) {
      doc.addPage({ size: 'A4', layout: 'landscape', margin: 36 });
      currentY = 45;
    }

    const sigY = currentY;
    const colWidth = 210;
    const col1X = 60;
    const col2X = 315;
    const col3X = 570;

    doc.fillColor('#1e293b');
    doc.font(fontRegular).fontSize(10);

    // Signature 1: Operator
    doc.text('ลงชื่อ .....................................................', col1X, sigY, { width: colWidth, align: 'center' });
    doc.text(`( ${operatorName} )`, col1X, sigY + 16, { width: colWidth, align: 'center' });
    doc.text('เจ้าหน้าที่ผู้จัดทำงบประมาณ', col1X, sigY + 32, { width: colWidth, align: 'center' });

    // Signature 2: Planner (Red: หัวหน้างานพัฒนายุทธศาสตร์แผนงานและงบประมาณ)
    doc.text('ลงชื่อ .....................................................', col2X, sigY, { width: colWidth, align: 'center' });
    doc.text(`( ${displayPlannerName} )`, col2X, sigY + 16, { width: colWidth, align: 'center' });
    doc.text(plannerTitle, col2X, sigY + 32, { width: colWidth, align: 'center', lineGap: -1 });

    // Signature 3: Director (LightGreen: ผู้บริหาร - ผู้อำนวยการวิทยาลัย...)
    doc.text('ลงชื่อ .....................................................', col3X, sigY, { width: colWidth, align: 'center' });
    doc.text(`( ${displayDirectorName} )`, col3X, sigY + 16, { width: colWidth, align: 'center' });
    doc.text(directorTitle, col3X, sigY + 32, { width: colWidth, align: 'center' });

    doc.end();
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
