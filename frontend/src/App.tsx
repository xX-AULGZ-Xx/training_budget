import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { AllocationForm } from './components/AllocationForm';
import { SummaryDashboard } from './components/SummaryDashboard';
import { AuditLogModal } from './components/AuditLogModal';
import { EditAllocationModal } from './components/EditAllocationModal';
import { SettingsPage } from './components/SettingsPage';
import { StartupSettingPage } from './components/StartupSettingPage';
import {
  AcademicTerm,
  Department,
  ClassGroup,
  EducationLevel,
  Allocation,
  DepartmentSummary,
  LevelSummary,
  SummaryKPIs,
  AuditLog
} from './types';
import {
  showConfirmDialog,
  showDangerConfirmDialog,
  showSuccessToast,
  showErrorAlert
} from './utils/alerts';

export function App() {
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<AcademicTerm | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [departmentSummaries, setDepartmentSummaries] = useState<DepartmentSummary[]>([]);
  const [levelSummaries, setLevelSummaries] = useState<LevelSummary[]>([]);
  const [kpis, setKpis] = useState<SummaryKPIs>({
    total_groups: 0,
    total_students: 0,
    total_base_budget: 0,
    total_inter_shares: 0,
    net_budget: 0
  });

  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('all');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState<boolean>(false);
  const [editingAllocation, setEditingAllocation] = useState<Allocation | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState<'budget' | 'settings' | 'startup'>('budget');
  const [educationLevels, setEducationLevels] = useState<EducationLevel[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // 1. Initial Load: Fetch Terms & Departments & Groups & Education Levels
  const initData = async () => {
    try {
      setLoading(true);
      const [termsRes, deptsRes, groupsRes, levelsRes] = await Promise.all([
        fetch('/api/v1/terms').then((r) => r.json()),
        fetch('/api/v1/departments').then((r) => r.json()),
        fetch('/api/v1/groups').then((r) => r.json()),
        fetch('/api/v1/departments/levels').then((r) => r.json())
      ]);

      if (termsRes.success && termsRes.data.length > 0) {
        setTerms(termsRes.data);
        const currentTerm = termsRes.data.find((t: AcademicTerm) => t.is_current) || termsRes.data[0];
        setSelectedTerm(currentTerm);
      }

      if (deptsRes.success) {
        setDepartments(deptsRes.data);
      }

      if (groupsRes.success) {
        setClassGroups(groupsRes.data);
      }

      if (levelsRes.success) {
        setEducationLevels(levelsRes.data);
      }
    } catch (err) {
      console.error('Error fetching initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initData();
  }, []);

  // 2. Load Term-specific data: Allocations, Summary, Logs
  const loadTermData = useCallback(async () => {
    if (!selectedTerm) return;
    try {
      setLoading(true);
      const [allocRes, sumRes, logsRes] = await Promise.all([
        fetch(`/api/v1/allocations?term_id=${selectedTerm.id}&department_id=${selectedDepartmentId}`).then((r) =>
          r.json()
        ),
        fetch(`/api/v1/summary?term_id=${selectedTerm.id}&department_id=${selectedDepartmentId}`).then((r) =>
          r.json()
        ),
        fetch(`/api/v1/summary/logs?term_id=${selectedTerm.id}`).then((r) => r.json())
      ]);

      if (allocRes.success) {
        setAllocations(allocRes.data);
      }

      if (sumRes.success) {
        setDepartmentSummaries(sumRes.data.departments || []);
        setLevelSummaries(sumRes.data.levels || []);
        setKpis(sumRes.data.kpis);
      }

      if (logsRes.success) {
        setAuditLogs(logsRes.data);
      }
    } catch (err) {
      console.error('Error fetching term data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedTerm, selectedDepartmentId]);

  useEffect(() => {
    loadTermData();
  }, [loadTermData]);

  // Toggle Term Status (OPEN <-> CLOSED)
  const handleToggleTermStatus = async () => {
    if (!selectedTerm) return;
    const newStatus = selectedTerm.status === 'OPEN' ? 'CLOSED' : 'OPEN';
    const isClosing = newStatus === 'CLOSED';

    const confirmed = await showConfirmDialog(
      isClosing ? 'ยืนยันการปิดงวดปีการศึกษา?' : 'ยืนยันการเปิดงวดปีการศึกษา?',
      isClosing
        ? `คุณต้องการปิดงวดภาคเรียนที่ ${selectedTerm.semester}/${selectedTerm.academic_year} ใช่หรือไม่? (ระบบจะล็อกไม่ให้บันทึกหรือแก้ไขงบประมาณเพิ่มเติม)`
        : `คุณต้องการเปิดงวดภาคเรียนที่ ${selectedTerm.semester}/${selectedTerm.academic_year} อีกครั้งเพื่อแก้ไขรายการใช่หรือไม่?`,
      isClosing ? 'ยืนยันปิดงวด' : 'ยืนยันเปิดงวด',
      'ยกเลิก'
    );

    if (!confirmed) return;

    try {
      const res = await fetch(`/api/v1/terms/${selectedTerm.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        setSelectedTerm({ ...selectedTerm, status: newStatus });
        setTerms(terms.map((t) => (t.id === selectedTerm.id ? { ...t, status: newStatus } : t)));
        showSuccessToast(
          isClosing
            ? `ปิดงวดภาคเรียนที่ ${selectedTerm.semester}/${selectedTerm.academic_year} เรียบร้อยแล้ว`
            : `เปิดงวดภาคเรียนที่ ${selectedTerm.semester}/${selectedTerm.academic_year} สำเร็จ`
        );
      } else {
        showErrorAlert('เกิดข้อผิดพลาด', data.message);
      }
    } catch (err: any) {
      showErrorAlert('เกิดข้อผิดพลาด', err.message);
    }
  };

  // Delete Allocation
  const handleDeleteAllocation = async (id: number) => {
    const confirmed = await showDangerConfirmDialog(
      'คุณแน่ใจว่าต้องการลบรายการจัดสรรนี้?',
      'รายการจัดสรรงบประมาณและข้อมูลการโอนสอนช่วยทั้งหมดที่เกี่ยวข้องจะถูกลบออกจากระบบอย่างถาวร',
      'ใช่, ยืนยันการลบ',
      'ยกเลิก'
    );

    if (!confirmed) return;

    try {
      const res = await fetch(`/api/v1/allocations/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showSuccessToast('ลบรายการจัดสรรงบประมาณเรียบร้อยแล้ว');
        loadTermData();
      } else {
        showErrorAlert('ลบไม่สำเร็จ', data.message || 'เกิดข้อผิดพลาดในการลบรายการ');
      }
    } catch (err: any) {
      showErrorAlert('เกิดข้อผิดพลาด', err.message);
    }
  };

  // PDF Report Download
  const handleDownloadPdf = () => {
    if (!selectedTerm) return;
    const url = `/api/v1/reports/pdf?term_id=${selectedTerm.id}&department_id=${selectedDepartmentId}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100/70">
      {/* Top Header */}
      <Header
        currentView={currentView}
        onChangeView={setCurrentView}
        terms={terms}
        selectedTerm={selectedTerm}
        onSelectTerm={setSelectedTerm}
        onToggleTermStatus={handleToggleTermStatus}
        onOpenAuditLogs={() => setIsAuditModalOpen(true)}
        onDownloadPdf={handleDownloadPdf}
        onRefresh={loadTermData}
        loading={loading}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {currentView === 'startup' ? (
          <StartupSettingPage
            onComplete={() => {
              initData();
              loadTermData();
              setCurrentView('budget');
            }}
            onCancel={() => setCurrentView('budget')}
          />
        ) : currentView === 'settings' ? (
          <SettingsPage
            terms={terms}
            departments={departments}
            classGroups={classGroups}
            educationLevels={educationLevels}
            onOpenStartupWizard={() => setCurrentView('startup')}
            onRefreshData={() => {
              initData();
              loadTermData();
            }}
          />
        ) : (
          <div className="flex flex-col 2xl:flex-row gap-5 items-start">
            {/* Left Column: Input Form Panel */}
            <div className="w-full 2xl:w-[380px] shrink-0 sticky top-18">
              {selectedTerm && (
                <AllocationForm
                  termId={selectedTerm.id}
                  isReadOnly={selectedTerm.status !== 'OPEN'}
                  departments={departments}
                  classGroups={classGroups}
                  educationLevels={educationLevels}
                  allocations={allocations}
                  onSuccess={loadTermData}
                />
              )}
            </div>

            {/* Right Column: Summary Dashboard */}
            <div className="flex-1 min-w-0 w-full">
              <SummaryDashboard
                kpis={kpis}
                departments={departmentSummaries}
                levels={levelSummaries}
                allDepartments={departments}
                allocations={allocations}
                selectedDepartmentId={selectedDepartmentId}
                onSelectDepartmentId={setSelectedDepartmentId}
                onEditAllocation={(alloc) => {
                  setEditingAllocation(alloc);
                  setIsEditModalOpen(true);
                }}
                onDeleteAllocation={handleDeleteAllocation}
                isReadOnly={selectedTerm?.status !== 'OPEN'}
              />
            </div>
          </div>
        )}
      </main>

      {/* Edit Allocation Modal */}
      <EditAllocationModal
        isOpen={isEditModalOpen}
        allocation={editingAllocation}
        departments={departments}
        isReadOnly={selectedTerm?.status !== 'OPEN'}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingAllocation(null);
        }}
        onSuccess={loadTermData}
      />

      {/* Audit Log Modal */}
      <AuditLogModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        logs={auditLogs}
        termTitle={
          selectedTerm
            ? `ภาคเรียนที่ ${selectedTerm.semester}/${selectedTerm.academic_year}`
            : ''
        }
      />
    </div>
  );
}

export default App;
