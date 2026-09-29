import React, { useState, useEffect } from 'react';
import { AcademicTerm, Department, ClassGroup, EducationLevel, SystemSettings, DatabaseHealth } from '../types';
import {
  showSuccessToast,
  showErrorAlert,
  showDangerConfirmDialog
} from '../utils/alerts';
import {
  Calendar,
  Building2,
  Users,
  Plus,
  Edit3,
  Trash2,
  X,
  Save,
  AlertCircle,
  Search,
  Lock,
  Unlock,
  Archive,
  Star,
  Settings,
  Database,
  Download,
  RotateCcw,
  ShieldCheck,
  School,
  FileCheck,
  Calculator,
  Loader2,
  Rocket,
  Activity,
  FileCode,
  Terminal,
  Eye,
  EyeOff
} from 'lucide-react';

interface SettingsPageProps {
  terms: AcademicTerm[];
  departments: Department[];
  classGroups: ClassGroup[];
  educationLevels: EducationLevel[];
  onOpenStartupWizard?: () => void;
  onRefreshData: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  terms,
  departments,
  classGroups,
  educationLevels,
  onOpenStartupWizard,
  onRefreshData
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'terms' | 'departments' | 'groups' | 'tools'>('general');

  // System Settings State
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
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
  const [settingsLoading, setSettingsLoading] = useState<boolean>(false);
  const [settingsSaving, setSettingsSaving] = useState<boolean>(false);

  // Search & Filters
  const [termSearch, setTermSearch] = useState<string>('');
  const [deptSearch, setDeptSearch] = useState<string>('');
  const [groupSearch, setGroupSearch] = useState<string>('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('all');

  // Term Modal State
  const [isTermModalOpen, setIsTermModalOpen] = useState<boolean>(false);
  const [editingTerm, setEditingTerm] = useState<AcademicTerm | null>(null);
  const [termYear, setTermYear] = useState<number | ''>(2568);
  const [termSemester, setTermSemester] = useState<number>(1);
  const [termStatus, setTermStatus] = useState<'OPEN' | 'CLOSED' | 'ARCHIVED'>('OPEN');
  const [termIsCurrent, setTermIsCurrent] = useState<boolean>(false);
  const [termSubmitting, setTermSubmitting] = useState<boolean>(false);
  const [termError, setTermError] = useState<string | null>(null);

  // Department Modal State
  const [isDeptModalOpen, setIsDeptModalOpen] = useState<boolean>(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptCode, setDeptCode] = useState<string>('');
  const [deptName, setDeptName] = useState<string>('');
  const [deptIsService, setDeptIsService] = useState<boolean>(false);
  const [deptSubmitting, setDeptSubmitting] = useState<boolean>(false);
  const [deptError, setDeptError] = useState<string | null>(null);

  // Group Modal State
  const [isGroupModalOpen, setIsGroupModalOpen] = useState<boolean>(false);
  const [editingGroup, setEditingGroup] = useState<ClassGroup | null>(null);
  const [groupName, setGroupName] = useState<string>('');
  const [groupDeptId, setGroupDeptId] = useState<number | ''>('');
  const [groupLevelId, setGroupLevelId] = useState<number | ''>('');
  const [groupSubmitting, setGroupSubmitting] = useState<boolean>(false);
  const [groupError, setGroupError] = useState<string | null>(null);

  const showToast = (msg: string) => {
    showSuccessToast(msg);
  };

  // Load System Settings
  const loadSettings = async () => {
    try {
      setSettingsLoading(true);
      const res = await fetch('/api/v1/settings');
      const data = await res.json();
      if (data.success) {
        setSystemSettings((prev) => ({ ...prev, ...data.data }));
      }
    } catch (err) {
      console.error('Error loading settings:', err);
    } finally {
      setSettingsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  // Database Health State
  const [dbHealth, setDbHealth] = useState<DatabaseHealth | null>(null);
  const [pingLoading, setPingLoading] = useState<boolean>(false);
  const [pingResult, setPingResult] = useState<string | null>(null);
  const [showDbPassword, setShowDbPassword] = useState<boolean>(false);

  const loadDbHealth = async () => {
    try {
      const res = await fetch('/api/v1/settings/db-details');
      const data = await res.json();
      if (data.success) {
        setDbHealth(data.data);
      }
    } catch (err) {
      console.error('Error loading db details:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'tools') {
      loadDbHealth();
    }
  }, [activeTab]);

  const handlePingDb = async () => {
    setPingLoading(true);
    setPingResult(null);
    try {
      const res = await fetch('/api/v1/settings/db-ping', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setPingResult(`Ping สำเร็จ: ${data.latency_ms} ms`);
        showToast(`Ping MariaDB สำเร็จ: ${data.latency_ms} ms`);
        loadDbHealth();
      }
    } catch (err: any) {
      setPingResult('ไม่สามารถเชื่อมต่อได้: ' + err.message);
    } finally {
      setPingLoading(false);
    }
  };

  const handleExportSql = () => {
    window.open('/api/v1/settings/db-export-sql', '_blank');
  };

  // Save General System Settings
  const handleSaveGeneralSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSaving(true);
    try {
      const res = await fetch('/api/v1/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(systemSettings)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'บันทึกการตั้งค่าไม่สำเร็จ');
      }
      showToast('บันทึกการตั้งค่าระบบเรียบร้อยแล้ว');
      loadSettings();
      onRefreshData();
    } catch (err: any) {
      showErrorAlert('เกิดข้อผิดพลาด', err.message);
    } finally {
      setSettingsSaving(false);
    }
  };

  // Database Tools Actions
  const handleExportBackup = () => {
    window.open('/api/v1/settings/export', '_blank');
  };

  const handleResetDemoData = async () => {
    const confirmed = await showDangerConfirmDialog(
      'ยืนยันโหลดข้อมูลตัวอย่างเริ่มต้น?',
      'ระบบจะรีเซ็ตข้อมูลจัดสรรทั้งหมดและเติมตัวอย่างใหม่สำหรับการทดสอบการคำนวณงบประมาณ',
      'ใช่, โหลดข้อมูลตัวอย่าง',
      'ยกเลิก'
    );
    if (!confirmed) return;

    try {
      const res = await fetch('/api/v1/settings/reset-demo', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'เกิดข้อผิดพลาด');
      showToast('โหลดข้อมูลตัวอย่างมาตรฐานสำเร็จ');
      onRefreshData();
      loadSettings();
    } catch (err: any) {
      showErrorAlert('เกิดข้อผิดพลาด', err.message);
    }
  };

  const handleClearAllocations = async () => {
    const confirmed = await showDangerConfirmDialog(
      'คำเตือน: ยืนยันล้างรายการจัดสรรทั้งหมด?',
      'ข้อมูลรายการจัดสรรงบประมาณและบันทึกประวัติทั้งหมดจะถูกลบเพื่อเตรียมความพร้อมสำหรับเริ่มรอบปีงบประมาณใหม่ (โครงสร้างแผนกวิชาและกลุ่มเรียนจะยังคงอยู่ครบถ้วน)',
      'ใช่, ล้างข้อมูลจัดสรร',
      'ยกเลิก'
    );
    if (!confirmed) return;

    try {
      const res = await fetch('/api/v1/settings/clear-allocations', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'เกิดข้อผิดพลาด');
      showToast('ล้างรายการจัดสรรเรียบร้อยแล้ว พร้อมเริ่มรอบปีงบประมาณใหม่');
      onRefreshData();
      loadSettings();
    } catch (err: any) {
      showErrorAlert('เกิดข้อผิดพลาด', err.message);
    }
  };

  // --- Academic Term Actions ---
  const handleOpenTermModal = (term?: AcademicTerm) => {
    if (term) {
      setEditingTerm(term);
      setTermYear(term.academic_year);
      setTermSemester(term.semester);
      setTermStatus(term.status);
      setTermIsCurrent(term.is_current === 1);
    } else {
      setEditingTerm(null);
      const defaultYear = terms.length > 0 ? Math.max(...terms.map((t) => t.academic_year)) : 2568;
      setTermYear(defaultYear);
      setTermSemester(1);
      setTermStatus('OPEN');
      setTermIsCurrent(false);
    }
    setTermError(null);
    setIsTermModalOpen(true);
  };

  const handleSaveTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    const yearNum = Number(termYear);
    if (!yearNum || yearNum < 2500 || yearNum > 2700) {
      setTermError('กรุณากรอกปีการศึกษาให้ถูกต้อง (พ.ศ. 2500 - 2700)');
      return;
    }

    setTermSubmitting(true);
    setTermError(null);

    try {
      const url = editingTerm ? `/api/v1/terms/${editingTerm.id}` : '/api/v1/terms';
      const method = editingTerm ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          academic_year: yearNum,
          semester: Number(termSemester),
          status: termStatus,
          is_current: termIsCurrent ? 1 : 0
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }

      showToast(editingTerm ? 'อัปเดตข้อมูลภาคเรียนสำเร็จ' : 'เพิ่มภาคเรียน/ปีการศึกษาสำเร็จ');
      setIsTermModalOpen(false);
      onRefreshData();
      loadSettings();
    } catch (err: any) {
      setTermError(err.message);
    } finally {
      setTermSubmitting(false);
    }
  };

  const handleSetCurrentTerm = async (term: AcademicTerm) => {
    try {
      const res = await fetch(`/api/v1/terms/${term.id}/current`, {
        method: 'PATCH'
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'ไม่สามารถตั้งเป็นภาคเรียนปัจจุบันได้');
      }
      showToast(`ตั้งภาคเรียนที่ ${term.semester}/${term.academic_year} เป็นภาคเรียนปัจจุบันเรียบร้อย`);
      onRefreshData();
      loadSettings();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleQuickStatusChange = async (term: AcademicTerm, newStatus: 'OPEN' | 'CLOSED' | 'ARCHIVED') => {
    try {
      const res = await fetch(`/api/v1/terms/${term.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'เปลี่ยนสถานะไม่สำเร็จ');
      }
      showToast(`ปรับสถานะภาคเรียน ${term.semester}/${term.academic_year} เป็น ${newStatus} เรียบร้อย`);
      onRefreshData();
      loadSettings();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteTerm = async (term: AcademicTerm) => {
    const confirmed = await showDangerConfirmDialog(
      'ยืนยันการลบภาคเรียน?',
      `คุณแน่ใจว่าต้องการลบ ภาคเรียนที่ ${term.semester}/${term.academic_year} ใช่หรือไม่? รายการที่เกี่ยวข้องอาจได้รับผลกระทบ`,
      'ใช่, ยืนยันการลบ',
      'ยกเลิก'
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/v1/terms/${term.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'ลบไม่สำเร็จ');
      }
      showToast(`ลบภาคเรียนที่ ${term.semester}/${term.academic_year} สำเร็จ`);
      onRefreshData();
      loadSettings();
    } catch (err: any) {
      showErrorAlert('ลบไม่สำเร็จ', err.message);
    }
  };

  // --- Department Actions ---
  const handleOpenDeptModal = (dept?: Department) => {
    if (dept) {
      setEditingDept(dept);
      setDeptCode(dept.code);
      setDeptName(dept.name);
      setDeptIsService(dept.is_service_department === 1);
    } else {
      setEditingDept(null);
      setDeptCode('');
      setDeptName('');
      setDeptIsService(false);
    }
    setDeptError(null);
    setIsDeptModalOpen(true);
  };

  const handleSaveDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptCode.trim() || !deptName.trim()) {
      setDeptError('กรุณากรอกรหัสและชื่อแผนกวิชาให้ครบถ้วน');
      return;
    }

    setDeptSubmitting(true);
    setDeptError(null);

    try {
      const url = editingDept
        ? `/api/v1/departments/${editingDept.id}`
        : '/api/v1/departments';
      const method = editingDept ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: deptCode.trim(),
          name: deptName.trim(),
          is_service_department: deptIsService ? 1 : 0
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }

      showToast(editingDept ? 'ปรับปรุงแผนกวิชาสำเร็จ' : 'เพิ่มแผนกวิชาสำเร็จ');
      setIsDeptModalOpen(false);
      onRefreshData();
      loadSettings();
    } catch (err: any) {
      setDeptError(err.message);
    } finally {
      setDeptSubmitting(false);
    }
  };

  const handleDeleteDepartment = async (dept: Department) => {
    const confirmed = await showDangerConfirmDialog(
      'ยืนยันการลบแผนกวิชา?',
      `คุณแน่ใจว่าต้องการลบแผนก "${dept.name}" (${dept.code}) ใช่หรือไม่? กลุ่มเรียนที่สังกัดแผนกนี้จะได้รับผลกระทบ`,
      'ใช่, ยืนยันการลบ',
      'ยกเลิก'
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/v1/departments/${dept.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'ลบไม่สำเร็จ');
      }
      showToast('ลบแผนกวิชาสำเร็จ');
      onRefreshData();
      loadSettings();
    } catch (err: any) {
      showErrorAlert('ลบไม่สำเร็จ', err.message);
    }
  };

  // --- Group Actions ---
  const handleOpenGroupModal = (group?: ClassGroup) => {
    if (group) {
      setEditingGroup(group);
      setGroupName(group.group_name);
      setGroupDeptId(group.department_id);
      setGroupLevelId(group.education_level_id);
    } else {
      setEditingGroup(null);
      setGroupName('');
      setGroupDeptId(departments[0]?.id || '');
      setGroupLevelId(educationLevels[0]?.id || '');
    }
    setGroupError(null);
    setIsGroupModalOpen(true);
  };

  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || !groupDeptId || !groupLevelId) {
      setGroupError('กรุณากรอกข้อมูลให้ครบถ้วนทุกช่อง');
      return;
    }

    setGroupSubmitting(true);
    setGroupError(null);

    try {
      const url = editingGroup
        ? `/api/v1/groups/${editingGroup.id}`
        : '/api/v1/groups';
      const method = editingGroup ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_name: groupName.trim(),
          department_id: Number(groupDeptId),
          education_level_id: Number(groupLevelId)
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }

      showToast(editingGroup ? 'ปรับปรุงกลุ่มเรียนสำเร็จ' : 'เพิ่มกลุ่มเรียนสำเร็จ');
      setIsGroupModalOpen(false);
      onRefreshData();
      loadSettings();
    } catch (err: any) {
      setGroupError(err.message);
    } finally {
      setGroupSubmitting(false);
    }
  };

  const handleDeleteGroup = async (group: ClassGroup) => {
    const confirmed = await showDangerConfirmDialog(
      'ยืนยันการลบกลุ่มเรียน?',
      `คุณแน่ใจว่าต้องการลบกลุ่มเรียน "${group.group_name}" ใช่หรือไม่?`,
      'ใช่, ยืนยันการลบ',
      'ยกเลิก'
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/v1/groups/${group.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'ลบไม่สำเร็จ');
      }
      showToast('ลบกลุ่มเรียนสำเร็จ');
      onRefreshData();
      loadSettings();
    } catch (err: any) {
      showErrorAlert('ลบไม่สำเร็จ', err.message);
    }
  };

  // Filtered lists
  const filteredTerms = terms.filter((t) => {
    const search = termSearch.toLowerCase();
    return (
      t.academic_year.toString().includes(search) ||
      t.semester.toString().includes(search) ||
      t.status.toLowerCase().includes(search)
    );
  });

  const filteredDepartments = departments.filter((d) =>
    d.name.toLowerCase().includes(deptSearch.toLowerCase()) ||
    d.code.toLowerCase().includes(deptSearch.toLowerCase())
  );

  const filteredGroups = classGroups.filter((g) => {
    const matchesDept = selectedDeptFilter === 'all' || g.department_id === Number(selectedDeptFilter);
    const matchesSearch =
      g.group_name.toLowerCase().includes(groupSearch.toLowerCase()) ||
      g.department_name.toLowerCase().includes(groupSearch.toLowerCase()) ||
      g.education_level_name.toLowerCase().includes(groupSearch.toLowerCase());
    return matchesDept && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Page Header & Navigation Tabs */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
              System Setup & Configuration
            </span>
            <span className="inline-flex items-center space-x-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              {settingsLoading ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                  <span>กำลังโหลดข้อมูล...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3 h-3" />
                  <span>MariaDB Connected</span>
                </>
              )}
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            ตั้งค่าระบบ (Setup & Master Data)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            กำหนดค่าเริ่มต้นของสถานศึกษา อัตราค่าจัดสรร ปีการศึกษา โครงสร้างแผนก และเครื่องมือสำรองข้อมูล
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center bg-slate-100/90 p-1 sm:p-1.5 rounded-xl border border-slate-200 shadow-inner gap-1 overflow-x-auto scrollbar-none whitespace-nowrap w-full">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer shrink-0 ${
              activeTab === 'general'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Settings className="w-3.5 h-3.5 shrink-0" />
            <span>ตั้งค่าทั่วไป</span>
          </button>
          <button
            onClick={() => setActiveTab('terms')}
            className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer shrink-0 ${
              activeTab === 'terms'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span>ปีการศึกษา ({terms.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('departments')}
            className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer shrink-0 ${
              activeTab === 'departments'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 shrink-0" />
            <span>แผนกวิชา ({departments.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer shrink-0 ${
              activeTab === 'groups'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 shrink-0" />
            <span>กลุ่มเรียน ({classGroups.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('tools')}
            className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer shrink-0 ${
              activeTab === 'tools'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Database className="w-3.5 h-3.5 shrink-0" />
            <span>ฐานข้อมูล (Database)</span>
          </button>
        </div>
      </div>

      {/* ================= TAB 1: GENERAL SYSTEM SETUP ================= */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          {/* Quick Setup Guide Cards */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-5 text-white shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center space-x-2">
                <span className="p-1 rounded-lg bg-blue-500/20 border border-blue-400/30">
                  <FileCheck className="w-4 h-4 text-blue-300" />
                </span>
                <h3 className="font-bold text-sm">
                  ขั้นตอนการตั้งค่าระบบและเปิดงวดจัดสรรงบประมาณ (Setup Checklist)
                </h3>
              </div>
              {onOpenStartupWizard && (
                <button
                  type="button"
                  onClick={onOpenStartupWizard}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-blue-500/30 transition-all cursor-pointer self-start sm:self-auto"
                >
                  <Rocket className="w-3.5 h-3.5" />
                  <span>เปิดตัวช่วย Start Up Setting (Wizard)</span>
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-xl border border-white/10">
                <div className="font-bold text-blue-200 flex items-center space-x-1.5 mb-1">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                    1
                  </span>
                  <span>ข้อมูลสถานศึกษา & อัตรา</span>
                </div>
                <p className="text-white/70 text-[11px] leading-relaxed">
                  ตรวจสอบชื่อสถานศึกษา สังกัด และกำหนดอัตราค่าจัดสรรต่อหัวเริ่มต้น
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-xl border border-white/10">
                <div className="font-bold text-blue-200 flex items-center space-x-1.5 mb-1">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                    2
                  </span>
                  <span>ปีการศึกษา / ภาคเรียน</span>
                </div>
                <p className="text-white/70 text-[11px] leading-relaxed">
                  เปิดงวดปีการศึกษาใหม่ และตั้งเป็นเทอมปัจจุบัน (Active Current Term)
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-xl border border-white/10">
                <div className="font-bold text-blue-200 flex items-center space-x-1.5 mb-1">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                    3
                  </span>
                  <span>แผนกวิชา & กลุ่มเรียน</span>
                </div>
                <p className="text-white/70 text-[11px] leading-relaxed">
                  ตรวจสอบแผนกวิชาชีพ และแผนกวิชาบริการ รวมถึงกลุ่มเรียนในแต่ละระดับ
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-xl border border-white/10">
                <div className="font-bold text-blue-200 flex items-center space-x-1.5 mb-1">
                  <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">
                    4
                  </span>
                  <span>บันทึกคำนวณงบประมาณ</span>
                </div>
                <p className="text-white/70 text-[11px] leading-relaxed">
                  บันทึกจำนวนนักเรียน ชั่วโมงฝึก และปันส่วนวิชาสอนช่วย พร้อมพิมพ์รายงาน PDF
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSaveGeneralSettings} className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-6 space-y-6">
            {/* Section 1: ข้อมูลสถานศึกษา */}
            <div>
              <div className="flex items-center space-x-2 pb-3 mb-4 border-b border-slate-200">
                <School className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  1. ข้อมูลสถานศึกษาและหน่วยงานผู้รับผิดชอบ (Organization Profile)
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ชื่อสถานศึกษา <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={systemSettings.college_name}
                    onChange={(e) =>
                      setSystemSettings({ ...systemSettings, college_name: e.target.value })
                    }
                    required
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    รหัสย่อ/ชื่อย่อสถานศึกษา <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={systemSettings.college_code}
                    onChange={(e) =>
                      setSystemSettings({ ...systemSettings, college_code: e.target.value })
                    }
                    placeholder="เช่น CRIC, CVC หรือ วก.เชียงราย"
                    required
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold text-slate-800"
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
                    value={systemSettings.affiliation}
                    onChange={(e) =>
                      setSystemSettings({ ...systemSettings, affiliation: e.target.value })
                    }
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ฝ่าย/งานที่รับผิดชอบระบบ
                  </label>
                  <input
                    type="text"
                    value={systemSettings.department_name}
                    onChange={(e) =>
                      setSystemSettings({ ...systemSettings, department_name: e.target.value })
                    }
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: ผู้ลงนามรายงาน */}
            <div>
              <div className="flex items-center space-x-2 pb-3 mb-4 border-b border-slate-200">
                <FileCheck className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  2. ข้อมูลผู้บริหารและผู้ลงนามในรายงานสรุป (Authorized Signatures for PDF Reports)
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ชื่อผู้อำนวยการสถานศึกษา
                  </label>
                  <input
                    type="text"
                    value={systemSettings.director_name}
                    onChange={(e) =>
                      setSystemSettings({ ...systemSettings, director_name: e.target.value })
                    }
                    placeholder="เช่น นายผู้อำนวยการ วิทยาลัย..."
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ชื่อหัวหน้างานวางแผนและงบประมาณ
                  </label>
                  <input
                    type="text"
                    value={systemSettings.planner_name}
                    onChange={(e) =>
                      setSystemSettings({ ...systemSettings, planner_name: e.target.value })
                    }
                    placeholder="เช่น นางสาวแผนงาน งบประมาณ"
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ชื่อเจ้าหน้าที่ผู้จัดสรรเริ่มต้น
                  </label>
                  <input
                    type="text"
                    value={systemSettings.default_operator}
                    onChange={(e) =>
                      setSystemSettings({ ...systemSettings, default_operator: e.target.value })
                    }
                    placeholder="เช่น เจ้าหน้าที่แผนงาน"
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: อัตราค่าจัดสรรตั้งต้น */}
            <div>
              <div className="flex items-center space-x-2 pb-3 mb-4 border-b border-slate-200">
                <Calculator className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  3. อัตราค่าจัดสรรมาตรฐานและพารามิเตอร์การคำนวณ (Default Allocation Rates)
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    อัตราต่อหัว ปวช. (บาท/คน) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={systemSettings.default_rate_voc}
                    onChange={(e) =>
                      setSystemSettings({ ...systemSettings, default_rate_voc: e.target.value })
                    }
                    required
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold text-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    อัตราต่อหัว ปวส. (บาท/คน) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={systemSettings.default_rate_high_voc}
                    onChange={(e) =>
                      setSystemSettings({ ...systemSettings, default_rate_high_voc: e.target.value })
                    }
                    required
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold text-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    อัตรา ปวช.เรือนจำ (บาท/คน) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={systemSettings.default_rate_prison}
                    onChange={(e) =>
                      setSystemSettings({ ...systemSettings, default_rate_prison: e.target.value })
                    }
                    required
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold text-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ชม.ฝึกปฏิบัติตั้งต้น (ชม.)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={systemSettings.default_practice_hours}
                    onChange={(e) =>
                      setSystemSettings({ ...systemSettings, default_practice_hours: e.target.value })
                    }
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none tabular-nums"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t border-slate-200 flex justify-end">
              <button
                type="submit"
                disabled={settingsSaving}
                className="px-6 py-2.5 rounded-xl text-white font-bold text-xs bg-blue-600 hover:bg-blue-700 shadow-sm flex items-center space-x-2 transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{settingsSaving ? 'กำลังบันทึกการตั้งค่า...' : 'บันทึกการตั้งค่าระบบ'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= TAB 2: ACADEMIC TERMS ================= */}
      {activeTab === 'terms' && (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
          {/* Controls Bar */}
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาปีการศึกษา หรือ ภาคเรียน..."
                value={termSearch}
                onChange={(e) => setTermSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => handleOpenTermModal()}
              className="inline-flex items-center justify-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มภาคเรียน / ปีการศึกษา</span>
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200">
                  <th className="py-3 px-4 w-14 text-center">#</th>
                  <th className="py-3 px-4">ปีการศึกษา</th>
                  <th className="py-3 px-4">ภาคเรียน</th>
                  <th className="py-3 px-4">สถานะงวดจัดสรร</th>
                  <th className="py-3 px-4 text-center">เทอมปัจจุบัน</th>
                  <th className="py-3 px-4 text-center">ข้อมูลการจัดสรร</th>
                  <th className="py-3 px-4 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTerms.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                      ไม่พบข้อมูลปีการศึกษาหรือภาคเรียน
                    </td>
                  </tr>
                ) : (
                  filteredTerms.map((term, index) => {
                    const isCur = term.is_current === 1;
                    return (
                      <tr
                        key={term.id}
                        className={`hover:bg-blue-50/30 transition-colors ${
                          isCur ? 'bg-blue-50/20 font-medium' : ''
                        }`}
                      >
                        <td className="py-3 px-4 text-center text-slate-400">{index + 1}</td>
                        <td className="py-3 px-4 font-bold text-slate-900 text-sm">
                          พ.ศ. {term.academic_year}
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-semibold">
                          ภาคเรียนที่ {term.semester} {term.semester === 3 ? '(ฤดูร้อน)' : ''}
                        </td>
                        <td className="py-3 px-4">
                          <div className="inline-flex items-center space-x-1">
                            <span
                              className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-bold border ${
                                term.status === 'OPEN'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : term.status === 'CLOSED'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {term.status === 'OPEN' ? (
                                <>
                                  <Unlock className="w-3 h-3 text-emerald-600" />
                                  <span>เปิดงวด (แก้ไขได้)</span>
                                </>
                              ) : term.status === 'CLOSED' ? (
                                <>
                                  <Lock className="w-3 h-3 text-rose-600" />
                                  <span>ปิดงวด (ล็อกข้อมูล)</span>
                                </>
                              ) : (
                                <>
                                  <Archive className="w-3 h-3 text-slate-500" />
                                  <span>เก็บถาวร</span>
                                </>
                              )}
                            </span>

                            {/* Quick status switch buttons */}
                            <div className="flex items-center ml-2 border border-slate-200 rounded-md overflow-hidden bg-white shadow-2xs">
                              <button
                                onClick={() => handleQuickStatusChange(term, 'OPEN')}
                                title="เปลี่ยนเป็นเปิดงวด"
                                className={`px-2 py-0.5 text-[10px] font-bold cursor-pointer ${
                                  term.status === 'OPEN'
                                    ? 'bg-emerald-600 text-white'
                                    : 'text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                OPEN
                              </button>
                              <button
                                onClick={() => handleQuickStatusChange(term, 'CLOSED')}
                                title="เปลี่ยนเป็นปิดงวด"
                                className={`px-2 py-0.5 text-[10px] font-bold border-l border-slate-200 cursor-pointer ${
                                  term.status === 'CLOSED'
                                    ? 'bg-rose-600 text-white'
                                    : 'text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                CLOSED
                              </button>
                              <button
                                onClick={() => handleQuickStatusChange(term, 'ARCHIVED')}
                                title="เปลี่ยนเป็นเก็บถาวร"
                                className={`px-2 py-0.5 text-[10px] font-bold border-l border-slate-200 cursor-pointer ${
                                  term.status === 'ARCHIVED'
                                    ? 'bg-slate-600 text-white'
                                    : 'text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                ARCHIVE
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isCur ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                              <Star className="w-3 h-3 fill-blue-600 text-blue-600" />
                              <span>เทอมปัจจุบัน</span>
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSetCurrentTerm(term)}
                              className="text-xs text-slate-500 hover:text-blue-600 font-medium hover:underline px-2 py-1 rounded hover:bg-blue-50 transition-colors cursor-pointer"
                            >
                              ตั้งเป็นปัจจุบัน
                            </button>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                              (term.allocation_count || 0) > 0
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/60'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            {term.allocation_count || 0} รายการ
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center space-x-1.5">
                            <button
                              onClick={() => handleOpenTermModal(term)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                              title="แก้ไขข้อมูล"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteTerm(term)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                (term.allocation_count || 0) > 0
                                  ? 'text-slate-300 cursor-not-allowed'
                                  : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                              }`}
                              title={
                                (term.allocation_count || 0) > 0
                                  ? 'มีรายการจัดสรรอยู่ ไม่สามารถลบได้'
                                  : 'ลบภาคเรียนนี้'
                              }
                              disabled={(term.allocation_count || 0) > 0}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 3: DEPARTMENTS ================= */}
      {activeTab === 'departments' && (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
          {/* Controls Bar */}
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหารหัส หรือ ชื่อแผนกวิชา..."
                value={deptSearch}
                onChange={(e) => setDeptSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => handleOpenDeptModal()}
              className="inline-flex items-center justify-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มแผนกวิชา</span>
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200">
                  <th className="py-3 px-4 w-14 text-center">#</th>
                  <th className="py-3 px-4 w-28">รหัสแผนก</th>
                  <th className="py-3 px-4">ชื่อแผนกวิชา</th>
                  <th className="py-3 px-4 text-center">ประเภทแผนก</th>
                  <th className="py-3 px-4 text-center">จำนวนกลุ่มเรียน</th>
                  <th className="py-3 px-4 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDepartments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                      ไม่พบข้อมูลแผนกวิชา
                    </td>
                  </tr>
                ) : (
                  filteredDepartments.map((dept, index) => (
                    <tr key={dept.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 text-center text-slate-400">{index + 1}</td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">{dept.code}</td>
                      <td className="py-3 px-4 font-medium text-slate-900">{dept.name}</td>
                      <td className="py-3 px-4 text-center">
                        {dept.is_service_department === 1 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            แผนกวิชาบริการ (สามัญ)
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            แผนกวิชาชีพ
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">
                          {dept.group_count || 0} กลุ่ม
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center space-x-1.5">
                          <button
                            onClick={() => handleOpenDeptModal(dept)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="แก้ไข"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteDepartment(dept)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              (dept.group_count || 0) > 0
                                ? 'text-slate-300 cursor-not-allowed'
                                : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                            }`}
                            title={
                              (dept.group_count || 0) > 0
                                ? 'มีกลุ่มเรียนผูกอยู่ ไม่สามารถลบได้'
                                : 'ลบแผนกวิชา'
                            }
                            disabled={(dept.group_count || 0) > 0}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 4: CLASS GROUPS ================= */}
      {activeTab === 'groups' && (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
          {/* Controls Bar */}
          <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 max-w-xl">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อกลุ่มเรียน หรือ แผนก..."
                  value={groupSearch}
                  onChange={(e) => setGroupSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Filter by Department */}
              <select
                value={selectedDeptFilter}
                onChange={(e) => setSelectedDeptFilter(e.target.value)}
                className="text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="all">ทุกแผนกวิชา ({departments.length})</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code} - {d.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => handleOpenGroupModal()}
              className="inline-flex items-center justify-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มกลุ่มเรียน</span>
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200">
                  <th className="py-3 px-4 w-14 text-center">#</th>
                  <th className="py-3 px-4">ชื่อกลุ่มเรียน</th>
                  <th className="py-3 px-4">แผนกวิชาสังกัด</th>
                  <th className="py-3 px-4 text-center">ระดับการศึกษา</th>
                  <th className="py-3 px-4 text-center">ประวัติการจัดสรร</th>
                  <th className="py-3 px-4 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredGroups.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                      ไม่พบข้อมูลกลุ่มเรียน
                    </td>
                  </tr>
                ) : (
                  filteredGroups.map((group, index) => (
                    <tr key={group.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 text-center text-slate-400">{index + 1}</td>
                      <td className="py-3 px-4 font-bold text-slate-800 text-sm">{group.group_name}</td>
                      <td className="py-3 px-4 text-slate-600">{group.department_name}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {group.education_level_name} ({group.education_level_code})
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">
                          {group.allocation_count || 0} ครั้ง
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center space-x-1.5">
                          <button
                            onClick={() => handleOpenGroupModal(group)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="แก้ไข"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteGroup(group)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              (group.allocation_count || 0) > 0
                                ? 'text-slate-300 cursor-not-allowed'
                                : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                            }`}
                            title={
                              (group.allocation_count || 0) > 0
                                ? 'มีการจัดสรรงบประมาณแล้ว ไม่สามารถลบได้'
                                : 'ลบกลุ่มเรียน'
                            }
                            disabled={(group.allocation_count || 0) > 0}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 5: DATABASE CONFIGURATION & TOOLS ================= */}
      {activeTab === 'tools' && (
        <div className="space-y-6 animate-fade-in">
          {/* Top Diagnostic Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white rounded-3xl p-6 sm:p-7 shadow-lg border border-slate-800 relative overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <Database className="w-4 h-4" />
                  </span>
                  <span className="text-xs font-bold text-emerald-400 tracking-wider uppercase">
                    Database Engine: {dbHealth?.engine || 'MariaDB 11.4 InnoDB'}
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  การตั้งค่าและการเชื่อมต่อฐานข้อมูล (Database Configuration)
                </h3>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  ระบบจัดสรรงบประมาณทำงานบนฐานข้อมูล MariaDB 11.4 ที่รองรับ ACID Transactions, JSON Datatypes และการคำนวณแบบ Generated Stored Columns
                </p>
              </div>

              {/* Ping Test Button & Result */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                {pingResult && (
                  <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
                    {pingResult}
                  </span>
                )}
                <button
                  type="button"
                  onClick={handlePingDb}
                  disabled={pingLoading}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-500/30 transition-all flex items-center space-x-2 cursor-pointer"
                >
                  <Activity className={`w-4 h-4 ${pingLoading ? 'animate-spin' : ''}`} />
                  <span>{pingLoading ? 'กำลังทดสอบ Ping...' : 'ทดสอบการเชื่อมต่อ (Ping Test)'}</span>
                </button>
              </div>
            </div>

            {/* Connection Credentials Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800 text-xs">
              <div className="bg-white/5 backdrop-blur-xs p-3.5 rounded-xl border border-white/10">
                <span className="text-slate-400 text-[11px]">Database Host (ภายใน / ภายนอก)</span>
                <p className="font-mono font-bold text-white mt-0.5">
                  {dbHealth?.host || 'db'} / 127.0.0.1
                </p>
                <span className="text-[10px] text-slate-400">Docker Network / Host</span>
              </div>

              <div className="bg-white/5 backdrop-blur-xs p-3.5 rounded-xl border border-white/10">
                <span className="text-slate-400 text-[11px]">Database Port (Host Port)</span>
                <p className="font-mono font-bold text-blue-300 mt-0.5">
                  3307 <span className="text-slate-400 font-normal text-[10px]">(Internal 3306)</span>
                </p>
                <span className="text-[10px] text-slate-400">พอร์ตสำหรับเชื่อมต่อภายนอก</span>
              </div>

              <div className="bg-white/5 backdrop-blur-xs p-3.5 rounded-xl border border-white/10">
                <span className="text-slate-400 text-[11px]">Database Name</span>
                <p className="font-mono font-bold text-indigo-300 mt-0.5">
                  {dbHealth?.database || 'training_budget_db'}
                </p>
                <span className="text-[10px] text-slate-400">Default Catalog</span>
              </div>

              <div className="bg-white/5 backdrop-blur-xs p-3.5 rounded-xl border border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[11px]">Username & Password</span>
                  <button
                    type="button"
                    onClick={() => setShowDbPassword(!showDbPassword)}
                    className="text-slate-400 hover:text-white"
                  >
                    {showDbPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="font-mono font-bold text-emerald-300 mt-0.5">
                  root : {showDbPassword ? 'cvcmedia2022' : '•••••••••••'}
                </p>
                <span className="text-[10px] text-slate-400">รหัสผ่านฐานข้อมูลเริ่มต้น</span>
              </div>
            </div>
          </div>

          {/* Table Breakdown / Storage Explorer */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center space-x-2">
                <Database className="w-4 h-4 text-blue-600" />
                <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                  โครงสร้างตารางข้อมูลในระบบ (Database Tables & Storage Metrics)
                </h4>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                ทั้งหมด {dbHealth?.tables?.length || 8} ตาราง
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200">
                    <th className="py-2.5 px-4 w-12 text-center">#</th>
                    <th className="py-2.5 px-4">ชื่อตาราง (Table Name)</th>
                    <th className="py-2.5 px-4">ประเภท Engine</th>
                    <th className="py-2.5 px-4">Collation</th>
                    <th className="py-2.5 px-4 text-center">จำนวนแถว (Rows)</th>
                    <th className="py-2.5 px-4 text-right">ขนาดข้อมูล (KB)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dbHealth?.tables && dbHealth.tables.length > 0 ? (
                    dbHealth.tables.map((tbl, idx) => (
                      <tr key={tbl.name} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-4 text-center text-slate-400">{idx + 1}</td>
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-800">
                          {tbl.name}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600 font-medium">
                          {tbl.engine || 'InnoDB'}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500">
                          {tbl.collation || 'utf8mb4_unicode_ci'}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-blue-50 text-blue-700">
                            {tbl.rows_count} แถว
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-slate-700">
                          {tbl.size_kb} KB
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400">
                        กำลังโหลดข้อมูลตาราง...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Cards for Database Administration */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 1. Export SQL Dump */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <FileCode className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                  ส่งออก SQL Dump (.sql)
                </h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  ดาวน์โหลดไฟล์สคริปต์ SQL (DDL + ข้อมูล INSERT) มาตรฐานสำหรับนำไป Restore บน phpMyAdmin, DBeaver หรือ MySQL Server
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportSql}
                className="w-full py-2 px-3 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ดาวน์โหลด SQL Dump</span>
              </button>
            </div>

            {/* 2. Export JSON Backup */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Download className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                  สำรองข้อมูล JSON (.json)
                </h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  ดาวน์โหลด Snapshot ข้อมูลทั้งหมดของระบบในรูปแบบ JSON สำหรับนำไปวิเคราะห์หรือสำรองไว้
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportBackup}
                className="w-full py-2 px-3 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ดาวน์โหลด JSON Backup</span>
              </button>
            </div>

            {/* 3. Reset Demo Data */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                  โหลดข้อมูลตัวอย่างระบบ
                </h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  รีเซ็ตข้อมูลตัวอย่างมาตรฐาน (ปีการศึกษา 1/2568, แผนกวิชา, กลุ่มเรียน และรายการจัดสรรตัวอย่าง) เพื่อทดสอบ
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetDemoData}
                className="w-full py-2 px-3 rounded-xl text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>โหลดข้อมูลตัวอย่าง</span>
              </button>
            </div>

            {/* 4. Clear Allocations */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Trash2 className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                  ล้างรายการจัดสรร
                </h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  ล้างเฉพาะข้อมูลตัวเลขการจัดสรรทั้งหมดเพื่อเริ่มรอบปีงบใหม่ โดยแผนกและกลุ่มเรียนยังคงอยู่สมบูรณ์
                </p>
              </div>
              <button
                type="button"
                onClick={handleClearAllocations}
                className="w-full py-2 px-3 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ล้างรายการจัดสรร</span>
              </button>
            </div>
          </div>

          {/* External Connection Guide Card */}
          <div className="bg-slate-900 text-slate-200 rounded-2xl p-5 border border-slate-800 space-y-3">
            <div className="flex items-center space-x-2 text-white">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs sm:text-sm font-bold">
                คำแนะนำการเชื่อมต่อฐานข้อมูลจากภายนอก (DBeaver / Navicat / CLI)
              </h4>
            </div>
            <p className="text-xs text-slate-400">
              ฐานข้อมูล MariaDB ใน Docker ถูกผูกพอร์ตออกสู่เครื่องโฮสต์ที่พอร์ต <strong>3307</strong> (เพื่อไม่ให้ชนกับ MySQL ภายนอกพอร์ต 3306) สามารถเชื่อมต่อได้ตามค่าพารามิเตอร์ดังนี้:
            </p>

            <div className="bg-black/50 rounded-xl p-3 font-mono text-[11px] text-emerald-400 overflow-x-auto space-y-1 border border-slate-800">
              <p># 1. เชื่อมต่อผ่าน MySQL / MariaDB Client CLI บนเครื่องโฮสต์:</p>
              <p className="text-slate-300">mariadb -h 127.0.0.1 -P 3307 -u root -pcvcmedia2022 training_budget_db</p>
              <p className="pt-2"># 2. เชื่อมต่อเข้าผ่าน Docker Container CLI โดยตรง:</p>
              <p className="text-slate-300">docker exec -it training_budget_db mariadb -u root -pcvcmedia2022 training_budget_db</p>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: ACADEMIC TERM ================= */}
      {isTermModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="px-6 py-4 bg-gradient-to-r from-blue-700 to-indigo-700 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5" />
                <h3 className="font-bold text-sm sm:text-base">
                  {editingTerm ? 'แก้ไขภาคเรียน / ปีการศึกษา' : 'เพิ่มภาคเรียน / ปีการศึกษาใหม่'}
                </h3>
              </div>
              <button
                onClick={() => setIsTermModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTerm} className="p-6 space-y-4">
              {termError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{termError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ปีการศึกษา (พ.ศ.) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={termYear}
                    onChange={(e) => setTermYear(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="เช่น 2568"
                    min={2500}
                    max={2700}
                    required
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ภาคเรียนที่ <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={termSemester}
                    onChange={(e) => setTermSemester(Number(e.target.value))}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                  >
                    <option value={1}>ภาคเรียนที่ 1</option>
                    <option value={2}>ภาคเรียนที่ 2</option>
                    <option value={3}>ภาคเรียนที่ 3 (ฤดูร้อน)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  สถานะงวดจัดสรร
                </label>
                <select
                  value={termStatus}
                  onChange={(e) => setTermStatus(e.target.value as any)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                >
                  <option value="OPEN">OPEN - เปิดงวด (บันทึก/แก้ไขข้อมูลได้)</option>
                  <option value="CLOSED">CLOSED - ปิดงวด (ล็อกข้อมูล ดูได้อย่างเดียว)</option>
                  <option value="ARCHIVED">ARCHIVED - จัดเก็บถาวร</option>
                </select>
              </div>

              <div className="pt-2">
                <label className="flex items-center space-x-2 cursor-pointer p-3 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={termIsCurrent}
                    onChange={(e) => setTermIsCurrent(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800">ตั้งเป็นภาคเรียนปัจจุบัน (Active Current Term)</span>
                    <p className="text-[11px] text-slate-500">
                      เมื่อเลือก ระบบจะตั้งงวดนี้เป็นค่าเริ่มต้นสำหรับผู้ใช้งานทุกคน
                    </p>
                  </div>
                </label>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsTermModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={termSubmitting}
                  className="px-5 py-2 text-xs font-bold rounded-lg text-white bg-blue-600 hover:bg-blue-700 flex items-center space-x-1.5 shadow-xs shadow-blue-500/20 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{termSubmitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: DEPARTMENT ================= */}
      {isDeptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="px-6 py-4 bg-gradient-to-r from-blue-700 to-indigo-700 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Building2 className="w-5 h-5" />
                <h3 className="font-bold text-sm sm:text-base">
                  {editingDept ? 'แก้ไขข้อมูลแผนกวิชา' : 'เพิ่มแผนกวิชาใหม่'}
                </h3>
              </div>
              <button
                onClick={() => setIsDeptModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDepartment} className="p-6 space-y-4">
              {deptError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{deptError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  รหัสแผนกวิชา <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={deptCode}
                  onChange={(e) => setDeptCode(e.target.value)}
                  placeholder="เช่น IT, AUTO, ELEC, COMMERCE"
                  required
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อแผนกวิชา <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  placeholder="เช่น แผนกวิชาเทคโนโลยีสารสนเทศ"
                  required
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center space-x-2 cursor-pointer p-3 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={deptIsService}
                    onChange={(e) => setDeptIsService(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800">เป็นแผนกวิชาบริการ (สามัญสัมพันธ์)</span>
                    <p className="text-[11px] text-slate-500">
                      แผนกบริการจะไม่มีกลุ่มเรียนเป็นของตนเอง แต่เป็นผู้รับโอนจัดสรรค่าชั่วโมงจากแผนกอื่น
                    </p>
                  </div>
                </label>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsDeptModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={deptSubmitting}
                  className="px-5 py-2 text-xs font-bold rounded-lg text-white bg-blue-600 hover:bg-blue-700 flex items-center space-x-1.5 shadow-xs shadow-blue-500/20 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{deptSubmitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: CLASS GROUP ================= */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="px-6 py-4 bg-gradient-to-r from-blue-700 to-indigo-700 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <h3 className="font-bold text-sm sm:text-base">
                  {editingGroup ? 'แก้ไขข้อมูลกลุ่มเรียน' : 'เพิ่มกลุ่มเรียนใหม่'}
                </h3>
              </div>
              <button
                onClick={() => setIsGroupModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGroup} className="p-6 space-y-4">
              {groupError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{groupError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อกลุ่มเรียน <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="เช่น 662020401 (ปวช.1 เทคโนโลยีสารสนเทศ)"
                  required
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  แผนกวิชาสังกัด <span className="text-red-500">*</span>
                </label>
                <select
                  value={groupDeptId}
                  onChange={(e) => setGroupDeptId(Number(e.target.value))}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.code} - {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ระดับการศึกษา <span className="text-red-500">*</span>
                </label>
                <select
                  value={groupLevelId}
                  onChange={(e) => setGroupLevelId(Number(e.target.value))}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                >
                  {educationLevels.map((lvl) => (
                    <option key={lvl.id} value={lvl.id}>
                      {lvl.name} ({lvl.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsGroupModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={groupSubmitting}
                  className="px-5 py-2 text-xs font-bold rounded-lg text-white bg-blue-600 hover:bg-blue-700 flex items-center space-x-1.5 shadow-xs shadow-blue-500/20 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{groupSubmitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
