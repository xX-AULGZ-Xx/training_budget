import React, { useState } from 'react';
import {
  School,
  Calculator,
  Calendar,
  Building2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Rocket,
  Check,
  Sparkles
} from 'lucide-react';
import { SystemSettings } from '../types';

interface StartupSettingPageProps {
  onComplete: () => void;
  onCancel: () => void;
}

export const StartupSettingPage: React.FC<StartupSettingPageProps> = ({
  onComplete,
  onCancel
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  // Step 1: Organization State
  const [settings, setSettings] = useState<SystemSettings>({
    college_name: 'วิทยาลัยอาชีวศึกษาเชียงราย',
    college_code: 'CVC',
    affiliation: 'สำนักงานคณะกรรมการการอาชีวศึกษา กระทรวงศึกษาธิการ',
    department_name: 'งานวางแผนและงบประมาณ ฝ่ายแผนงานและความร่วมมือ',
    director_name: 'นายผู้อำนวยการ วิทยาลัยอาชีวศึกษาเชียงราย',
    planner_name: 'หัวหน้างานวางแผนและงบประมาณ',
    default_operator: 'เจ้าหน้าที่แผนงาน',
    default_rate_voc: '350',
    default_rate_high_voc: '350',
    default_rate_prison: '350',
    default_practice_hours: '18',
    fiscal_year_start_month: '10'
  });

  // Step 3: Academic Term State
  const [termYear, setTermYear] = useState<number>(2568);
  const [termSemester, setTermSemester] = useState<number>(1);

  // Step 4: Seed Preset
  const [seedDepartments, setSeedDepartments] = useState<boolean>(true);

  const steps = [
    { id: 1, title: 'ข้อมูลสถานศึกษา', icon: School, desc: 'ชื่อและหน่วยงาน' },
    { id: 2, title: 'อัตราจัดสรร', icon: Calculator, desc: 'งบประมาณต่อหัว' },
    { id: 3, title: 'ปีการศึกษาแรก', icon: Calendar, desc: 'งวดจัดสรรเริ่มต้น' },
    { id: 4, title: 'แผนก & กลุ่มเรียน', icon: Building2, desc: 'โครงสร้างหลักสูตร' },
    { id: 5, title: 'ยืนยัน & เริ่มใช้งาน', icon: Rocket, desc: 'พร้อมจัดสรรงบ' }
  ];

  const handleNext = () => {
    if (currentStep < 5) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleFinishStartup = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/settings/startup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings,
          initial_term: {
            academic_year: Number(termYear),
            semester: Number(termSemester)
          },
          seed_departments: seedDepartments
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'บันทึกการเริ่มต้นระบบล้มเหลว');
      }

      setIsSuccess(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-4 sm:py-6 px-4">
      {/* Outer Card */}
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200/90 overflow-hidden">
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-inner">
                <Rocket className="w-6 h-6 text-blue-300" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-200 border border-blue-400/30 tracking-wider">
                    Initial Setup Wizard
                  </span>
                  <span className="text-xs text-white/60">• วิทยาลัยอาชีวศึกษาเชียงราย</span>
                </div>
                <h1 className="text-lg sm:text-2xl font-black text-white mt-1">
                  ตัวช่วยตั้งค่าเริ่มต้นระบบ (Start Up Setting)
                </h1>
                <p className="text-xs text-blue-200/80 mt-0.5">
                  กำหนดค่าตั้งต้นระบบจัดสรรงบประมาณค่าวัสดุฝึก 5 ขั้นตอนเพื่อความพร้อมใช้งาน
                </p>
              </div>
            </div>

            <button
              onClick={onCancel}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white/70 hover:text-white bg-white/10 hover:bg-white/20 transition-all cursor-pointer self-start sm:self-auto"
            >
              ข้ามไปยังหน้าหลัก
            </button>
          </div>

          {/* Stepper Progress Bar */}
          {!isSuccess && (
            <div className="mt-8 pt-6 border-t border-white/10">
              <div className="grid grid-cols-5 gap-2">
                {steps.map((s) => {
                  const Icon = s.icon;
                  const isDone = s.id < currentStep;
                  const isCurrent = s.id === currentStep;

                  return (
                    <div
                      key={s.id}
                      onClick={() => s.id < currentStep && setCurrentStep(s.id)}
                      className={`flex flex-col items-center text-center cursor-pointer transition-all ${
                        isCurrent
                          ? 'opacity-100 scale-105'
                          : isDone
                          ? 'opacity-80 hover:opacity-100'
                          : 'opacity-40'
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center mb-1.5 transition-all text-xs font-bold ${
                          isDone
                            ? 'bg-emerald-500 text-white shadow-md'
                            : isCurrent
                            ? 'bg-blue-500 text-white shadow-lg ring-2 ring-blue-300 ring-offset-2 ring-offset-slate-900'
                            : 'bg-white/15 text-white/70'
                        }`}
                      >
                        {isDone ? <Check className="w-4 h-4 stroke-[3]" /> : <Icon className="w-4 h-4" />}
                      </div>
                      <span className="text-[11px] font-bold text-white hidden sm:block">
                        {s.title}
                      </span>
                      <span className="text-[9px] text-white/60 hidden md:block">
                        {s.desc}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Wizard Content Body */}
        <div className="p-6 sm:p-8">
          {isSuccess ? (
            /* Success Screen */
            <div className="py-8 text-center space-y-5 animate-fade-in">
              <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h2 className="text-2xl font-black text-slate-900">
                  ตั้งค่าเริ่มต้นระบบเรียบร้อยแล้ว!
                </h2>
                <p className="text-sm text-slate-500 max-w-md mx-auto mt-2">
                  ระบบได้บันทึกข้อมูลสถานศึกษา กำหนดอัตราจัดสรร และเปิดงวดภาคเรียนที่ {termSemester}/{termYear} ให้เป็นภาคเรียนปัจจุบันพร้อมใช้งาน
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 max-w-lg mx-auto text-left space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">สถานศึกษา:</span>
                  <span className="font-bold text-slate-800">{settings.college_name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">ภาคเรียนปัจจุบัน:</span>
                  <span className="font-bold text-blue-700">ภาคเรียนที่ {termSemester}/{termYear} (OPEN)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">อัตราต่อหัว ปวช. / ปวส.:</span>
                  <span className="font-bold text-slate-800">{settings.default_rate_voc} บ. / {settings.default_rate_high_voc} บ.</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">โครงสร้างแผนกวิชา:</span>
                  <span className="font-bold text-emerald-700">ติดตั้งสำเร็จพร้อมใช้งาน</span>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={onComplete}
                  className="inline-flex items-center space-x-2 px-8 py-3.5 rounded-2xl text-white font-bold text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25 transition-all cursor-pointer transform hover:-translate-y-0.5"
                >
                  <Rocket className="w-5 h-5" />
                  <span>เข้าสู่หน้าจัดสรรงบประมาณทันที</span>
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* STEP 1: ORGANIZATION */}
              {currentStep === 1 && (
                <div className="space-y-5 animate-fade-in">
                  <div>
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                      ขั้นตอนที่ 1 จาก 5
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                      ข้อมูลสถานศึกษาและหน่วยงานผู้รับผิดชอบ
                    </h3>
                    <p className="text-xs text-slate-500">
                      ระบุชื่อสถานศึกษา รหัสย่อ และหน่วยงานสังกัดสำหรับแสดงในหัวรายงานและเอกสารทางการเงิน
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        ชื่อสถานศึกษา <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={settings.college_name}
                        onChange={(e) => setSettings({ ...settings, college_name: e.target.value })}
                        required
                        className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        รหัสย่อสถานศึกษา <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={settings.college_code}
                        onChange={(e) => setSettings({ ...settings, college_code: e.target.value })}
                        required
                        className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        หน่วยงานสังกัด
                      </label>
                      <input
                        type="text"
                        value={settings.affiliation}
                        onChange={(e) => setSettings({ ...settings, affiliation: e.target.value })}
                        className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        ฝ่าย/งานที่รับผิดชอบระบบ
                      </label>
                      <input
                        type="text"
                        value={settings.department_name}
                        onChange={(e) => setSettings({ ...settings, department_name: e.target.value })}
                        className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200">
                    <h4 className="text-xs font-bold text-slate-800 mb-3">
                      ผู้บริหารและผู้ลงนามในรายงานสรุป
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          ชื่อผู้อำนวยการสถานศึกษา
                        </label>
                        <input
                          type="text"
                          value={settings.director_name}
                          onChange={(e) => setSettings({ ...settings, director_name: e.target.value })}
                          className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          ชื่อหัวหน้างานวางแผนและงบประมาณ
                        </label>
                        <input
                          type="text"
                          value={settings.planner_name}
                          onChange={(e) => setSettings({ ...settings, planner_name: e.target.value })}
                          className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: BUDGET RATES */}
              {currentStep === 2 && (
                <div className="space-y-5 animate-fade-in">
                  <div>
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                      ขั้นตอนที่ 2 จาก 5
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                      อัตราค่าจัดสรรมาตรฐานและพารามิเตอร์การคำนวณ
                    </h3>
                    <p className="text-xs text-slate-500">
                      กำหนดอัตราค่าวัสดุฝึกต่อหัวเริ่มต้นตามระเบียบงบประมาณของแต่ละระดับการศึกษา
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200">
                      <span className="text-[11px] font-bold text-blue-800 uppercase">ระดับ ปวช.</span>
                      <label className="block text-xs font-semibold text-slate-700 mt-1 mb-2">
                        อัตราต่อหัว (บาท/คน) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={settings.default_rate_voc}
                        onChange={(e) => setSettings({ ...settings, default_rate_voc: e.target.value })}
                        required
                        className="w-full text-base font-black text-blue-700 bg-white border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none tabular-nums"
                      />
                    </div>

                    <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-200">
                      <span className="text-[11px] font-bold text-indigo-800 uppercase">ระดับ ปวส.</span>
                      <label className="block text-xs font-semibold text-slate-700 mt-1 mb-2">
                        อัตราต่อหัว (บาท/คน) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={settings.default_rate_high_voc}
                        onChange={(e) => setSettings({ ...settings, default_rate_high_voc: e.target.value })}
                        required
                        className="w-full text-base font-black text-indigo-700 bg-white border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none tabular-nums"
                      />
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-[11px] font-bold text-slate-800 uppercase">ปวช.เรือนจำ</span>
                      <label className="block text-xs font-semibold text-slate-700 mt-1 mb-2">
                        อัตราต่อหัว (บาท/คน) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={settings.default_rate_prison}
                        onChange={(e) => setSettings({ ...settings, default_rate_prison: e.target.value })}
                        required
                        className="w-full text-base font-black text-slate-800 bg-white border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none tabular-nums"
                      />
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      ชั่วโมงฝึกปฏิบัติตั้งต้นเริ่มต้น (ชม.)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={settings.default_practice_hours}
                      onChange={(e) => setSettings({ ...settings, default_practice_hours: e.target.value })}
                      className="w-48 text-xs bg-white border border-slate-300 rounded-xl p-2.5 font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none tabular-nums"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      ค่าตั้งต้นสำหรับใช้ในสูตรสัดส่วนการปันส่วนสอนช่วย
                    </p>
                  </div>
                </div>
              )}

              {/* STEP 3: ACADEMIC TERM */}
              {currentStep === 3 && (
                <div className="space-y-5 animate-fade-in">
                  <div>
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                      ขั้นตอนที่ 3 จาก 5
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                      ปีการศึกษาและภาคเรียนเริ่มต้น (Initial Academic Term)
                    </h3>
                    <p className="text-xs text-slate-500">
                      ระบุปีการศึกษาที่จะเปิดงวดจัดสรรแรกในระบบ (ระบบจะตั้งเป็นงวดปัจจุบันให้อัตโนมัติ)
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        ปีการศึกษา (พ.ศ.) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="2500"
                        max="2700"
                        value={termYear}
                        onChange={(e) => setTermYear(Number(e.target.value))}
                        required
                        className="w-full text-sm font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none tabular-nums"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        ภาคเรียนที่ <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={termSemester}
                        onChange={(e) => setTermSemester(Number(e.target.value))}
                        className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                      >
                        <option value={1}>ภาคเรียนที่ 1</option>
                        <option value={2}>ภาคเรียนที่ 2</option>
                        <option value={3}>ภาคเรียนที่ 3 (ฤดูร้อน)</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-bold text-emerald-900">
                        สถานะงวด: OPEN (เปิดงวดจัดสรรทันที)
                      </span>
                      <p className="text-[11px] text-emerald-700 mt-0.5">
                        ภาคเรียนที่ {termSemester}/{termYear} จะถูกกำหนดให้เป็น <strong>ภาคเรียนปัจจุบัน (Active Current Term)</strong> สำหรับการคำนวณและจัดสรรงบประมาณทันทีหลังเสร็จสิ้น
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: PRESET MASTER DATA */}
              {currentStep === 4 && (
                <div className="space-y-5 animate-fade-in">
                  <div>
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                      ขั้นตอนที่ 4 จาก 5
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                      แผนกวิชาและกลุ่มเรียนเริ่มต้น (Preset Master Data)
                    </h3>
                    <p className="text-xs text-slate-500">
                      เลือกว่าจะติดตั้งโครงสร้างแผนกวิชาชีพ และแผนกวิชาบริการมาตรฐานไว้ล่วงหน้าหรือไม่
                    </p>
                  </div>

                  <label className="flex items-start space-x-3 p-4 rounded-2xl bg-blue-50/70 border border-blue-200 cursor-pointer hover:bg-blue-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={seedDepartments}
                      onChange={(e) => setSeedDepartments(e.target.checked)}
                      className="w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 mt-0.5 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900">
                        ติดตั้งโครงสร้างแผนกวิชาและกลุ่มเรียนมาตรฐานอัตโนมัติ (แนะนำ)
                      </span>
                      <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                        ระบบจะสร้างแผนกวิชาชีพ (IT, ช่างยนต์, ไฟฟ้า, อิเล็กทรอนิกส์, บัญชี, การตลาด, โรงแรม), แผนกวิชาบริการ (สามัญสัมพันธ์, ภาษาต่างประเทศ) และระดับชั้น ปวช./ปวส. ให้ทันที (คุณสามารถเพิ่มหรือแก้ไขเพิ่มเติมได้ตลอดเวลาในหน้าตั้งค่า)
                      </p>
                    </div>
                  </label>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <h4 className="text-xs font-bold text-slate-800">
                      ตัวอย่างแผนกวิชาที่จะติดตั้ง:
                    </h4>
                    <div className="flex flex-wrap gap-2 text-[11px]">
                      <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-medium text-slate-700">
                        💻 แผนกเทคโนโลยีสารสนเทศ
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-medium text-slate-700">
                        🚗 แผนกช่างยนต์
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-medium text-slate-700">
                        ⚡ แผนกช่างไฟฟ้ากำลัง
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-medium text-slate-700">
                        📊 แผนกการบัญชี
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-medium text-slate-700">
                        🛍️ แผนกการตลาด
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 font-bold text-amber-800">
                        📚 แผนกสามัญสัมพันธ์ (วิชาบริการ)
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 font-bold text-amber-800">
                        🌐 แผนกภาษาต่างประเทศ (วิชาบริการ)
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 5: CONFIRM & LAUNCH */}
              {currentStep === 5 && (
                <div className="space-y-5 animate-fade-in">
                  <div>
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                      ขั้นตอนที่ 5 จาก 5
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                      ตรวจสอบข้อมูลและยืนยันการเริ่มต้นระบบ
                    </h3>
                    <p className="text-xs text-slate-500">
                      โปรดตรวจสอบความถูกต้องของข้อมูลก่อนทำการบันทึกและเปิดใช้งานระบบ
                    </p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-slate-200">
                      <span className="text-slate-500">ชื่อสถานศึกษา:</span>
                      <span className="font-bold text-slate-900">{settings.college_name} ({settings.college_code})</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-200">
                      <span className="text-slate-500">หน่วยงานสังกัด:</span>
                      <span className="font-medium text-slate-800">{settings.affiliation}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-200">
                      <span className="text-slate-500">ภาคเรียนเริ่มต้น:</span>
                      <span className="font-bold text-blue-700">
                        ภาคเรียนที่ {termSemester}/{termYear} (เปิดงวดจัดสรรทันที)
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-200">
                      <span className="text-slate-500">อัตราต่อหัว ปวช. / ปวส. / เรือนจำ:</span>
                      <span className="font-bold text-slate-900">
                        {settings.default_rate_voc} บ. / {settings.default_rate_high_voc} บ. / {settings.default_rate_prison} บ.
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-500">ติดตั้งแผนกวิชามาตรฐาน:</span>
                      <span className="font-bold text-emerald-700">
                        {seedDepartments ? 'ใช่ (สร้างแผนกและกลุ่มเรียนเริ่มต้น)' : 'ไม่ (กำหนดเองภายหลัง)'}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-center space-x-3 text-xs text-blue-900">
                    <Sparkles className="w-5 h-5 text-blue-600 shrink-0" />
                    <span>
                      เมื่อกดยืนยัน ระบบจะตั้งค่าและนำคุณเข้าสู่แดชบอร์ดการจัดสรรงบประมาณทันที
                    </span>
                  </div>
                </div>
              )}

              {/* Navigation Actions Footer */}
              <div className="pt-6 mt-6 border-t border-slate-200 flex items-center justify-between">
                <div>
                  {currentStep > 1 && (
                    <button
                      type="button"
                      onClick={handleBack}
                      disabled={submitting}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center space-x-1.5 cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>ย้อนกลับ</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {currentStep < 5 ? (
                    <button
                      type="button"
                      onClick={handleNext}
                      className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm flex items-center space-x-1.5 transition-all cursor-pointer"
                    >
                      <span>ถัดไป</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleFinishStartup}
                      disabled={submitting}
                      className="px-8 py-3 rounded-2xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/20 flex items-center space-x-2 transition-all cursor-pointer"
                    >
                      <Rocket className="w-4 h-4" />
                      <span>{submitting ? 'กำลังเริ่มต้นระบบ...' : 'บันทึกและเริ่มต้นระบบ'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
