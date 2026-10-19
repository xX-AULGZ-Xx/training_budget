import React, { useState, useRef, useEffect } from 'react';
import { AcademicTerm, SystemSettings, CalculationType, CALCULATION_TYPE_LABELS } from '../types';
import {
  School,
  Calendar,
  Lock,
  Unlock,
  FileText,
  History,
  RefreshCw,
  LayoutDashboard,
  Settings,
  Rocket,
  ChevronDown,
  Check
} from 'lucide-react';

interface HeaderProps {
  currentView: 'budget' | 'settings' | 'startup';
  onChangeView: (view: 'budget' | 'settings' | 'startup') => void;
  terms: AcademicTerm[];
  selectedTerm: AcademicTerm | null;
  onSelectTerm: (term: AcademicTerm) => void;
  onToggleTermStatus: () => void;
  onOpenAuditLogs: () => void;
  onDownloadPdf: () => void;
  onRefresh: () => void;
  loading: boolean;
  systemSettings?: SystemSettings | null;
  calculationType?: CalculationType | 'ALL';
}

const VIEW_OPTIONS = [
  {
    id: 'budget' as const,
    label: 'จัดสรรงบประมาณ',
    shortLabel: 'จัดสรรงบ',
    desc: 'คิดคำนวณและจัดสรรงบประมาณค่าวัสดุฝึก',
    icon: LayoutDashboard
  },
  {
    id: 'settings' as const,
    label: 'ตั้งค่าระบบ (Setup)',
    shortLabel: 'ตั้งค่าระบบ',
    desc: 'สถานศึกษา แผนก กลุ่มเรียน และฐานข้อมูล',
    icon: Settings
  },
  {
    id: 'startup' as const,
    label: 'Start Up Setting',
    shortLabel: 'Start Up',
    desc: 'ตัวช่วยติดตั้งและเริ่มต้นระบบครั้งแรก',
    icon: Rocket
  }
];

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onChangeView,
  terms,
  selectedTerm,
  onSelectTerm,
  onToggleTermStatus,
  onOpenAuditLogs,
  onDownloadPdf,
  onRefresh,
  loading,
  systemSettings,
  calculationType
}) => {
  const isReadOnly = selectedTerm?.status !== 'OPEN';
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ตรวจสอบว่าระบบเคยทำ Start Up Setting แล้วหรือยัง หากทำแล้วให้ซ่อน Start Up Setting
  const isStartupCompleted = Boolean(
    systemSettings?.startup_completed === '1' ||
    systemSettings?.startup_completed === 'true' ||
    (terms && terms.length > 0)
  );

  const visibleViewOptions = VIEW_OPTIONS.filter((opt) => {
    if (opt.id === 'startup') {
      return !isStartupCompleted;
    }
    return true;
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectView = (view: 'budget' | 'settings' | 'startup') => {
    onChangeView(view);
    setIsDropdownOpen(false);
  };

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40 shadow-xs">
      <div className="w-full px-3 sm:px-6 lg:px-8 py-2 sm:py-2.5 flex flex-col xl:flex-row xl:items-center justify-between gap-2.5 sm:gap-3">
        {/* Left: Organization & Title */}
        <div className="flex items-center space-x-2.5 sm:space-x-3 shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/15 shrink-0">
            <School className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1 sm:gap-2">
              <span 
                className="text-[9px] sm:text-[10px] font-bold tracking-wider uppercase px-1.5 sm:px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/50 shrink-0"
                title={`รหัสย่อ: ${systemSettings?.college_code || 'CRIC'}`}
              >
                {systemSettings?.college_code || 'CRIC'}
              </span>
              <span className="text-[10px] sm:text-[11px] text-slate-700 font-semibold truncate max-w-[170px] xs:max-w-[240px] sm:max-w-none">
                {systemSettings?.college_name || 'วิทยาลัยการอาชีพเชียงราย'}
              </span>
              <span className="text-[11px] text-slate-300 hidden md:inline">•</span>
              <span className="text-[10px] sm:text-[11px] text-slate-400 font-normal hidden md:inline">
                {systemSettings?.department_name || 'งานวางแผนและงบประมาณ'}
              </span>
            </div>
            <h1 className="text-sm sm:text-base lg:text-lg font-bold text-slate-900 leading-tight truncate sm:whitespace-normal">
              ระบบการคิดคำนวณและจัดสรรงบประมาณค่าวัสดุฝึก
            </h1>
          </div>
        </div>

        {/* Right: Calculation Type, Term Selector & Global Actions */}
        <div className="w-full xl:w-auto flex flex-wrap items-center justify-between sm:justify-end gap-1.5 sm:gap-2 shrink-0">

          {/* Term Selector */}
          <div className="flex-1 sm:flex-initial flex items-center bg-slate-50 rounded-lg p-0.5 border border-slate-200 min-w-0 max-w-full sm:max-w-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400 ml-1.5 sm:ml-2 mr-1 shrink-0" />
            <select
              value={selectedTerm?.id || ''}
              onChange={(e) => {
                const term = terms.find((t) => t.id === Number(e.target.value));
                if (term) onSelectTerm(term);
              }}
              className="w-full sm:w-auto bg-transparent text-[11px] sm:text-xs font-semibold text-slate-700 py-1 sm:py-1.5 pr-2 pl-0.5 focus:outline-none cursor-pointer truncate"
            >
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  ภาค {t.semester}/{t.academic_year} {t.is_current ? '(ปัจจุบัน)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Status Badge & Toggle */}
            {selectedTerm && (
              <button
                onClick={onToggleTermStatus}
                title="คลิกเพื่อสลับสถานะเปิด/ปิดงวด"
                className={`inline-flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all border shadow-2xs cursor-pointer ${
                  selectedTerm.status === 'OPEN'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                    : selectedTerm.status === 'CLOSED'
                    ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                    : 'bg-slate-100 text-slate-700 border-slate-300'
                }`}
              >
                {selectedTerm.status === 'OPEN' ? (
                  <>
                    <Unlock className="w-3 h-3 text-emerald-600" />
                    <span>เปิดงวด</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3 h-3 text-rose-600" />
                    <span>ปิดงวด</span>
                  </>
                )}
              </button>
            )}

            {/* Refresh Button */}
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-1 sm:p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            </button>

            {/* Audit Log Trigger */}
            <button
              onClick={onOpenAuditLogs}
              className="inline-flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
              title="ดูประวัติการแก้ไข"
            >
              <History className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">ประวัติ</span>
            </button>

            {/* PDF Report Trigger */}
            <button
              onClick={onDownloadPdf}
              className="inline-flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs shadow-blue-500/20 transition-all cursor-pointer whitespace-nowrap"
              title={`พิมพ์รายงาน PDF (${calculationType && calculationType !== 'ALL' ? CALCULATION_TYPE_LABELS[calculationType] : 'ทุกประเภทงบ'})`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>
                พิมพ์ PDF
                {calculationType && calculationType !== 'ALL'
                  ? ` (${CALCULATION_TYPE_LABELS[calculationType]})`
                  : ''}
              </span>
            </button>

            {/* View Switcher Dropdown (ปุ่มเฟือง: ตั้งค่า) */}
            <div className="relative shrink-0" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={`inline-flex items-center space-x-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all border shadow-2xs cursor-pointer ${
                  isDropdownOpen || currentView !== 'budget'
                    ? 'bg-blue-50 text-blue-700 border-blue-300 ring-2 ring-blue-100'
                    : 'bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-50 border-slate-200'
                }`}
                title="ตั้งค่าและเมนูระบบ"
              >
                <Settings className={`w-3.5 h-3.5 ${
                  isDropdownOpen || currentView !== 'budget' ? 'text-blue-600' : 'text-slate-600'
                }`} />
                <span>ตั้งค่า</span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-blue-600' : ''}`} />
              </button>

              {/* Floating Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-slate-200/90 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>เมนูและตั้งค่าระบบ</span>
                    <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                      {visibleViewOptions.length} เมนู
                    </span>
                  </div>
                  <div className="p-1 space-y-0.5">
                    {visibleViewOptions.map((opt) => {
                      const Icon = opt.icon;
                      const isSelected = currentView === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleSelectView(opt.id)}
                          className={`w-full flex items-start space-x-2.5 p-2 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-blue-50/90 text-blue-800 font-bold'
                              : 'text-slate-700 hover:bg-slate-50 font-medium'
                          }`}
                        >
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                            isSelected ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-500'
                          }`}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="truncate">{opt.label}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 ml-1" />}
                            </div>
                            <p className="text-[10px] text-slate-400 font-normal truncate mt-0.5">
                              {opt.desc}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {isReadOnly && (
        <div className="bg-amber-500/90 text-white text-[11px] px-4 py-1 text-center font-medium shadow-inner flex items-center justify-center space-x-2">
          <Lock className="w-3 h-3" />
          <span>ปีการศึกษานี้อยู่ในสถานะปิดงวด (Read-Only Mode) ข้อมูลถูกล็อกและไม่สามารถแก้ไขได้</span>
        </div>
      )}
    </header>
  );
};
