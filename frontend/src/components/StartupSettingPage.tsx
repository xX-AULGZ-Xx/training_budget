import React, { useState, useEffect } from 'react';
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
  Sparkles,
  Activity,
  FileText,
  Layers,
  RotateCcw,
  Sliders,
  CheckCircle,
  Server,
  Globe,
  HardDrive,
  Terminal,
  Copy,
  Download,
  Laptop,
  Network,
  Cpu,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { SystemSettings, DatabaseHealth } from '../types';
import { showErrorAlert } from '../utils/alerts';

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
  const [submitProgress, setSubmitProgress] = useState<string>('');

  // Pre-flight database check
  const [dbHealth, setDbHealth] = useState<DatabaseHealth | null>(null);
  const [dbLoading, setDbLoading] = useState<boolean>(true);

  // Step 1: Organization State
  const defaultCvcSettings: SystemSettings = {
    college_name: 'วิทยาลัยอาชีวศึกษาเชียงราย',
    college_code: 'CVC',
    affiliation: 'สำนักงานคณะกรรมการการอาชีวศึกษา กระทรวงศึกษาธิการ',
    department_name: 'งานวางแผนและงบประมาณ ฝ่ายแผนงานและความร่วมมือ',
    director_name: 'นายผู้อำนวยการ วิทยาลัยอาชีวศึกษาเชียงราย',
    planner_name: 'หัวหน้างานวางแผนและงบประมาณ',
    default_operator: 'เจ้าหน้าที่งานวางแผนและงบประมาณ',
    default_rate_voc: '350',
    default_rate_high_voc: '350',
    default_rate_prison: '350',
    default_practice_hours: '18',
    fiscal_year_start_month: '10',
    server_deployment_mode: 'localhost',
    server_domain_or_ip: 'localhost',
    server_frontend_port: '8888',
    server_backend_port: '5080',
    server_db_port: '3307',
    server_db_mode: 'docker_internal',
    server_external_db_host: 'localhost',
    server_external_db_port: '3306',
    server_external_db_name: 'training_budget_db',
    server_external_db_user: 'root',
    server_external_db_password: ''
  };

  const [settings, setSettings] = useState<SystemSettings>(defaultCvcSettings);

  // Step 2: Server & External DB Testing State
  const [externalDbTesting, setExternalDbTesting] = useState<boolean>(false);
  const [externalDbResult, setExternalDbResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedDeployCmd, setCopiedDeployCmd] = useState<boolean>(false);
  const [showNginxModal, setShowNginxModal] = useState<boolean>(false);

  // Step 3: Live Simulator State
  const [simStudents, setSimStudents] = useState<number>(30);
  const [simHours, setSimHours] = useState<number>(18);
  const [simShareHours, setSimShareHours] = useState<number>(2);

  // Step 4: Academic Term State
  const [termYear, setTermYear] = useState<number>(2568);
  const [termSemester, setTermSemester] = useState<number>(1);

  // Step 5: Preset Master Data
  const [presetType, setPresetType] = useState<'full' | 'tech' | 'commerce' | 'none'>('full');

  // Step 6: Options
  const [seedDemoAllocations, setSeedDemoAllocations] = useState<boolean>(true);

  // Fetch initial settings & db status on mount
  useEffect(() => {
    const fetchInitData = async () => {
      try {
        setDbLoading(true);
        const [dbRes, settingsRes] = await Promise.all([
          fetch('/api/v1/settings/db-details').then((r) => r.json()),
          fetch('/api/v1/settings').then((r) => r.json())
        ]);

        if (dbRes.success) {
          setDbHealth(dbRes.data);
        }
        if (settingsRes.success && settingsRes.data && Object.keys(settingsRes.data).length > 0) {
          setSettings((prev) => ({ ...prev, ...settingsRes.data }));
        }
      } catch (err) {
        console.error('Failed to load initial diagnostic data:', err);
      } finally {
        setDbLoading(false);
      }
    };
    fetchInitData();
  }, []);

  const steps = [
    { id: 1, title: 'ข้อมูลสถานศึกษา', icon: School, desc: 'ชื่อและผู้ลงนาม' },
    { id: 2, title: 'ตั้งค่าเซิร์ฟเวอร์', icon: Server, desc: 'โหมด & ติดตั้ง Server' },
    { id: 3, title: 'อัตราจัดสรร', icon: Calculator, desc: 'เกณฑ์คำนวณงบ' },
    { id: 4, title: 'ปีการศึกษาแรก', icon: Calendar, desc: 'งวดจัดสรรเริ่มต้น' },
    { id: 5, title: 'แผนก & กลุ่มเรียน', icon: Building2, desc: 'โครงสร้างหลักสูตร' },
    { id: 6, title: 'ตรวจสอบ & เริ่มระบบ', icon: Rocket, desc: 'ยืนยันและเปิดใช้' }
  ];

  const handleNext = () => {
    if (currentStep < 6) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleApplyPresetCvc = () => {
    setSettings(defaultCvcSettings);
  };

  const handleClearSettingsForm = () => {
    setSettings({
      ...settings,
      college_name: '',
      college_code: '',
      affiliation: 'สำนักงานคณะกรรมการการอาชีวศึกษา',
      department_name: 'งานวางแผนและงบประมาณ',
      director_name: '',
      planner_name: '',
      default_operator: ''
    });
  };

  // Test external DB connection
  const handleTestExternalDb = async () => {
    setExternalDbTesting(true);
    setExternalDbResult(null);
    try {
      const res = await fetch('/api/v1/settings/test-external-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: settings.server_external_db_host,
          port: settings.server_external_db_port,
          user: settings.server_external_db_user,
          password: settings.server_external_db_password,
          database: settings.server_external_db_name
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setExternalDbResult({ success: true, message: data.message });
      } else {
        setExternalDbResult({ success: false, message: data.message || 'เชื่อมต่อล้มเหลว' });
      }
    } catch (err: any) {
      setExternalDbResult({ success: false, message: 'เกิดข้อผิดพลาด: ' + err.message });
    } finally {
      setExternalDbTesting(false);
    }
  };

  // Download .env file
  const handleDownloadEnv = () => {
    const params = new URLSearchParams({
      frontend_port: settings.server_frontend_port || '8888',
      backend_port: settings.server_backend_port || '5080',
      db_port: settings.server_db_port || '3307',
      db_name: 'training_budget_db',
      db_password: 'cvcmedia2022'
    });
    window.open(`/api/v1/settings/download-server-env?${params.toString()}`, '_blank');
  };

  // Generated deployment command for other servers
  const deployCommand = `# ติดตั้งและเปิดระบบบนเครื่อง Server อื่น (Ubuntu / Debian / CentOS / macOS):
git clone https://github.com/xX-AULGZ-Xx/training_budget.git
cd training_budget
cp .env.example .env
docker compose up -d --build

# ตรวจสอบสถานะการทำงาน:
docker compose ps`;

  const handleCopyDeployCmd = () => {
    navigator.clipboard.writeText(deployCommand);
    setCopiedDeployCmd(true);
    setTimeout(() => setCopiedDeployCmd(false), 2500);
  };

  const handleFinishStartup = async () => {
    setSubmitting(true);
    setSubmitProgress('กำลังบันทึกข้อมูลสถานศึกษาและการตั้งค่าเซิร์ฟเวอร์...');
    try {
      await new Promise((r) => setTimeout(r, 400));
      setSubmitProgress('กำลังสร้างงวดปีการศึกษาและเปิดสถานะพร้อมใช้งาน...');

      const res = await fetch('/api/v1/settings/startup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings,
          initial_term: {
            academic_year: Number(termYear),
            semester: Number(termSemester)
          },
          seed_departments: presetType !== 'none',
          preset_type: presetType,
          seed_demo_allocations: seedDemoAllocations
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'บันทึกการเริ่มต้นระบบล้มเหลว');
      }

      setSubmitProgress('เสร็จสมบูรณ์! กำลังเตรียมแดชบอร์ด...');
      await new Promise((r) => setTimeout(r, 500));
      setIsSuccess(true);
    } catch (err: any) {
      showErrorAlert('เริ่มต้นระบบไม่สำเร็จ', err.message);
    } finally {
      setSubmitting(false);
      setSubmitProgress('');
    }
  };

  // Live simulation calculation
  const simTotalBudget = simStudents * Number(settings.default_rate_voc || 350);
  const simShareAmount =
    simHours > 0
      ? ((simTotalBudget * simShareHours) / simHours) * 0.25
      : 0;
  const simRemainingBudget = simTotalBudget - simShareAmount;

  return (
    <div className="max-w-5xl mx-auto py-2 sm:py-6 px-1.5 sm:px-4">
      {/* Outer Card */}
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-slate-200/90 overflow-hidden transition-all">
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white p-4 sm:p-8 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute left-1/3 bottom-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Top Bar: Badge, DB Status, Cancel Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 relative z-10">
            <div className="flex items-center space-x-2.5 sm:space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-inner shrink-0">
                <Rocket className="w-6 h-6 text-blue-300" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-200 border border-blue-400/30 tracking-wider">
                    Initial Setup Wizard
                  </span>
                  {dbHealth && (
                    <span className="inline-flex items-center space-x-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>{dbHealth.server_version.split('-')[0]} พร้อมใช้งาน ({dbHealth.latency_ms} ms)</span>
                    </span>
                  )}
                  {dbLoading && (
                    <span className="text-[10px] text-white/50">กำลังตรวจสอบฐานข้อมูล...</span>
                  )}
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-white mt-1">
                  ตัวช่วยตั้งค่าและติดตั้งระบบครั้งแรก (Start Up Setup)
                </h1>
                <p className="text-xs text-blue-200/80 mt-0.5">
                  ระบบจัดสรรงบประมาณค่าวัสดุฝึกปฏิบัติการ • รองรับการติดตั้งทั้งเครื่องเดี่ยว, เครือข่าย LAN ในสถาบัน และ Server ภายนอก
                </p>
              </div>
            </div>

            <button
              onClick={onCancel}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white/70 hover:text-white bg-white/10 hover:bg-white/20 transition-all cursor-pointer self-start sm:self-auto border border-white/10"
            >
              ข้ามไปยังหน้าหลัก
            </button>
          </div>

          {/* Stepper Progress Bar */}
          {!isSuccess && (
            <div className="mt-8 pt-6 border-t border-white/10 relative z-10">
              <div className="grid grid-cols-6 gap-1 sm:gap-2">
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
                          ? 'opacity-100 scale-102'
                          : isDone
                          ? 'opacity-85 hover:opacity-100'
                          : 'opacity-40'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center mb-1.5 transition-all text-xs font-bold ${
                          isDone
                            ? 'bg-emerald-500 text-white shadow-md'
                            : isCurrent
                            ? 'bg-blue-500 text-white shadow-lg ring-2 ring-blue-300 ring-offset-2 ring-offset-slate-900'
                            : 'bg-white/15 text-white/70'
                        }`}
                      >
                        {isDone ? <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" /> : <Icon className="w-3.5 h-3.5 sm:w-5 sm:h-5" />}
                      </div>
                      <span className="text-[10px] sm:text-[11px] font-bold text-white hidden sm:block truncate max-w-full">
                        {s.title}
                      </span>
                      <span className="text-[9px] text-white/60 hidden md:block truncate max-w-full">
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
        <div className="p-4 sm:p-8">
          {isSuccess ? (
            /* Success Screen */
            <div className="py-8 text-center space-y-6 animate-fade-in">
              <div className="w-20 h-20 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner border border-emerald-200">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200">
                  Setup & Deployment Ready
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
                  ติดตั้งและตั้งค่าเริ่มต้นระบบเรียบร้อยสมบูรณ์!
                </h2>
                <p className="text-sm text-slate-500 max-w-lg mx-auto mt-2">
                  ระบบได้บันทึกข้อมูลสถานศึกษา ตั้งค่าสภาพแวดล้อมเซิร์ฟเวอร์ ติดตั้งแผนกวิชา และเปิดงวดภาคเรียนที่{' '}
                  <strong className="text-slate-800">{termSemester}/{termYear}</strong> พร้อมเริ่มจัดสรรงบประมาณทันที
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 max-w-xl mx-auto text-left space-y-2.5 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-200">
                  <span className="text-slate-500">สถานศึกษา:</span>
                  <span className="font-bold text-slate-800">
                    {settings.college_name} ({settings.college_code})
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-200">
                  <span className="text-slate-500">โหมดเซิร์ฟเวอร์ (Server Mode):</span>
                  <span className="font-bold text-indigo-700">
                    {settings.server_deployment_mode === 'localhost'
                      ? '💻 เครื่องเดี่ยว (Localhost)'
                      : settings.server_deployment_mode === 'lan'
                      ? `🏢 เครือข่าย LAN (${settings.server_domain_or_ip}:${settings.server_frontend_port})`
                      : `☁️ Cloud / Domain (${settings.server_domain_or_ip})`}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-200">
                  <span className="text-slate-500">ภาคเรียนปัจจุบัน:</span>
                  <span className="font-bold text-blue-700">
                    ภาคเรียนที่ {termSemester}/{termYear} (สถานะ: OPEN)
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-200">
                  <span className="text-slate-500">อัตราต่อหัว ปวช. / ปวส.:</span>
                  <span className="font-bold text-slate-800">
                    {settings.default_rate_voc} บาท / {settings.default_rate_high_voc} บาท
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">โครงสร้างแผนกวิชา:</span>
                  <span className="font-bold text-emerald-700">
                    {presetType === 'none' ? 'โครงสร้างเปล่า (กำหนดเอง)' : 'ติดตั้งสำเร็จพร้อมกลุ่มเรียน'}
                  </span>
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={onComplete}
                  className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-8 py-3.5 rounded-2xl text-white font-bold text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25 transition-all cursor-pointer transform hover:-translate-y-0.5"
                >
                  <Rocket className="w-5 h-5" />
                  <span>เข้าสู่หน้าจัดสรรงบประมาณทันที</span>
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* STEP 1: ORGANIZATION & SIGNERS */}
              {currentStep === 1 && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                        ขั้นตอนที่ 1 จาก 6
                      </span>
                      <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                        ข้อมูลสถานศึกษาและผู้ลงนามในรายงาน
                      </h3>
                      <p className="text-xs text-slate-500">
                        ระบุชื่อสถานศึกษา รหัสย่อ และผู้มีอำนาจลงนามสำหรับแสดงในหัวเอกสารการเงินและรายงานสรุป
                      </p>
                    </div>

                    <div className="flex items-center space-x-2 self-start sm:self-auto shrink-0">
                      <button
                        type="button"
                        onClick={handleApplyPresetCvc}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors flex items-center space-x-1 cursor-pointer"
                        title="กรอกข้อมูลวิทยาลัยอาชีวศึกษาเชียงรายอัตโนมัติ"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                        <span>ใช้วิทยาลัยอาชีวศึกษาเชียงราย</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleClearSettingsForm}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center space-x-1 cursor-pointer"
                        title="ล้างข้อมูลในฟอร์มเพื่อกรอกใหม่"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>ล้างฟอร์ม</span>
                      </button>
                    </div>
                  </div>

                  {/* Form fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        ชื่อสถานศึกษา <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={settings.college_name}
                        onChange={(e) => setSettings({ ...settings, college_name: e.target.value })}
                        placeholder="เช่น วิทยาลัยอาชีวศึกษาเชียงราย"
                        required
                        className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        รหัสย่อ/ชื่อย่อสถานศึกษา <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={settings.college_code}
                        onChange={(e) => setSettings({ ...settings, college_code: e.target.value })}
                        placeholder="เช่น CRIC, CVC หรือ วก.เชียงราย"
                        required
                        className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold text-slate-800"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        รหัสย่อนี้จะนำไปแสดงเป็นป้ายกำกับ (Badge) บนแถบเมนู Header ด้านบนของระบบ
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        หน่วยงานสังกัด
                      </label>
                      <input
                        type="text"
                        value={settings.affiliation}
                        onChange={(e) => setSettings({ ...settings, affiliation: e.target.value })}
                        placeholder="เช่น สำนักงานคณะกรรมการการอาชีวศึกษา"
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
                        placeholder="เช่น งานวางแผนและงบประมาณ"
                        className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Signers Section */}
                  <div className="pt-4 border-t border-slate-200">
                    <h4 className="text-xs font-bold text-slate-800 mb-3 flex items-center space-x-1.5">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span>รายชื่อผู้บริหารและผู้ลงนามรับรองรายงาน</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          ผู้อำนวยการสถานศึกษา
                        </label>
                        <input
                          type="text"
                          value={settings.director_name}
                          onChange={(e) => setSettings({ ...settings, director_name: e.target.value })}
                          placeholder="ชื่อ-นามสกุล ผู้อำนวยการ"
                          className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          หัวหน้างานวางแผนและงบประมาณ
                        </label>
                        <input
                          type="text"
                          value={settings.planner_name}
                          onChange={(e) => setSettings({ ...settings, planner_name: e.target.value })}
                          placeholder="ชื่อ-นามสกุล หัวหน้างาน"
                          className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          เจ้าหน้าที่ผู้จัดทำงบประมาณ
                        </label>
                        <input
                          type="text"
                          value={settings.default_operator}
                          onChange={(e) => setSettings({ ...settings, default_operator: e.target.value })}
                          placeholder="ชื่อ-นามสกุล เจ้าหน้าที่"
                          className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Header Live Preview Banner */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      ตัวอย่างหัวเอกสารรายงานจริง (Live Preview)
                    </span>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 text-center shadow-2xs">
                      <div className="text-sm font-extrabold text-slate-800">
                        {settings.college_name || 'ชื่อสถานศึกษา'}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {settings.department_name} • {settings.affiliation}
                      </div>
                      <div className="text-[10px] text-blue-600 font-semibold mt-1">
                        รายงานการจัดสรรงบประมาณค่าวัสดุฝึกประจำภาคเรียน
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: SERVER & DEPLOYMENT CONFIGURATION */}
              {currentStep === 2 && (
                <div className="space-y-6 animate-fade-in">
                  <div>
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                      ขั้นตอนที่ 2 จาก 6
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                      การตั้งค่าสภาพแวดล้อมเซิร์ฟเวอร์และการติดตั้ง (Server & Deployment)
                    </h3>
                    <p className="text-xs text-slate-500">
                      เลือกรูปแบบการติดตั้งสำหรับเครื่องนี้ หรือเตรียมการสำหรับนำไประบบไปรันบน Server เครื่องอื่น
                    </p>
                  </div>

                  {/* Deployment Target Selection */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-2.5">
                      1. เลือกรูปแบบสภาพแวดล้อมการติดตั้ง (Deployment Target):
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Mode 1: Localhost */}
                      <div
                        onClick={() =>
                          setSettings({
                            ...settings,
                            server_deployment_mode: 'localhost',
                            server_domain_or_ip: 'localhost',
                            server_frontend_port: '8888'
                          })
                        }
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                          settings.server_deployment_mode === 'localhost'
                            ? 'border-blue-600 bg-blue-50/60 shadow-md ring-2 ring-blue-200'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-extrabold text-slate-900 flex items-center space-x-1.5">
                            <Laptop className="w-4 h-4 text-blue-600" />
                            <span>เครื่องเดี่ยว (Localhost)</span>
                          </span>
                          {settings.server_deployment_mode === 'localhost' && (
                            <CheckCircle className="w-4 h-4 text-blue-600" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500">
                          เหมาะสำหรับทดสอบ, รันบนเครื่องคอมพิวเตอร์ส่วนบุคคล หรือเครื่องประจำแผนกงาน
                        </p>
                        <div className="text-[10px] font-mono text-slate-600 mt-2 bg-white/80 px-2 py-1 rounded border border-slate-200">
                          URL: http://localhost:8888
                        </div>
                      </div>

                      {/* Mode 2: Campus LAN */}
                      <div
                        onClick={() =>
                          setSettings({
                            ...settings,
                            server_deployment_mode: 'lan',
                            server_domain_or_ip: settings.server_domain_or_ip === 'localhost' ? '192.168.1.100' : settings.server_domain_or_ip,
                            server_frontend_port: '8888'
                          })
                        }
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                          settings.server_deployment_mode === 'lan'
                            ? 'border-blue-600 bg-blue-50/60 shadow-md ring-2 ring-blue-200'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-extrabold text-slate-900 flex items-center space-x-1.5">
                            <Network className="w-4 h-4 text-indigo-600" />
                            <span>เครือข่ายวิทยาลัย (LAN)</span>
                          </span>
                          {settings.server_deployment_mode === 'lan' && (
                            <CheckCircle className="w-4 h-4 text-blue-600" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500">
                          เปิดให้ครูและแผนกวิชาต่างๆ ในวิทยาลัยเข้าใช้งานผ่านวงแลนเดียวกัน
                        </p>
                        <div className="text-[10px] font-mono text-indigo-700 mt-2 bg-white/80 px-2 py-1 rounded border border-indigo-200">
                          IP เช่น 192.168.x.x:8888
                        </div>
                      </div>

                      {/* Mode 3: Cloud VPS */}
                      <div
                        onClick={() =>
                          setSettings({
                            ...settings,
                            server_deployment_mode: 'cloud',
                            server_domain_or_ip: settings.server_domain_or_ip === 'localhost' ? 'budget.cvc.ac.th' : settings.server_domain_or_ip,
                            server_frontend_port: '80'
                          })
                        }
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                          settings.server_deployment_mode === 'cloud'
                            ? 'border-blue-600 bg-blue-50/60 shadow-md ring-2 ring-blue-200'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-extrabold text-slate-900 flex items-center space-x-1.5">
                            <Globe className="w-4 h-4 text-emerald-600" />
                            <span>Cloud VPS / Domain</span>
                          </span>
                          {settings.server_deployment_mode === 'cloud' && (
                            <CheckCircle className="w-4 h-4 text-blue-600" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500">
                          ติดตั้งบนคลาวด์เซิร์ฟเวอร์ หรือเครื่องแม่ข่ายจริงที่มีชื่อโดเมนและ SSL/HTTPS
                        </p>
                        <div className="text-[10px] font-mono text-emerald-700 mt-2 bg-white/80 px-2 py-1 rounded border border-emerald-200">
                          https://budget.college.ac.th
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Server Network Details */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                    <h4 className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                      <Cpu className="w-4 h-4 text-blue-600" />
                      <span>กำหนดค่า Hostname และพอร์ตบริการ (Ports & Network)</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Server Domain หรือ IP
                        </label>
                        <input
                          type="text"
                          value={settings.server_domain_or_ip || 'localhost'}
                          onChange={(e) => setSettings({ ...settings, server_domain_or_ip: e.target.value })}
                          placeholder="เช่น 192.168.1.100 หรือ budget.cvc.ac.th"
                          className="w-full text-xs font-mono bg-white border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Web Frontend Port (โฮสต์)
                        </label>
                        <input
                          type="text"
                          value={settings.server_frontend_port || '8888'}
                          onChange={(e) => setSettings({ ...settings, server_frontend_port: e.target.value })}
                          placeholder="8888 หรือ 80"
                          className="w-full text-xs font-mono bg-white border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Backend API Port (โฮสต์)
                        </label>
                        <input
                          type="text"
                          value={settings.server_backend_port || '5080'}
                          onChange={(e) => setSettings({ ...settings, server_backend_port: e.target.value })}
                          placeholder="5080"
                          className="w-full text-xs font-mono bg-white border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Database Engine Selection */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                        <HardDrive className="w-4 h-4 text-indigo-600" />
                        <span>การกำหนดค่าฐานข้อมูล (Database Engine)</span>
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label
                        className={`flex items-start space-x-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                          settings.server_db_mode !== 'external'
                            ? 'bg-blue-50/70 border-blue-300 ring-1 ring-blue-200'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name="db_mode"
                          checked={settings.server_db_mode !== 'external'}
                          onChange={() => setSettings({ ...settings, server_db_mode: 'docker_internal' })}
                          className="w-4 h-4 text-blue-600 mt-0.5 cursor-pointer"
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">
                            ใช้ MariaDB 11.4 ใน Docker (แนะนำ)
                          </span>
                          <span className="text-[11px] text-slate-500 leading-relaxed block mt-0.5">
                            ฐานข้อมูลจะถูกจัดการและทำงานคู่กับระบบอัตโนมัติ ไม่ต้องติดตั้งโปรแกรม DB แยกต่างหาก
                          </span>
                        </div>
                      </label>

                      <label
                        className={`flex items-start space-x-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                          settings.server_db_mode === 'external'
                            ? 'bg-blue-50/70 border-blue-300 ring-1 ring-blue-200'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name="db_mode"
                          checked={settings.server_db_mode === 'external'}
                          onChange={() => setSettings({ ...settings, server_db_mode: 'external' })}
                          className="w-4 h-4 text-blue-600 mt-0.5 cursor-pointer"
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">
                            เชื่อมต่อ Database Server ภายนอก
                          </span>
                          <span className="text-[11px] text-slate-500 leading-relaxed block mt-0.5">
                            ใช้ MySQL หรือ MariaDB ส่วนกลางของสถานศึกษาที่มีอยู่แล้ว
                          </span>
                        </div>
                      </label>
                    </div>

                    {/* External DB Form */}
                    {settings.server_db_mode === 'external' && (
                      <div className="pt-3 border-t border-slate-200 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              DB Host / IP
                            </label>
                            <input
                              type="text"
                              value={settings.server_external_db_host || ''}
                              onChange={(e) => setSettings({ ...settings, server_external_db_host: e.target.value })}
                              placeholder="เช่น 192.168.1.200"
                              className="w-full text-xs font-mono bg-white border border-slate-300 rounded-lg p-2 focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              DB Port
                            </label>
                            <input
                              type="text"
                              value={settings.server_external_db_port || '3306'}
                              onChange={(e) => setSettings({ ...settings, server_external_db_port: e.target.value })}
                              placeholder="3306"
                              className="w-full text-xs font-mono bg-white border border-slate-300 rounded-lg p-2 focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Database Name
                            </label>
                            <input
                              type="text"
                              value={settings.server_external_db_name || 'training_budget_db'}
                              onChange={(e) => setSettings({ ...settings, server_external_db_name: e.target.value })}
                              placeholder="training_budget_db"
                              className="w-full text-xs font-mono bg-white border border-slate-300 rounded-lg p-2 focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Username
                            </label>
                            <input
                              type="text"
                              value={settings.server_external_db_user || 'root'}
                              onChange={(e) => setSettings({ ...settings, server_external_db_user: e.target.value })}
                              placeholder="root"
                              className="w-full text-xs font-mono bg-white border border-slate-300 rounded-lg p-2 focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Password
                            </label>
                            <input
                              type="password"
                              value={settings.server_external_db_password || ''}
                              onChange={(e) => setSettings({ ...settings, server_external_db_password: e.target.value })}
                              placeholder="รหัสผ่านฐานข้อมูล"
                              className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 focus:outline-none"
                            />
                          </div>

                          <div className="flex items-end">
                            <button
                              type="button"
                              onClick={handleTestExternalDb}
                              disabled={externalDbTesting}
                              className="w-full px-3 py-2 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${externalDbTesting ? 'animate-spin' : ''}`} />
                              <span>{externalDbTesting ? 'กำลังทดสอบ...' : 'ทดสอบการเชื่อมต่อ'}</span>
                            </button>
                          </div>
                        </div>

                        {externalDbResult && (
                          <div
                            className={`p-3 rounded-xl border text-xs flex items-center space-x-2 ${
                              externalDbResult.success
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}
                          >
                            {externalDbResult.success ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                            )}
                            <span>{externalDbResult.message}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Helper for other servers */}
                  <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-indigo-950 flex items-center space-x-1.5">
                        <Terminal className="w-4 h-4 text-indigo-600" />
                        <span>ชุดคำสั่งสำหรับนำไปติดตั้งบน Server อื่น (Cross-Server Deployment Script)</span>
                      </span>

                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={handleCopyDeployCmd}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-indigo-700 bg-white hover:bg-indigo-100 border border-indigo-200 transition-colors flex items-center space-x-1 cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{copiedDeployCmd ? 'คัดลอกแล้ว!' : 'คัดลอกคำสั่ง'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleDownloadEnv}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-emerald-700 bg-white hover:bg-emerald-50 border border-emerald-200 transition-colors flex items-center space-x-1 cursor-pointer"
                        >
                          <Download className="w-3 h-3 text-emerald-600" />
                          <span>ดาวน์โหลด .env</span>
                        </button>
                      </div>
                    </div>

                    <div className="bg-slate-900 rounded-xl p-3 font-mono text-[11px] text-slate-200 overflow-x-auto border border-slate-800">
                      <pre className="whitespace-pre-wrap">{deployCommand}</pre>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-indigo-700">
                      <span>รองรับทั้ง Ubuntu 22.04/24.04, Debian 12, CentOS, Docker Desktop บน Windows Server</span>
                      <button
                        type="button"
                        onClick={() => setShowNginxModal(!showNginxModal)}
                        className="underline font-semibold cursor-pointer"
                      >
                        {showNginxModal ? 'ซ่อน Nginx Reverse Proxy' : 'ดูตัวอย่าง Nginx Config สำหรับโดเมนจริง'}
                      </button>
                    </div>

                    {showNginxModal && (
                      <div className="mt-2 p-3 bg-white rounded-xl border border-indigo-200 text-xs font-mono space-y-2 text-slate-800">
                        <div className="text-[11px] font-sans font-bold text-slate-700">
                          ตัวอย่าง Nginx Configuration บน Linux Host (เช่น /etc/nginx/sites-available/budget):
                        </div>
                        <pre className="text-[10px] bg-slate-50 p-2.5 rounded-lg border border-slate-200 overflow-x-auto whitespace-pre">
{`server {
    listen 80;
    server_name ${settings.server_domain_or_ip || 'budget.college.ac.th'};

    location / {
        proxy_pass http://127.0.0.1:${settings.server_frontend_port || '8888'};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}`}
                        </pre>
                        <span className="text-[10px] font-sans text-slate-500 block">
                          เปิดใช้งาน SSL อัตโนมัติด้วยคำสั่ง: <code className="bg-slate-100 px-1 py-0.5 rounded">sudo certbot --nginx -d {settings.server_domain_or_ip || 'budget.college.ac.th'}</code>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 3: RATES & SIMULATOR */}
              {currentStep === 3 && (
                <div className="space-y-6 animate-fade-in">
                  <div>
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                      ขั้นตอนที่ 3 จาก 6
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                      อัตราค่าจัดสรรมาตรฐานและระบบจำลองสูตรคำนวณ
                    </h3>
                    <p className="text-xs text-slate-500">
                      กำหนดอัตราค่าวัสดุฝึกต่อหัวตามระเบียบงบประมาณของแต่ละระดับ และทดสอบสูตรปันส่วนสอนช่วย
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
                      <span className="text-[10px] text-slate-500 mt-1 block">มาตรฐาน สอศ.: 350 บาท</span>
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
                      <span className="text-[10px] text-slate-500 mt-1 block">มาตรฐาน สอศ.: 350 บาท</span>
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
                      <span className="text-[10px] text-slate-500 mt-1 block">โครงการพิเศษ: 350 บาท</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        ชั่วโมงฝึกปฏิบัติตั้งต้น (ชม./สัปดาห์ หรือ ภาคเรียน)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={settings.default_practice_hours}
                        onChange={(e) => setSettings({ ...settings, default_practice_hours: e.target.value })}
                        className="w-full text-sm bg-white border border-slate-300 rounded-xl p-2.5 font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none tabular-nums"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">
                        ใช้เป็นค่ามาตรฐานในช่องรวมชั่วโมงฝึกปฏิบัติ
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        เดือนเริ่มต้นปีงบประมาณ
                      </label>
                      <select
                        value={settings.fiscal_year_start_month}
                        onChange={(e) => setSettings({ ...settings, fiscal_year_start_month: e.target.value })}
                        className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                      >
                        <option value="10">ตุลาคม (ระบบงบประมาณราชการไทย)</option>
                        <option value="1">มกราคม (ปีปฏิทิน)</option>
                        <option value="5">พฤษภาคม (เปิดภาคเรียนที่ 1)</option>
                      </select>
                      <p className="text-[11px] text-slate-500 mt-1">
                        กำหนดรอบปฏิทินปีงบประมาณของสถานศึกษา
                      </p>
                    </div>
                  </div>

                  {/* Interactive Calculation Simulator */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50/70 to-blue-50/70 border border-indigo-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-indigo-900 flex items-center space-x-1.5">
                        <Sliders className="w-4 h-4 text-indigo-600" />
                        <span>เครื่องจำลองสูตรคำนวณงบประมาณ (Formula Simulator)</span>
                      </span>
                      <span className="text-[11px] text-indigo-600 bg-white/80 px-2 py-0.5 rounded-md border border-indigo-200 font-medium">
                        สูตรมาตรฐานวิทยาลัย
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          ทดลองใส่จำนวนนักเรียน (คน):
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="200"
                          value={simStudents}
                          onChange={(e) => setSimStudents(Number(e.target.value))}
                          className="w-full text-xs bg-white border border-indigo-200 rounded-lg p-2 font-bold text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          รวมชั่วโมงปฏิบัติ (ชม.):
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="50"
                          value={simHours}
                          onChange={(e) => setSimHours(Number(e.target.value))}
                          className="w-full text-xs bg-white border border-indigo-200 rounded-lg p-2 font-bold text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          ชั่วโมงสอนช่วย (ชม.):
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={simShareHours}
                          onChange={(e) => setSimShareHours(Number(e.target.value))}
                          className="w-full text-xs bg-white border border-indigo-200 rounded-lg p-2 font-bold text-slate-800"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-indigo-200/60 text-xs">
                      <div className="bg-white/90 p-2.5 rounded-xl border border-indigo-100">
                        <span className="text-[10px] text-slate-500 block">งบคำนวณตั้งต้น (100%):</span>
                        <span className="font-extrabold text-blue-700 text-sm">
                          {simTotalBudget.toLocaleString()} บาท
                        </span>
                      </div>
                      <div className="bg-white/90 p-2.5 rounded-xl border border-indigo-100">
                        <span className="text-[10px] text-amber-600 block">โอนปันส่วนสอนช่วย (25%):</span>
                        <span className="font-extrabold text-amber-700 text-sm">
                          {simShareAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
                        </span>
                      </div>
                      <div className="bg-white/90 p-2.5 rounded-xl border border-indigo-100">
                        <span className="text-[10px] text-emerald-600 block">คงเหลือแผนกตนเอง:</span>
                        <span className="font-extrabold text-emerald-700 text-sm">
                          {simRemainingBudget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: ACADEMIC TERM */}
              {currentStep === 4 && (
                <div className="space-y-6 animate-fade-in">
                  <div>
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                      ขั้นตอนที่ 4 จาก 6
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
                        className="w-full text-base font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none tabular-nums"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        ภาคเรียนที่ <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={termSemester}
                        onChange={(e) => setTermSemester(Number(e.target.value))}
                        className="w-full text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                      >
                        <option value={1}>ภาคเรียนที่ 1 (พฤษภาคม - ตุลาคม)</option>
                        <option value={2}>ภาคเรียนที่ 2 (พฤศจิกายน - เมษายน)</option>
                        <option value={3}>ภาคเรียนที่ 3 (ภาคฤดูร้อน)</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex items-start space-x-3.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-emerald-900 block">
                        สถานะงวดอัตโนมัติ: OPEN (เปิดงวดจัดสรรทันที)
                      </span>
                      <p className="text-[11px] text-emerald-700 leading-relaxed">
                        ภาคเรียนที่ <strong>{termSemester}/{termYear}</strong> จะถูกตั้งเป็น <strong>ภาคเรียนปัจจุบัน (Active Current Term)</strong> สำหรับการบันทึกรายการคำนวณและสรุปงบประมาณทันทีหลังการติดตั้งเสร็จสิ้น
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2 text-slate-600">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <span>ต้องการเพิ่มภาคเรียนย้อนหลังหรือปีการศึกษาอื่นเพิ่มเติม?</span>
                    </div>
                    <span className="text-[11px] font-semibold text-blue-600">
                      สามารถเพิ่มได้ตลอดเวลาในหน้าตั้งค่า
                    </span>
                  </div>
                </div>
              )}

              {/* STEP 5: PRESET MASTER DATA */}
              {currentStep === 5 && (
                <div className="space-y-6 animate-fade-in">
                  <div>
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                      ขั้นตอนที่ 5 จาก 6
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                      แผนกวิชาและกลุ่มเรียนเริ่มต้น (Curriculum & Department Structure)
                    </h3>
                    <p className="text-xs text-slate-500">
                      เลือกชุดแม่แบบโครงสร้างแผนกวิชาและกลุ่มเรียนตัวอย่างเพื่อความสะดวกรวดเร็วในการใช้งาน
                    </p>
                  </div>

                  {/* Preset Options Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Option 1: Full */}
                    <div
                      onClick={() => setPresetType('full')}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                        presetType === 'full'
                          ? 'border-blue-600 bg-blue-50/50 shadow-md ring-2 ring-blue-200'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-extrabold text-slate-900 flex items-center space-x-1.5">
                          <Layers className="w-4 h-4 text-blue-600" />
                          <span>มาตรฐานวิทยาลัยอาชีวศึกษา (ครบวงจร)</span>
                        </span>
                        {presetType === 'full' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white">
                            แนะนำ
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mb-2">
                        ติดตั้ง 13 แผนกวิชาชีพ และแผนกวิชาบริการ (IT, ยนต์, ไฟฟ้า, อิเล็กทรอนิกส์, บัญชี, การตลาด, โรงแรม, อาหาร, สามัญสัมพันธ์ ฯลฯ) พร้อมกลุ่มเรียนตัวอย่าง
                      </p>
                      <div className="text-[10px] font-bold text-blue-700">
                        ✓ แผนกวิชาชีพ 11 แผนก • ✓ แผนกวิชาบริการ 2 แผนก
                      </div>
                    </div>

                    {/* Option 2: Tech */}
                    <div
                      onClick={() => setPresetType('tech')}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                        presetType === 'tech'
                          ? 'border-blue-600 bg-blue-50/50 shadow-md ring-2 ring-blue-200'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-extrabold text-slate-900 flex items-center space-x-1.5">
                          <Building2 className="w-4 h-4 text-indigo-600" />
                          <span>สายช่างอุตสาหกรรมและเทคโนโลยี</span>
                        </span>
                        {presetType === 'tech' && (
                          <CheckCircle className="w-4 h-4 text-blue-600" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mb-2">
                        เหมาะสำหรับวิทยาลัยเทคนิค: แผนกเทคโนโลยีสารสนเทศ, ช่างยนต์, ไฟฟ้ากำลัง, อิเล็กทรอนิกส์, สามัญสัมพันธ์ และภาษาต่างประเทศ
                      </p>
                      <div className="text-[10px] font-bold text-indigo-700">
                        ✓ แผนกวิชาชีพ 4 แผนก • ✓ แผนกวิชาบริการ 2 แผนก
                      </div>
                    </div>

                    {/* Option 3: Commerce */}
                    <div
                      onClick={() => setPresetType('commerce')}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                        presetType === 'commerce'
                          ? 'border-blue-600 bg-blue-50/50 shadow-md ring-2 ring-blue-200'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-extrabold text-slate-900 flex items-center space-x-1.5">
                          <Building2 className="w-4 h-4 text-emerald-600" />
                          <span>สายพาณิชยกรรมและการบริการ</span>
                        </span>
                        {presetType === 'commerce' && (
                          <CheckCircle className="w-4 h-4 text-blue-600" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mb-2">
                        เหมาะสำหรับสายพาณิชย์: บัญชี, การตลาด, เลขานุการ, การโรงแรม, อาหารและโภชนาการ และแผนกวิชาสามัญสัมพันธ์
                      </p>
                      <div className="text-[10px] font-bold text-emerald-700">
                        ✓ แผนกวิชาชีพ 5 แผนก • ✓ แผนกวิชาบริการ 2 แผนก
                      </div>
                    </div>

                    {/* Option 4: None */}
                    <div
                      onClick={() => setPresetType('none')}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                        presetType === 'none'
                          ? 'border-blue-600 bg-blue-50/50 shadow-md ring-2 ring-blue-200'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-extrabold text-slate-900 flex items-center space-x-1.5">
                          <RotateCcw className="w-4 h-4 text-slate-600" />
                          <span>โครงสร้างว่างเปล่า (กำหนดเองภายหลัง)</span>
                        </span>
                        {presetType === 'none' && (
                          <CheckCircle className="w-4 h-4 text-blue-600" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mb-2">
                        ไม่ติดตั้งแผนกเริ่มต้น ผู้ดูแลระบบสามารถสร้างและกำหนดรายชื่อแผนกและกลุ่มเรียนเองทั้งหมดในเมนูตั้งค่า
                      </p>
                      <div className="text-[10px] font-bold text-slate-600">
                        เริ่มต้นด้วยตารางว่างเปล่า
                      </div>
                    </div>
                  </div>

                  {/* Department Chips Preview */}
                  {presetType !== 'none' && (
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-800">
                          ตัวอย่างแผนกวิชาที่จะสร้างในระบบ:
                        </h4>
                        <span className="text-[10px] text-slate-400">
                          สามารถปรับเปลี่ยนชื่อหรือเพิ่มแผนกอื่นได้เสมอ
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 text-[11px]">
                        {(presetType === 'full' || presetType === 'tech') && (
                          <>
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
                              📻 แผนกช่างอิเล็กทรอนิกส์
                            </span>
                          </>
                        )}
                        {(presetType === 'full' || presetType === 'commerce') && (
                          <>
                            <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-medium text-slate-700">
                              📊 แผนกการบัญชี
                            </span>
                            <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-medium text-slate-700">
                              🛍️ แผนกการตลาด
                            </span>
                            <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-medium text-slate-700">
                              🏨 แผนกการโรงแรมและการท่องเที่ยว
                            </span>
                            <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-medium text-slate-700">
                              🍳 แผนกอาหารและโภชนาการ
                            </span>
                          </>
                        )}
                        <span className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-300 font-bold text-amber-800">
                          📚 แผนกสามัญสัมพันธ์ (วิชาบริการ)
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-300 font-bold text-amber-800">
                          🌐 แผนกภาษาต่างประเทศ (วิชาบริการ)
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 6: REVIEW & LAUNCH */}
              {currentStep === 6 && (
                <div className="space-y-6 animate-fade-in">
                  <div>
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                      ขั้นตอนที่ 6 จาก 6
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                      ตรวจสอบข้อมูลและยืนยันการเริ่มต้นระบบ
                    </h3>
                    <p className="text-xs text-slate-500">
                      โปรดตรวจสอบความถูกต้องของข้อมูลก่อนทำการบันทึกและเปิดใช้งานระบบ
                    </p>
                  </div>

                  {/* Summary Checklist */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-slate-200">
                      <span className="text-slate-500">ชื่อสถานศึกษา:</span>
                      <span className="font-bold text-slate-900">
                        {settings.college_name} ({settings.college_code})
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-200">
                      <span className="text-slate-500">โหมดการติดตั้ง / URL:</span>
                      <span className="font-bold text-indigo-700">
                        {settings.server_deployment_mode === 'localhost'
                          ? `Localhost (พอร์ต ${settings.server_frontend_port})`
                          : settings.server_deployment_mode === 'lan'
                          ? `LAN (http://${settings.server_domain_or_ip}:${settings.server_frontend_port})`
                          : `Cloud Domain (${settings.server_domain_or_ip})`}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-200">
                      <span className="text-slate-500">หน่วยงานสังกัด / ฝ่ายงาน:</span>
                      <span className="font-medium text-slate-800">
                        {settings.affiliation} • {settings.department_name}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-200">
                      <span className="text-slate-500">ภาคเรียนเริ่มต้น:</span>
                      <span className="font-bold text-blue-700">
                        ภาคเรียนที่ {termSemester}/{termYear} (สถานะ: เปิดงวดทันที)
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-200">
                      <span className="text-slate-500">อัตราต่อหัว ปวช. / ปวส. / เรือนจำ:</span>
                      <span className="font-bold text-slate-900">
                        {settings.default_rate_voc} บ. / {settings.default_rate_high_voc} บ. / {settings.default_rate_prison} บ.
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-200">
                      <span className="text-slate-500">ชุดโครงสร้างแผนกวิชา:</span>
                      <span className="font-bold text-emerald-700">
                        {presetType === 'full'
                          ? 'มาตรฐานวิทยาลัยครบวงจร'
                          : presetType === 'tech'
                          ? 'สายช่างอุตสาหกรรม'
                          : presetType === 'commerce'
                          ? 'สายพาณิชยกรรม'
                          : 'โครงสร้างว่างเปล่า'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-500">ฐานข้อมูล:</span>
                      <span className="font-semibold text-slate-800">
                        {settings.server_db_mode === 'external'
                          ? `External DB (${settings.server_external_db_host}:${settings.server_external_db_port})`
                          : `MariaDB 11.4 Container (${dbHealth ? `เชื่อมต่อสำเร็จ, ${dbHealth.latency_ms} ms` : 'พร้อมบันทึก'})`}
                      </span>
                    </div>
                  </div>

                  {/* Seed Demo Option */}
                  <label className="flex items-start space-x-3 p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200 cursor-pointer hover:bg-indigo-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={seedDemoAllocations}
                      onChange={(e) => setSeedDemoAllocations(e.target.checked)}
                      className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 mt-0.5 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-indigo-950">
                        โหลดรายการจัดสรรตัวอย่าง (Demo Allocations) สำหรับทดลองระบบ
                      </span>
                      <p className="text-[11px] text-indigo-700 mt-0.5 leading-relaxed">
                        ระบบจะสร้างรายการจัดสรรงบประมาณตัวอย่าง พร้อมการคำนวณโอนสอนช่วยให้แผนกสามัญสัมพันธ์ เพื่อให้คุณเห็นตัวเลขและทดสอบรายงานได้ทันที (สามารถลบหรือล้างข้อมูลได้ทุกเมื่อในหน้าตั้งค่า)
                      </p>
                    </div>
                  </label>

                  {/* Submission Progress indicator */}
                  {submitting && (
                    <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 space-y-2 text-xs">
                      <div className="flex items-center space-x-2 text-blue-800 font-bold">
                        <Activity className="w-4 h-4 animate-spin text-blue-600" />
                        <span>{submitProgress}</span>
                      </div>
                      <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
                        <div className="bg-blue-600 h-2 rounded-full animate-pulse w-3/4" />
                      </div>
                    </div>
                  )}
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
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>ย้อนกลับ</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {currentStep < 6 ? (
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
                      className="px-8 py-3 rounded-2xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 shadow-md shadow-blue-500/25 flex items-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Rocket className="w-4 h-4" />
                      <span>{submitting ? 'กำลังติดตั้งระบบ...' : 'บันทึกและเริ่มใช้งานระบบ'}</span>
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
