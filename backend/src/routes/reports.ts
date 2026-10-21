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

// GET /api/v1/reports/pdf?term_id={id}&department_id={id|all}&calculation_type={type|all}
router.get('/pdf', async (req: Request, res: Response): Promise<void> => {
  const { term_id, department_id, calculation_type } = req.query;

  if (!term_id) {
    res.status(400).json({ success: false, message: 'term_id is required' });
    return;
  }

  const isDeptReport = Boolean(department_id && department_id !== 'all');
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
          COALESCE(base.students_voc, 0) AS students_voc,
          COALESCE(base.students_high_voc, 0) AS students_high_voc,
          COALESCE(base.students_prison, 0) AS students_prison,
          COALESCE(base.total_base_budget, 0.00) AS base_budget,
          COALESCE(base.base_voc, 0.00) AS base_voc,
          COALESCE(base.base_high_voc, 0.00) AS base_high_voc,
          COALESCE(base.base_prison, 0.00) AS base_prison,
          COALESCE(deduct.total_deducted, 0.00) AS total_deducted,
          COALESCE(deduct.deduct_voc, 0.00) AS deduct_voc,
          COALESCE(deduct.deduct_high_voc, 0.00) AS deduct_high_voc,
          COALESCE(deduct.deduct_prison, 0.00) AS deduct_prison,
          COALESCE(trans.total_transferred, 0.00) AS total_transferred,
          COALESCE(trans.trans_voc, 0.00) AS trans_voc,
          COALESCE(trans.trans_high_voc, 0.00) AS trans_high_voc,
          COALESCE(trans.trans_prison, 0.00) AS trans_prison,
          (COALESCE(base.total_base_budget, 0.00) 
           - COALESCE(deduct.total_deducted, 0.00) 
           + COALESCE(trans.total_transferred, 0.00)) AS net_budget,
          (COALESCE(base.base_voc, 0.00)
           - COALESCE(deduct.deduct_voc, 0.00) 
           + COALESCE(trans.trans_voc, 0.00)) AS net_voc,
          (COALESCE(base.base_high_voc, 0.00)
           - COALESCE(deduct.deduct_high_voc, 0.00) 
           + COALESCE(trans.trans_high_voc, 0.00)) AS net_high_voc,
          (COALESCE(base.base_prison, 0.00)
           - COALESCE(deduct.deduct_prison, 0.00) 
           + COALESCE(trans.trans_prison, 0.00)) AS net_prison,
          (COALESCE(base.base_regular, 0.00)
           - COALESCE(deduct.deduct_regular, 0.00) 
           + COALESCE(trans.trans_regular, 0.00)) AS net_regular,
          (COALESCE(base.base_special_supplementary, 0.00)
           - COALESCE(deduct.deduct_special_supplementary, 0.00) 
           + COALESCE(trans.trans_special_supplementary, 0.00)) AS net_special_supplementary,
          (COALESCE(base.base_dual_education, 0.00)
           - COALESCE(deduct.deduct_dual_education, 0.00) 
           + COALESCE(trans.trans_dual_education, 0.00)) AS net_dual_education,
          (COALESCE(base.base_short_course, 0.00)
           - COALESCE(deduct.deduct_short_course, 0.00) 
           + COALESCE(trans.trans_short_course, 0.00)) AS net_short_course
      FROM departments d
      LEFT JOIN (
          SELECT 
            COALESCE(ba.department_id, cg.department_id) AS department_id, 
            SUM(ba.student_count) AS student_count, 
            SUM(CASE WHEN cg.education_level_id = 1 THEN ba.student_count ELSE 0 END) AS students_voc,
            SUM(CASE WHEN cg.education_level_id = 2 THEN ba.student_count ELSE 0 END) AS students_high_voc,
            SUM(CASE WHEN cg.education_level_id = 3 THEN ba.student_count ELSE 0 END) AS students_prison,
            SUM(ba.base_budget) AS total_base_budget,
            SUM(CASE WHEN cg.education_level_id = 1 THEN ba.base_budget ELSE 0 END) AS base_voc,
            SUM(CASE WHEN cg.education_level_id = 2 THEN ba.base_budget ELSE 0 END) AS base_high_voc,
            SUM(CASE WHEN cg.education_level_id = 3 THEN ba.base_budget ELSE 0 END) AS base_prison,
            SUM(CASE WHEN ba.calculation_type = 'REGULAR' OR ba.calculation_type IS NULL THEN ba.base_budget ELSE 0 END) AS base_regular,
            SUM(CASE WHEN ba.calculation_type = 'SPECIAL_SUPPLEMENTARY' THEN ba.base_budget ELSE 0 END) AS base_special_supplementary,
            SUM(CASE WHEN ba.calculation_type = 'DUAL_EDUCATION' THEN ba.base_budget ELSE 0 END) AS base_dual_education,
            SUM(CASE WHEN ba.calculation_type = 'SHORT_COURSE' THEN ba.base_budget ELSE 0 END) AS base_short_course
          FROM budget_allocations ba
          LEFT JOIN class_groups cg ON ba.class_group_id = cg.id
          WHERE ba.academic_term_id = ? ${calcCondition}
          GROUP BY COALESCE(ba.department_id, cg.department_id)
      ) base ON d.id = base.department_id
      LEFT JOIN (
          SELECT 
            s.source_department_id, 
            SUM(s.share_amount) AS total_deducted,
            SUM(CASE WHEN cg.education_level_id = 1 THEN s.share_amount ELSE 0 END) AS deduct_voc,
            SUM(CASE WHEN cg.education_level_id = 2 THEN s.share_amount ELSE 0 END) AS deduct_high_voc,
            SUM(CASE WHEN cg.education_level_id = 3 THEN s.share_amount ELSE 0 END) AS deduct_prison,
            SUM(CASE WHEN ba.calculation_type = 'REGULAR' OR ba.calculation_type IS NULL THEN s.share_amount ELSE 0 END) AS deduct_regular,
            SUM(CASE WHEN ba.calculation_type = 'SPECIAL_SUPPLEMENTARY' THEN s.share_amount ELSE 0 END) AS deduct_special_supplementary,
            SUM(CASE WHEN ba.calculation_type = 'DUAL_EDUCATION' THEN s.share_amount ELSE 0 END) AS deduct_dual_education,
            SUM(CASE WHEN ba.calculation_type = 'SHORT_COURSE' THEN s.share_amount ELSE 0 END) AS deduct_short_course
          FROM inter_department_shares s
          JOIN budget_allocations ba ON s.allocation_id = ba.id
          LEFT JOIN class_groups cg ON ba.class_group_id = cg.id
          WHERE ba.academic_term_id = ? ${calcCondition}
          GROUP BY s.source_department_id
      ) deduct ON d.id = deduct.source_department_id
      LEFT JOIN (
          SELECT 
            s.target_department_id, 
            SUM(s.share_amount) AS total_transferred,
            SUM(CASE WHEN cg.education_level_id = 1 THEN s.share_amount ELSE 0 END) AS trans_voc,
            SUM(CASE WHEN cg.education_level_id = 2 THEN s.share_amount ELSE 0 END) AS trans_high_voc,
            SUM(CASE WHEN cg.education_level_id = 3 THEN s.share_amount ELSE 0 END) AS trans_prison,
            SUM(CASE WHEN ba.calculation_type = 'REGULAR' OR ba.calculation_type IS NULL THEN s.share_amount ELSE 0 END) AS trans_regular,
            SUM(CASE WHEN ba.calculation_type = 'SPECIAL_SUPPLEMENTARY' THEN s.share_amount ELSE 0 END) AS trans_special_supplementary,
            SUM(CASE WHEN ba.calculation_type = 'DUAL_EDUCATION' THEN s.share_amount ELSE 0 END) AS trans_dual_education,
            SUM(CASE WHEN ba.calculation_type = 'SHORT_COURSE' THEN s.share_amount ELSE 0 END) AS trans_short_course
          FROM inter_department_shares s
          JOIN budget_allocations ba ON s.allocation_id = ba.id
          LEFT JOIN class_groups cg ON ba.class_group_id = cg.id
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

    if (isDeptReport) {
      deptQuery += ' WHERE d.id = ?';
      deptParams.push(department_id);
    }
    deptQuery += ' ORDER BY d.id ASC';

    const [departments] = await pool.query<RowDataPacket[]>(deptQuery, deptParams);

    if (isDeptReport && departments.length === 0) {
      res.status(404).json({ success: false, message: 'ไม่พบข้อมูลแผนกวิชาที่ระบุ' });
      return;
    }

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
    const formattedDate = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });

    // Reusable function to draw signatures
    const drawSignatures = (targetDoc: PDFKit.PDFDocument, startY: number) => {
      let currentY = startY + 28;
      if (currentY > 440) {
        targetDoc.addPage({ size: 'A4', layout: 'landscape', margin: 36 });
        currentY = 45;
      }

      const sigY = currentY;
      const colWidth = 210;
      const col1X = 60;
      const col2X = 315;
      const col3X = 570;

      targetDoc.fillColor('#1e293b');
      targetDoc.font(fontRegular).fontSize(10);

      // Signature 1: Operator
      targetDoc.text('ลงชื่อ .....................................................', col1X, sigY, { width: colWidth, align: 'center' });
      targetDoc.text(`( ${operatorName} )`, col1X, sigY + 16, { width: colWidth, align: 'center' });
      targetDoc.text('เจ้าหน้าที่ผู้จัดทำงบประมาณ', col1X, sigY + 32, { width: colWidth, align: 'center' });

      // Signature 2: Planner (หัวหน้างานพัฒนายุทธศาสตร์แผนงานและงบประมาณ)
      targetDoc.text('ลงชื่อ .....................................................', col2X, sigY, { width: colWidth, align: 'center' });
      targetDoc.text(`( ${displayPlannerName} )`, col2X, sigY + 16, { width: colWidth, align: 'center' });
      targetDoc.text(plannerTitle, col2X, sigY + 32, { width: colWidth, align: 'center', lineGap: -1 });

      // Signature 3: Director (ผู้บริหาร)
      targetDoc.text('ลงชื่อ .....................................................', col3X, sigY, { width: colWidth, align: 'center' });
      targetDoc.text(`( ${displayDirectorName} )`, col3X, sigY + 16, { width: colWidth, align: 'center' });
      targetDoc.text(directorTitle, col3X, sigY + 32, { width: colWidth, align: 'center' });
    };

    // =========================================================================
    // BRANCH A: รายงานรายแผนก (Department-Specific Report: department_id !== 'all')
    // =========================================================================
    if (isDeptReport) {
      const currentDept = departments[0];

      // Fetch 1: Base allocations belonging to this department
      let baseAllocQuery = `
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
          COALESCE(cg.group_name, ba.batch_name, ba.course_name, ba.school_name, '-') AS item_name,
          COALESCE(el.name, '-') AS education_level
        FROM budget_allocations ba
        LEFT JOIN class_groups cg ON ba.class_group_id = cg.id
        LEFT JOIN education_levels el ON cg.education_level_id = el.id
        WHERE ba.academic_term_id = ? 
          AND COALESCE(ba.department_id, cg.department_id) = ?
          ${calcCondition}
        ORDER BY ba.id ASC
      `;
      const baseAllocParams: any[] = [term_id, currentDept.department_id];
      if (hasCalcType) baseAllocParams.push(calculation_type);
      const [baseAllocs] = await pool.query<RowDataPacket[]>(baseAllocQuery, baseAllocParams);

      // Fetch 2: Transfers In (เงินรับโอนจากการที่แผนกนี้ไปช่วยสอนแผนกอื่น)
      let transInQuery = `
        SELECT 
          s.id,
          s.allocation_id,
          s.source_department_id,
          s.target_department_id,
          s.share_amount,
          s.teaching_hours,
          s.remark,
          sd.code AS source_department_code,
          sd.name AS source_department_name,
          ba.calculation_type,
          COALESCE(cg.group_name, ba.batch_name, ba.course_name, ba.school_name, '-') AS item_name
        FROM inter_department_shares s
        JOIN budget_allocations ba ON s.allocation_id = ba.id
        JOIN departments sd ON s.source_department_id = sd.id
        LEFT JOIN class_groups cg ON ba.class_group_id = cg.id
        WHERE s.target_department_id = ?
          AND ba.academic_term_id = ?
          ${calcCondition}
        ORDER BY s.id ASC
      `;
      const transInParams: any[] = [currentDept.department_id, term_id];
      if (hasCalcType) transInParams.push(calculation_type);
      const [transIn] = await pool.query<RowDataPacket[]>(transInQuery, transInParams);

      // Fetch 3: Transfers Out (เงินหักจ่ายปันส่วนให้แผนกอื่นที่มาช่วยสอนแผนกนี้)
      let transOutQuery = `
        SELECT 
          s.id,
          s.allocation_id,
          s.source_department_id,
          s.target_department_id,
          s.share_amount,
          s.teaching_hours,
          s.remark,
          td.code AS target_department_code,
          td.name AS target_department_name,
          ba.calculation_type,
          COALESCE(cg.group_name, ba.batch_name, ba.course_name, ba.school_name, '-') AS item_name
        FROM inter_department_shares s
        JOIN budget_allocations ba ON s.allocation_id = ba.id
        JOIN departments td ON s.target_department_id = td.id
        LEFT JOIN class_groups cg ON ba.class_group_id = cg.id
        WHERE s.source_department_id = ?
          AND ba.academic_term_id = ?
          ${calcCondition}
        ORDER BY s.id ASC
      `;
      const transOutParams: any[] = [currentDept.department_id, term_id];
      if (hasCalcType) transOutParams.push(calculation_type);
      const [transOut] = await pool.query<RowDataPacket[]>(transOutQuery, transOutParams);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `inline; filename="training_budget_${currentDept.department_code || 'dept'}_${term.semester}_${term.academic_year}${calcFileSuffix}.pdf"`
      );
      doc.pipe(res);

      // Official Header
      doc.font(fontBold).fontSize(16).text(collegeName, 36, 36, { width: 769, align: 'center' });
      doc.font(fontRegular).fontSize(12).text(`${deptName} • ${affiliation}`, 36, doc.y, { width: 769, align: 'center' });
      doc.font(fontBold).fontSize(14).text(
        `รายงานการจัดสรรงบประมาณค่าวัสดุฝึกปฏิบัติการ รายแผนกวิชา${currentDept.department_name} (${currentDept.department_code})`,
        36,
        doc.y,
        { width: 769, align: 'center' }
      );
      doc.font(fontBold).fontSize(12).text(
        `ประจำภาคเรียนที่ ${term.semester} ปีการศึกษา ${term.academic_year} (${calcLabel})`,
        36,
        doc.y,
        { width: 769, align: 'center' }
      );
      doc.font(fontRegular).fontSize(9.5).text(
        `สถานะงวด: ${term.status === 'OPEN' ? 'เปิดงวดจัดสรร (OPEN)' : 'ปิดงวด (CLOSED)'}  |  พิมพ์เมื่อ: ${formattedDate}`,
        36,
        doc.y,
        { width: 769, align: 'center' }
      );
      doc.moveDown(0.6);

      // ==========================================
      // ส่วนที่ 1: ตารางสรุปภาพรวมงบประมาณของแผนกวิชา
      // ==========================================
      let currentY = doc.y;
      doc.font(fontBold).fontSize(11).fillColor('#0f172a').text(
        `ส่วนที่ 1: ตารางสรุปงบประมาณของแผนกวิชา${currentDept.department_name}`,
        36,
        currentY
      );
      currentY += 16;

      // 4 Summary KPI Cards
      const cardW = 187;
      const cardH = 46;
      const gap = 6.6;

      const baseVal = Number(currentDept.base_budget || 0);
      const deductVal = Number(currentDept.total_deducted || 0);
      const transVal = Number(currentDept.total_transferred || 0);
      const netVal = Number(currentDept.net_budget || 0);

      // Card 1: งบตั้งต้น
      doc.rect(36, currentY, cardW, cardH).fillAndStroke('#f8fafc', '#cbd5e1');
      doc.rect(36, currentY, 3, cardH).fill('#3b82f6');
      doc.font(fontRegular).fontSize(8.5).fillColor('#475569').text('งบประมาณจัดสรรตั้งต้น (+)', 44, currentY + 7, { width: cardW - 14 });
      doc.font(fontBold).fontSize(12).fillColor('#1e3a8a').text(
        `${baseVal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿`,
        44,
        currentY + 22,
        { width: cardW - 14 }
      );

      // Card 2: หักจ่ายปันส่วน
      const c2X = 36 + cardW + gap;
      doc.rect(c2X, currentY, cardW, cardH).fillAndStroke('#fff1f2', '#fecdd3');
      doc.rect(c2X, currentY, 3, cardH).fill('#e11d48');
      doc.font(fontRegular).fontSize(8.5).fillColor('#9f1239').text('หักปันส่วนช่วยสอน (-)', c2X + 8, currentY + 7, { width: cardW - 14 });
      doc.font(fontBold).fontSize(12).fillColor('#be123c').text(
        `(${deductVal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) ฿`,
        c2X + 8,
        currentY + 22,
        { width: cardW - 14 }
      );

      // Card 3: รับโอนช่วยสอน
      const c3X = c2X + cardW + gap;
      doc.rect(c3X, currentY, cardW, cardH).fillAndStroke('#f0fdf4', '#bbf7d0');
      doc.rect(c3X, currentY, 3, cardH).fill('#16a34a');
      doc.font(fontRegular).fontSize(8.5).fillColor('#166534').text('รับโอนจากการช่วยสอน (+)', c3X + 8, currentY + 7, { width: cardW - 14 });
      doc.font(fontBold).fontSize(12).fillColor('#047857').text(
        `+${transVal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿`,
        c3X + 8,
        currentY + 22,
        { width: cardW - 14 }
      );

      // Card 4: งบสุทธิคงเหลือ
      const c4X = c3X + cardW + gap;
      doc.rect(c4X, currentY, cardW, cardH).fillAndStroke('#eff6ff', '#bfdbfe');
      doc.rect(c4X, currentY, 3, cardH).fill('#2563eb');
      doc.font(fontRegular).fontSize(8.5).fillColor('#1e40af').text('งบประมาณสุทธิคงเหลือ (=)', c4X + 8, currentY + 7, { width: cardW - 14 });
      doc.font(fontBold).fontSize(13).fillColor('#1e3a8a').text(
        `${netVal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿`,
        c4X + 8,
        currentY + 22,
        { width: cardW - 14 }
      );

      currentY += cardH + 10;

      // Department Matrix Summary Table
      doc.rect(36, currentY, 769, 18).fill('#f1f5f9');
      doc.fillColor('#0f172a').font(fontBold).fontSize(8.5);
      doc.text('จำแนกตามระดับการศึกษา', 42, currentY + 4, { width: 170 });
      doc.text('จำนวน นร./นศ. (คน)', 220, currentY + 4, { width: 90, align: 'right' });
      doc.text('งบตั้งต้น (+)', 320, currentY + 4, { width: 105, align: 'right' });
      doc.text('หักจ่าย (-)', 435, currentY + 4, { width: 100, align: 'right' });
      doc.text('รับโอน (+)', 545, currentY + 4, { width: 100, align: 'right' });
      doc.text('งบสุทธิคงเหลือ (=)', 655, currentY + 4, { width: 140, align: 'right' });
      doc.moveTo(36, currentY + 18).lineTo(805, currentY + 18).stroke('#cbd5e1');
      currentY += 19;

      const levelRows = [
        {
          name: 'ระดับ ปวช. (ประกาศนียบัตรวิชาชีพ)',
          students: Number(currentDept.students_voc || 0),
          base: Number(currentDept.base_voc || 0),
          deduct: Number(currentDept.deduct_voc || 0),
          trans: Number(currentDept.trans_voc || 0),
          net: Number(currentDept.net_voc || 0)
        },
        {
          name: 'ระดับ ปวส. (ประกาศนียบัตรวิชาชีพชั้นสูง)',
          students: Number(currentDept.students_high_voc || 0),
          base: Number(currentDept.base_high_voc || 0),
          deduct: Number(currentDept.deduct_high_voc || 0),
          trans: Number(currentDept.trans_high_voc || 0),
          net: Number(currentDept.net_high_voc || 0)
        },
        {
          name: 'โครงการจัดการศึกษาในเรือนจำ',
          students: Number(currentDept.students_prison || 0),
          base: Number(currentDept.base_prison || 0),
          deduct: Number(currentDept.deduct_prison || 0),
          trans: Number(currentDept.trans_prison || 0),
          net: Number(currentDept.net_prison || 0)
        }
      ];

      levelRows.forEach((row, idx) => {
        if (idx % 2 === 1) {
          doc.rect(36, currentY, 769, 16).fill('#f8fafc');
        }
        doc.fillColor('#1e293b').font(fontRegular).fontSize(8);
        doc.text(row.name, 42, currentY + 3, { width: 170 });
        doc.text(row.students > 0 ? row.students.toLocaleString() : '0', 220, currentY + 3, { width: 90, align: 'right' });
        doc.text(row.base > 0 ? row.base.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '0.00', 320, currentY + 3, { width: 105, align: 'right' });
        doc.fillColor(row.deduct > 0 ? '#be123c' : '#94a3b8');
        doc.text(row.deduct > 0 ? `(${row.deduct.toLocaleString('th-TH', { minimumFractionDigits: 2 })})` : '(0)', 435, currentY + 3, { width: 100, align: 'right' });
        doc.fillColor(row.trans > 0 ? '#047857' : '#94a3b8');
        doc.text(row.trans > 0 ? row.trans.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '0', 545, currentY + 3, { width: 100, align: 'right' });
        doc.font(fontBold).fillColor('#1e3a8a');
        doc.text(row.net > 0 ? row.net.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '0.00', 655, currentY + 3, { width: 140, align: 'right' });
        currentY += 16;
      });

      // Total Row
      doc.rect(36, currentY, 769, 18).fill('#e2e8f0');
      doc.fillColor('#0f172a').font(fontBold).fontSize(8.5);
      doc.text('รวมตามระดับการศึกษาทั้งสิ้น', 42, currentY + 4, { width: 170 });
      doc.text(Number(currentDept.student_count || 0).toLocaleString(), 220, currentY + 4, { width: 90, align: 'right' });
      doc.text(baseVal.toLocaleString('th-TH', { minimumFractionDigits: 2 }), 320, currentY + 4, { width: 105, align: 'right' });
      doc.fillColor('#be123c').text(`(${deductVal.toLocaleString('th-TH', { minimumFractionDigits: 2 })})`, 435, currentY + 4, { width: 100, align: 'right' });
      doc.fillColor('#047857').text(transVal.toLocaleString('th-TH', { minimumFractionDigits: 2 }), 545, currentY + 4, { width: 100, align: 'right' });
      doc.fillColor('#1e1b4b').text(netVal.toLocaleString('th-TH', { minimumFractionDigits: 2 }), 655, currentY + 4, { width: 140, align: 'right' });
      currentY += 22;

      // Breakdown by calculation type banner (Structured on 1 line across 769 pt)
      doc.rect(36, currentY, 769, 18).fillAndStroke('#ecfdf5', '#a7f3d0');
      doc.fillColor('#065f46').font(fontBold).fontSize(8);
      doc.text('งบสุทธิตามประเภทการคำนวณ:', 44, currentY + 4, { width: 130 });
      doc.font(fontRegular).fontSize(7.5);
      doc.text(`ภาคปกติ: ${Number(currentDept.net_regular || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿`, 175, currentY + 4, { width: 145, align: 'center' });
      doc.text(`ภาคสมทบ: ${Number(currentDept.net_special_supplementary || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿`, 325, currentY + 4, { width: 145, align: 'center' });
      doc.text(`ภาคทวิศึกษา: ${Number(currentDept.net_dual_education || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿`, 475, currentY + 4, { width: 155, align: 'center' });
      doc.text(`ระยะสั้น: ${Number(currentDept.net_short_course || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿`, 635, currentY + 4, { width: 165, align: 'center' });
      currentY += 24;

      // ==========================================
      // ส่วนที่ 2: รายละเอียดรายรับ - จ่าย
      // ==========================================
      if (currentY > 440) {
        doc.addPage({ size: 'A4', layout: 'landscape', margin: 36 });
        currentY = 36;
      }

      doc.font(fontBold).fontSize(11).fillColor('#0f172a').text(
        'ส่วนที่ 2: รายละเอียดรายรับ - รายจ่าย งบประมาณค่าวัสดุฝึกปฏิบัติการ',
        36,
        currentY
      );
      currentY += 16;

      // -----------------------------------------------------------
      // 2.1 รายรับ: (ก) รายการจัดสรรงบประมาณตั้งต้นของแผนกวิชา
      // -----------------------------------------------------------
      doc.font(fontBold).fontSize(9.5).fillColor('#1e40af').text(
        `2.1 รายรับ - (ก) รายการจัดสรรงบประมาณตั้งต้นของแผนกวิชา (${baseAllocs.length} รายการ)`,
        36,
        currentY
      );
      currentY += 13;

      const drawBaseAllocHeader = (topY: number) => {
        doc.rect(36, topY - 2, 769, 18).fill('#dbeafe');
        doc.fillColor('#1e3a8a').font(fontBold).fontSize(8);
        doc.text('ลำดับ', 38, topY + 3, { width: 25, align: 'center' });
        doc.text('รายการ / กลุ่มเรียน / รุ่น / วิชา', 66, topY + 3, { width: 175 });
        doc.text('ประเภทงบ', 244, topY + 3, { width: 65, align: 'center' });
        doc.text('ระดับ / ข้อมูลจำเพาะ', 312, topY + 3, { width: 195 });
        doc.text('จำนวน นร. (คน)', 510, topY + 3, { width: 55, align: 'right' });
        doc.text('ชม.ฝึก (ชม.)', 568, topY + 3, { width: 48, align: 'right' });
        doc.text('เงิน/หัว (บาท)', 619, topY + 3, { width: 65, align: 'right' });
        doc.text('งบตั้งต้น (บาท)', 687, topY + 3, { width: 115, align: 'right' });
        doc.moveTo(36, topY + 16).lineTo(805, topY + 16).stroke('#93c5fd');
      };

      drawBaseAllocHeader(currentY);
      currentY += 18;

      let sumBaseStudents = 0;
      let sumBaseBudget = 0;

      if (baseAllocs.length === 0) {
        doc.rect(36, currentY, 769, 16).fill('#f8fafc');
        doc.fillColor('#94a3b8').font(fontRegular).fontSize(8);
        doc.text('ไม่มีรายการจัดสรรงบประมาณตั้งต้นในงวดนี้', 36, currentY + 3, { width: 769, align: 'center' });
        currentY += 18;
      } else {
        baseAllocs.forEach((item, idx) => {
          let detailText = item.education_level || '-';
          if (item.calculation_type === 'SPECIAL_SUPPLEMENTARY') {
            detailText = item.batch_name || '-';
          } else if (item.calculation_type === 'DUAL_EDUCATION') {
            detailText = `${item.school_name || '-'}${item.step_level ? ` (${item.step_level})` : ''}`;
          } else if (item.calculation_type === 'SHORT_COURSE') {
            detailText = `${item.course_name || '-'}${item.school_name ? ` (${item.school_name})` : ''}`;
          }

          doc.font(fontRegular).fontSize(8);
          const itemH = doc.heightOfString(item.item_name || '-', { width: 175 });
          const detailH = doc.heightOfString(detailText, { width: 195 });
          const rowH = Math.max(16, Math.ceil(Math.max(itemH, detailH)) + 4);

          if (currentY + rowH > 480) {
            doc.addPage({ size: 'A4', layout: 'landscape', margin: 36 });
            currentY = 36;
            drawBaseAllocHeader(currentY);
            currentY += 18;
          }

          const count = Number(item.student_count || 0);
          const base = Number(item.base_budget || 0);
          const rate = Number(item.rate_per_head || 0);
          sumBaseStudents += count;
          sumBaseBudget += base;

          if (idx % 2 === 1) {
            doc.rect(36, currentY, 769, rowH).fill('#f8fafc');
          }
          doc.fillColor('#1e293b').font(fontRegular).fontSize(8);
          doc.text(String(idx + 1), 38, currentY + 3, { width: 25, align: 'center' });
          doc.font(fontBold).text(item.item_name || '-', 66, currentY + 3, { width: 175 });
          doc.font(fontRegular).text(CALC_LABELS[item.calculation_type] || item.calculation_type, 244, currentY + 3, { width: 65, align: 'center' });
          doc.text(detailText, 312, currentY + 3, { width: 195 });
          doc.text(count.toLocaleString(), 510, currentY + 3, { width: 55, align: 'right' });
          doc.text(item.total_practice_hours !== null && item.total_practice_hours !== undefined ? String(item.total_practice_hours) : '-', 568, currentY + 3, { width: 48, align: 'right' });
          doc.text(rate.toLocaleString('th-TH'), 619, currentY + 3, { width: 65, align: 'right' });
          doc.font(fontBold).text(base.toLocaleString('th-TH', { minimumFractionDigits: 2 }), 687, currentY + 3, { width: 115, align: 'right' });

          currentY += rowH;
        });

        // Subtotal row for Base Budget
        doc.rect(36, currentY, 769, 17).fill('#eff6ff');
        doc.fillColor('#1e3a8a').font(fontBold).fontSize(8);
        doc.text(`รวมงบประมาณจัดสรรตั้งต้น (${baseAllocs.length} รายการ)`, 66, currentY + 3, { width: 240 });
        doc.text(sumBaseStudents.toLocaleString(), 510, currentY + 3, { width: 55, align: 'right' });
        doc.text(sumBaseBudget.toLocaleString('th-TH', { minimumFractionDigits: 2 }), 687, currentY + 3, { width: 115, align: 'right' });
        currentY += 21;
      }

      // -----------------------------------------------------------
      // 2.1 รายรับ: (ข) รายการรับโอนจากการช่วยสอนแผนกอื่น
      // -----------------------------------------------------------
      if (currentY > 460) {
        doc.addPage({ size: 'A4', layout: 'landscape', margin: 36 });
        currentY = 36;
      }

      doc.font(fontBold).fontSize(9.5).fillColor('#047857').text(
        `2.1 รายรับ - (ข) รายการรับโอนจากการไปช่วยสอนแผนกอื่น (${transIn.length} รายการ)`,
        36,
        currentY
      );
      currentY += 13;

      const drawTransInHeader = (topY: number) => {
        doc.rect(36, topY - 2, 769, 18).fill('#dcfce7');
        doc.fillColor('#065f46').font(fontBold).fontSize(8);
        doc.text('ลำดับ', 38, topY + 3, { width: 25, align: 'center' });
        doc.text('รับโอนจากแผนกวิชา', 65, topY + 3, { width: 130 });
        doc.text('กลุ่มเรียน', 198, topY + 3, { width: 60 });
        doc.text('ประเภทงบ', 261, topY + 3, { width: 60, align: 'center' });
        doc.text('วิชา / รายละเอียดการช่วยสอน', 324, topY + 3, { width: 285 });
        doc.text('ชม.สอน', 612, topY + 3, { width: 50, align: 'right' });
        doc.text('จำนวนเงินรับโอน (บาท)', 665, topY + 3, { width: 135, align: 'right' });
        doc.moveTo(36, topY + 16).lineTo(805, topY + 16).stroke('#86efac');
      };

      drawTransInHeader(currentY);
      currentY += 18;

      let sumTransIn = 0;
      if (transIn.length === 0) {
        doc.rect(36, currentY, 769, 16).fill('#f8fafc');
        doc.fillColor('#94a3b8').font(fontRegular).fontSize(8);
        doc.text('ไม่มีรายการรับโอนจากการช่วยสอนในงวดนี้', 36, currentY + 3, { width: 769, align: 'center' });
        currentY += 18;
      } else {
        transIn.forEach((item, idx) => {
          const detailRemark = item.remark || item.item_name || '-';
          doc.font(fontRegular).fontSize(8);
          const deptH = doc.heightOfString(`${item.source_department_code} - ${item.source_department_name}`, { width: 130 });
          const remarkH = doc.heightOfString(detailRemark, { width: 285 });
          const rowH = Math.max(16, Math.ceil(Math.max(deptH, remarkH)) + 4);

          if (currentY + rowH > 480) {
            doc.addPage({ size: 'A4', layout: 'landscape', margin: 36 });
            currentY = 36;
            drawTransInHeader(currentY);
            currentY += 18;
          }

          const shareAmt = Number(item.share_amount || 0);
          sumTransIn += shareAmt;

          if (idx % 2 === 1) {
            doc.rect(36, currentY, 769, rowH).fill('#f8fafc');
          }
          doc.fillColor('#1e293b').font(fontRegular).fontSize(8);
          doc.text(String(idx + 1), 38, currentY + 3, { width: 25, align: 'center' });
          doc.font(fontBold).text(`${item.source_department_code} - ${item.source_department_name}`, 65, currentY + 3, { width: 130 });
          doc.font(fontRegular).text(item.item_name || '-', 198, currentY + 3, { width: 60 });
          doc.text(CALC_LABELS[item.calculation_type] || item.calculation_type, 261, currentY + 3, { width: 60, align: 'center' });
          doc.text(detailRemark, 324, currentY + 3, { width: 285 });
          doc.text(item.teaching_hours ? `${Number(item.teaching_hours)} ชม.` : '-', 612, currentY + 3, { width: 50, align: 'right' });
          doc.font(fontBold).fillColor('#047857').text(`+${shareAmt.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`, 665, currentY + 3, { width: 135, align: 'right' });

          currentY += rowH;
        });

        // Subtotal row for Transfers In
        doc.rect(36, currentY, 769, 17).fill('#f0fdf4');
        doc.fillColor('#065f46').font(fontBold).fontSize(8);
        doc.text(`รวมเงินรับโอนจากการช่วยสอน (${transIn.length} รายการ)`, 65, currentY + 3, { width: 250 });
        doc.text(`+${sumTransIn.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`, 665, currentY + 3, { width: 135, align: 'right' });
        currentY += 21;
      }

      // Highlight Total Incomes
      const totalIncome = sumBaseBudget + sumTransIn;
      doc.rect(36, currentY, 769, 18).fill('#e0e7ff');
      doc.fillColor('#1e1b4b').font(fontBold).fontSize(8.5);
      doc.text(
        `รวมรายรับทั้งสิ้น (งบตั้งต้น + รับโอนจากการช่วยสอน):  ${totalIncome.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`,
        42,
        currentY + 4,
        { width: 755, align: 'right' }
      );
      currentY += 24;

      // -----------------------------------------------------------
      // 2.2 รายจ่าย: รายการหักปันส่วนงบประมาณให้แผนกช่วยสอนอื่น
      // -----------------------------------------------------------
      if (currentY > 460) {
        doc.addPage({ size: 'A4', layout: 'landscape', margin: 36 });
        currentY = 36;
      }

      doc.font(fontBold).fontSize(9.5).fillColor('#be123c').text(
        `2.2 รายจ่าย - รายการหักปันส่วนงบประมาณให้แผนกช่วยสอนอื่น (${transOut.length} รายการ)`,
        36,
        currentY
      );
      currentY += 13;

      const drawTransOutHeader = (topY: number) => {
        doc.rect(36, topY - 2, 769, 18).fill('#ffe4e6');
        doc.fillColor('#9f1239').font(fontBold).fontSize(8);
        doc.text('ลำดับ', 38, topY + 3, { width: 25, align: 'center' });
        doc.text('แผนกวิชาที่ช่วยสอน', 65, topY + 3, { width: 130 });
        doc.text('กลุ่มเรียน', 198, topY + 3, { width: 60 });
        doc.text('ประเภทงบ', 261, topY + 3, { width: 60, align: 'center' });
        doc.text('วิชา / รายละเอียดการช่วยสอน', 324, topY + 3, { width: 285 });
        doc.text('ชม.สอน', 612, topY + 3, { width: 50, align: 'right' });
        doc.text('จำนวนเงินหักจ่าย (บาท)', 665, topY + 3, { width: 135, align: 'right' });
        doc.moveTo(36, topY + 16).lineTo(805, topY + 16).stroke('#fda4af');
      };

      drawTransOutHeader(currentY);
      currentY += 18;

      let sumTransOut = 0;
      if (transOut.length === 0) {
        doc.rect(36, currentY, 769, 16).fill('#f8fafc');
        doc.fillColor('#94a3b8').font(fontRegular).fontSize(8);
        doc.text('ไม่มีรายการหักปันส่วนงบประมาณในงวดนี้', 36, currentY + 3, { width: 769, align: 'center' });
        currentY += 18;
      } else {
        transOut.forEach((item, idx) => {
          const detailRemark = item.remark || item.item_name || '-';
          doc.font(fontRegular).fontSize(8);
          const deptH = doc.heightOfString(`${item.target_department_code} - ${item.target_department_name}`, { width: 130 });
          const remarkH = doc.heightOfString(detailRemark, { width: 285 });
          const rowH = Math.max(16, Math.ceil(Math.max(deptH, remarkH)) + 4);

          if (currentY + rowH > 480) {
            doc.addPage({ size: 'A4', layout: 'landscape', margin: 36 });
            currentY = 36;
            drawTransOutHeader(currentY);
            currentY += 18;
          }

          const shareAmt = Number(item.share_amount || 0);
          sumTransOut += shareAmt;

          if (idx % 2 === 1) {
            doc.rect(36, currentY, 769, rowH).fill('#f8fafc');
          }
          doc.fillColor('#1e293b').font(fontRegular).fontSize(8);
          doc.text(String(idx + 1), 38, currentY + 3, { width: 25, align: 'center' });
          doc.font(fontBold).text(`${item.target_department_code} - ${item.target_department_name}`, 65, currentY + 3, { width: 130 });
          doc.font(fontRegular).text(item.item_name || '-', 198, currentY + 3, { width: 60 });
          doc.text(CALC_LABELS[item.calculation_type] || item.calculation_type, 261, currentY + 3, { width: 60, align: 'center' });
          doc.text(detailRemark, 324, currentY + 3, { width: 285 });
          doc.text(item.teaching_hours ? `${Number(item.teaching_hours)} ชม.` : '-', 612, currentY + 3, { width: 50, align: 'right' });
          doc.font(fontBold).fillColor('#be123c').text(`(${shareAmt.toLocaleString('th-TH', { minimumFractionDigits: 2 })})`, 665, currentY + 3, { width: 135, align: 'right' });

          currentY += rowH;
        });

        // Subtotal row for Transfers Out
        doc.rect(36, currentY, 769, 17).fill('#fff1f2');
        doc.fillColor('#9f1239').font(fontBold).fontSize(8);
        doc.text(`รวมรายจ่ายหักปันส่วนให้แผนกช่วยสอน (${transOut.length} รายการ)`, 65, currentY + 3, { width: 250 });
        doc.text(`(${sumTransOut.toLocaleString('th-TH', { minimumFractionDigits: 2 })})`, 665, currentY + 3, { width: 135, align: 'right' });
        currentY += 21;
      }

      // -----------------------------------------------------------
      // 2.3 สรุปกระทบยอดคงเหลือสุทธิ (Net Reconciliation Statement)
      // -----------------------------------------------------------
      if (currentY > 440) {
        doc.addPage({ size: 'A4', layout: 'landscape', margin: 36 });
        currentY = 36;
      }

      const netBalance = sumBaseBudget - sumTransOut + sumTransIn;
      const boxH = 46;
      doc.rect(36, currentY, 769, boxH).fillAndStroke('#f8fafc', '#cbd5e1');
      doc.rect(36, currentY, 4, boxH).fill('#2563eb');
      doc.font(fontBold).fontSize(9.5).fillColor('#0f172a').text(
        '2.3 สรุปยอดกระทบยอดคงเหลือสุทธิ (Net Budget Balance Summary):',
        48,
        currentY + 7
      );
      doc.font(fontRegular).fontSize(8.5).fillColor('#334155').text(
        `[งบตั้งต้น] ${sumBaseBudget.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿   -   [หักจ่ายปันส่วน] ${sumTransOut.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿   +   [รับโอนช่วยสอน] ${sumTransIn.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿`,
        48,
        currentY + 25,
        { width: 440 }
      );
      doc.font(fontBold).fontSize(12).fillColor('#1e3a8a').text(
        `= คงเหลืองบประมาณสุทธิ: ${netBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`,
        495,
        currentY + 18,
        { width: 300, align: 'right' }
      );
      currentY += boxH + 10;

      // Draw Signatures for Department Report
      drawSignatures(doc, currentY);

      doc.end();
      return;
    }

    // =========================================================================
    // BRANCH B: รายงานสรุปทุกแผนก (Overall Summary Report: department_id === 'all')
    // =========================================================================
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

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="training_budget_summary_${term.semester}_${term.academic_year}${calcFileSuffix}.pdf"`
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
      `สถานะงวด: ${term.status === 'OPEN' ? 'เปิดงวดจัดสรร (OPEN)' : 'ปิดงวด (CLOSED)'}  |  พิมพ์เมื่อ: ${formattedDate}`,
      36,
      doc.y,
      { width: 769, align: 'center' }
    );
    doc.moveDown(0.8);

    // Table 1: Summary / Reconciliation Table
    doc.font(fontBold).fontSize(11).fillColor('#0f172a').text(
      `ตารางสรุปงบประมาณสุทธิรายแผนก (${calcLabel})`,
      36,
      doc.y
    );
    doc.moveDown(0.3);

    const drawDeptTableHeader = (topY: number) => {
      if (isSpecial) {
        doc.rect(36, topY - 3, 769, 20).fill('#f1f5f9');
        doc.fillColor('#0f172a').font(fontBold).fontSize(10);
        doc.text('แผนกวิชา', 42, topY + 2);
        doc.text('จำนวนคน (คน)', 280, topY + 2, { width: 90, align: 'right' });
        doc.text('งบตั้งต้น (+)', 380, topY + 2, { width: 100, align: 'right' });
        doc.text('หักจ่าย (-)', 490, topY + 2, { width: 95, align: 'right' });
        doc.text('รับโอน (+)', 595, topY + 2, { width: 95, align: 'right' });
        doc.text(`งบสุทธิ ${calcLabel}`, 700, topY + 2, { width: 100, align: 'right' });
        doc.moveTo(36, topY + 18).lineTo(805, topY + 18).stroke('#cbd5e1');
      } else {
        // Two-tier Table Header exactly like the Web Summary Table
        doc.rect(36, topY - 2, 258, 26).fill('#f1f5f9');
        doc.fillColor('#0f172a').font(fontBold).fontSize(8);
        doc.text('แผนกวิชา', 40, topY + 6, { width: 108 });
        doc.text('งบตั้งต้น (+)', 150, topY + 6, { width: 50, align: 'right' });
        doc.text('หักจ่าย (-)', 202, topY + 6, { width: 44, align: 'right' });
        doc.text('รับโอน (+)', 248, topY + 6, { width: 44, align: 'right' });

        // Group 1: จำนวนนักเรียนรายระดับ
        doc.rect(294, topY - 2, 90, 13).fill('#dbeafe');
        doc.fillColor('#1e40af').font(fontBold).fontSize(7.5).text('จำนวนนักเรียนรายระดับ', 294, topY + 1, { width: 90, align: 'center' });
        doc.rect(294, topY + 11, 90, 13).fill('#eff6ff');
        doc.fillColor('#1e40af').font(fontBold).fontSize(7);
        doc.text('ปวช.', 294, topY + 13, { width: 28, align: 'right' });
        doc.text('ปวส.', 324, topY + 13, { width: 28, align: 'right' });
        doc.text('เรือนจำ', 354, topY + 13, { width: 28, align: 'right' });

        // Group 2: งบประมาณสุทธิแยกตามระดับ
        doc.rect(386, topY - 2, 150, 13).fill('#f3e8ff');
        doc.fillColor('#6b21a8').font(fontBold).fontSize(7.5).text('งบประมาณสุทธิแยกตามระดับ', 386, topY + 1, { width: 150, align: 'center' });
        doc.rect(386, topY + 11, 150, 13).fill('#faf5ff');
        doc.fillColor('#6b21a8').font(fontBold).fontSize(7);
        doc.text('ปวช.', 386, topY + 13, { width: 48, align: 'right' });
        doc.text('ปวส.', 436, topY + 13, { width: 48, align: 'right' });
        doc.text('เรือนจำ', 486, topY + 13, { width: 48, align: 'right' });

        // Group 3: งบประมาณสุทธิแยกตามประเภทการคำนวณ
        doc.rect(538, topY - 2, 200, 13).fill('#d1fae5');
        doc.fillColor('#065f46').font(fontBold).fontSize(7.5).text('งบประมาณสุทธิแยกตามประเภทการคำนวณ', 538, topY + 1, { width: 200, align: 'center' });
        doc.rect(538, topY + 11, 200, 13).fill('#ecfdf5');
        doc.fillColor('#065f46').font(fontBold).fontSize(7);
        doc.text('ภาคปกติ', 538, topY + 13, { width: 48, align: 'right' });
        doc.text('ภาคสมทบ', 588, topY + 13, { width: 48, align: 'right' });
        doc.text('ภาคทวิศึกษา', 638, topY + 13, { width: 48, align: 'right' });
        doc.text('ระยะสั้น', 688, topY + 13, { width: 48, align: 'right' });

        // End Column: งบสุทธิรวม
        doc.rect(740, topY - 2, 65, 26).fill('#e0e7ff');
        doc.fillColor('#1e1b4b').font(fontBold).fontSize(8).text('งบสุทธิรวม', 740, topY + 6, { width: 62, align: 'right' });

        doc.moveTo(36, topY + 24).lineTo(805, topY + 24).stroke('#cbd5e1');
      }
    };

    const tableTop = doc.y;
    drawDeptTableHeader(tableTop);

    let currentY = tableTop + (isSpecial ? 24 : 28);
    doc.font(fontRegular);

    let totalStudents = 0;
    let totalBase = 0;
    let totalDeduct = 0;
    let totalTrans = 0;
    let totalNet = 0;

    let totalStudentsVoc = 0;
    let totalStudentsHighVoc = 0;
    let totalStudentsPrison = 0;

    let totalNetVoc = 0;
    let totalNetHighVoc = 0;
    let totalNetPrison = 0;

    let totalNetRegular = 0;
    let totalNetSpecial = 0;
    let totalNetDual = 0;
    let totalNetShort = 0;

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
        if (currentY > 480) {
          doc.addPage({ size: 'A4', layout: 'landscape', margin: 36 });
          currentY = 36;
          drawDeptTableHeader(currentY);
          currentY += isSpecial ? 24 : 28;
        }

        const students = Number(dept.student_count || 0);
        const base = Number(dept.base_budget || 0);
        const deducted = Number(dept.total_deducted || 0);
        const transferred = Number(dept.total_transferred || 0);
        const net = Number(dept.net_budget || 0);

        const sVoc = Number(dept.students_voc || 0);
        const sHighVoc = Number(dept.students_high_voc || 0);
        const sPrison = Number(dept.students_prison || 0);

        const nVoc = Number(dept.net_voc || 0);
        const nHighVoc = Number(dept.net_high_voc || 0);
        const nPrison = Number(dept.net_prison || 0);

        const nRegular = Number(dept.net_regular || 0);
        const nSpecial = Number(dept.net_special_supplementary || 0);
        const nDual = Number(dept.net_dual_education || 0);
        const nShort = Number(dept.net_short_course || 0);

        totalStudents += students;
        totalBase += base;
        totalDeduct += deducted;
        totalTrans += transferred;
        totalNet += net;

        totalStudentsVoc += sVoc;
        totalStudentsHighVoc += sHighVoc;
        totalStudentsPrison += sPrison;

        totalNetVoc += nVoc;
        totalNetHighVoc += nHighVoc;
        totalNetPrison += nPrison;

        totalNetRegular += nRegular;
        totalNetSpecial += nSpecial;
        totalNetDual += nDual;
        totalNetShort += nShort;

        // Alternating row background
        if (index % 2 === 1) {
          doc.rect(36, currentY - 2, 769, 16).fill('#f8fafc');
        }
        doc.fillColor('#1e293b');

        if (isSpecial) {
          doc.fontSize(9.5);
          doc.text(dept.department_name || '', 42, currentY, { width: 230, ellipsis: true });
          doc.text(students > 0 ? students.toLocaleString() : '-', 280, currentY, { width: 90, align: 'right' });
          doc.text(base.toLocaleString('th-TH', { minimumFractionDigits: 2 }), 380, currentY, { width: 100, align: 'right' });
          doc.text(deducted > 0 ? deducted.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-', 490, currentY, { width: 95, align: 'right' });
          doc.text(transferred > 0 ? transferred.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-', 595, currentY, { width: 95, align: 'right' });
          doc.text(net.toLocaleString('th-TH', { minimumFractionDigits: 2 }), 700, currentY, { width: 100, align: 'right' });
        } else {
          // Full Multi-Column row matching Web Dashboard
          doc.fontSize(7.5);
          doc.font(fontBold).text(dept.department_name || '', 40, currentY + 1, { width: 108, ellipsis: true });

          doc.font(fontRegular).fillColor('#1e293b');
          doc.text(base > 0 ? base.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00', 150, currentY + 1, { width: 50, align: 'right' });

          doc.fillColor(deducted > 0 ? '#be123c' : '#94a3b8');
          doc.text(deducted > 0 ? `(${deducted.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})` : '(0)', 202, currentY + 1, { width: 44, align: 'right' });

          doc.fillColor(transferred > 0 ? '#047857' : '#94a3b8');
          doc.text(transferred > 0 ? transferred.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0', 248, currentY + 1, { width: 44, align: 'right' });

          // Students
          doc.fillColor('#1e40af');
          doc.text(sVoc > 0 ? sVoc.toLocaleString() : '0', 294, currentY + 1, { width: 28, align: 'right' });
          doc.text(sHighVoc > 0 ? sHighVoc.toLocaleString() : '0', 324, currentY + 1, { width: 28, align: 'right' });
          doc.text(sPrison > 0 ? sPrison.toLocaleString() : '0', 354, currentY + 1, { width: 28, align: 'right' });

          // Net by Education Level
          doc.fillColor('#6b21a8');
          doc.text(nVoc > 0 ? nVoc.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0', 386, currentY + 1, { width: 48, align: 'right' });
          doc.text(nHighVoc > 0 ? nHighVoc.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0', 436, currentY + 1, { width: 48, align: 'right' });
          doc.text(nPrison > 0 ? nPrison.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0', 486, currentY + 1, { width: 48, align: 'right' });

          // Net by Calculation Type
          doc.fillColor('#065f46');
          doc.text(nRegular > 0 ? nRegular.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0', 538, currentY + 1, { width: 48, align: 'right' });
          doc.text(nSpecial > 0 ? nSpecial.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0', 588, currentY + 1, { width: 48, align: 'right' });
          doc.text(nDual > 0 ? nDual.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0', 638, currentY + 1, { width: 48, align: 'right' });
          doc.text(nShort > 0 ? nShort.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0', 688, currentY + 1, { width: 48, align: 'right' });

          // Total Net
          doc.font(fontBold).fillColor('#1e3a8a');
          doc.text(net > 0 ? net.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00', 740, currentY + 1, { width: 62, align: 'right' });
        }

        currentY += 16;
      });

      // Total Summary Line
      doc.moveTo(36, currentY).lineTo(805, currentY).stroke('#475569');
      currentY += 3;
      doc.rect(36, currentY - 2, 769, 18).fill('#e2e8f0');

      if (isSpecial) {
        doc.fillColor('#0f172a').font(fontBold).fontSize(10);
        doc.text(`รวมทั้งสิ้น (${displayedDepartments.length} แผนก)`, 42, currentY + 2);
        doc.text(totalStudents.toLocaleString(), 280, currentY + 2, { width: 90, align: 'right' });
        doc.text(totalBase.toLocaleString('th-TH', { minimumFractionDigits: 2 }), 380, currentY + 2, { width: 100, align: 'right' });
        doc.text(totalDeduct.toLocaleString('th-TH', { minimumFractionDigits: 2 }), 490, currentY + 2, { width: 95, align: 'right' });
        doc.text(totalTrans.toLocaleString('th-TH', { minimumFractionDigits: 2 }), 595, currentY + 2, { width: 95, align: 'right' });
        doc.text(totalNet.toLocaleString('th-TH', { minimumFractionDigits: 2 }), 700, currentY + 2, { width: 100, align: 'right' });
      } else {
        // Full Summary Totals matching Web Dashboard
        doc.font(fontBold).fontSize(7.5);
        doc.fillColor('#0f172a').text(`รวมทั้งสิ้น (${departments.length} แผนก)`, 40, currentY + 2, { width: 108 });
        doc.text(totalBase.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 150, currentY + 2, { width: 50, align: 'right' });

        doc.fillColor('#be123c').text(`(${totalDeduct.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`, 202, currentY + 2, { width: 44, align: 'right' });
        doc.fillColor('#047857').text(totalTrans.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 248, currentY + 2, { width: 44, align: 'right' });

        // Students totals
        doc.fillColor('#1e40af');
        doc.text(totalStudentsVoc.toLocaleString(), 294, currentY + 2, { width: 28, align: 'right' });
        doc.text(totalStudentsHighVoc.toLocaleString(), 324, currentY + 2, { width: 28, align: 'right' });
        doc.text(totalStudentsPrison.toLocaleString(), 354, currentY + 2, { width: 28, align: 'right' });

        // Net by Education Level totals
        doc.fillColor('#6b21a8');
        doc.text(totalNetVoc.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 386, currentY + 2, { width: 48, align: 'right' });
        doc.text(totalNetHighVoc.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 436, currentY + 2, { width: 48, align: 'right' });
        doc.text(totalNetPrison.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 486, currentY + 2, { width: 48, align: 'right' });

        // Net by Calculation Type totals
        doc.fillColor('#065f46');
        doc.text(totalNetRegular.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 538, currentY + 2, { width: 48, align: 'right' });
        doc.text(totalNetSpecial.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 588, currentY + 2, { width: 48, align: 'right' });
        doc.text(totalNetDual.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 638, currentY + 2, { width: 48, align: 'right' });
        doc.text(totalNetShort.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 688, currentY + 2, { width: 48, align: 'right' });

        // Total Net
        doc.fillColor('#1e1b4b').text(totalNet.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 740, currentY + 2, { width: 62, align: 'right' });
      }
      currentY += 21;
    }

    // Per User Request: ข้อ 2 (ตารางกระทบยอดรายการจัดสรรตามแผนก) เอาออกจากการสรุปทุกแผนก
    // Follow directly with Signatures
    drawSignatures(doc, currentY);

    doc.end();
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
