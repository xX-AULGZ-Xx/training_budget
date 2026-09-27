export interface AcademicTerm {
  id: number;
  academic_year: number;
  semester: number;
  status: 'OPEN' | 'CLOSED' | 'ARCHIVED';
  is_current: number;
  allocation_count?: number;
}

export interface Department {
  id: number;
  code: string;
  name: string;
  is_service_department: number;
  group_count?: number;
}

export interface EducationLevel {
  id: number;
  code: string;
  name: string;
}

export interface ClassGroup {
  id: number;
  department_id: number;
  education_level_id: number;
  group_name: string;
  department_name: string;
  education_level_name: string;
  education_level_code: string;
  allocation_count?: number;
}

export interface ShareItem {
  target_department_id: number;
  share_amount: number;
  remark?: string;
  target_department_name?: string;
}

export interface Allocation {
  id: number;
  academic_term_id: number;
  class_group_id: number;
  student_count: number;
  total_practice_hours: number;
  rate_per_head: number;
  base_budget: number;
  created_by: string;
  created_at: string;
  group_name: string;
  department_id: number;
  department_name: string;
  department_code: string;
  education_level_name: string;
  shares: ShareItem[];
  total_shares: number;
  remaining_budget: number;
}

export interface DepartmentSummary {
  department_id: number;
  department_code: string;
  department_name: string;
  is_service_department: number;
  student_count: number;
  students_voc: number;
  students_high_voc: number;
  students_prison: number;
  base_budget: number;
  total_deducted: number;
  total_transferred: number;
  net_budget: number;
  net_voc: number;
  net_high_voc: number;
  net_prison: number;
}

export interface LevelSummary {
  id: number;
  code: string;
  name: string;
  student_count: number;
  base_budget: number;
}

export interface SummaryKPIs {
  total_groups: number;
  total_students: number;
  total_base_budget: number;
  total_inter_shares: number;
  net_budget: number;
}

export interface AuditLog {
  id: number;
  academic_term_id: number;
  allocation_id: number | null;
  action_type: 'CREATE' | 'UPDATE' | 'DELETE';
  snapshot_payload: any;
  executed_by: string;
  created_at: string;
}

export interface SystemSettings {
  college_name: string;
  college_code: string;
  affiliation: string;
  department_name: string;
  director_name: string;
  planner_name: string;
  default_operator: string;
  default_rate_voc: string;
  default_rate_high_voc: string;
  default_rate_prison: string;
  default_practice_hours: string;
  fiscal_year_start_month: string;
}

export interface SystemStatus {
  status: string;
  server_version?: string;
  terms_count: number;
  departments_count: number;
  groups_count: number;
  allocations_count: number;
}

export interface TableDetail {
  name: string;
  rows_count: number;
  size_kb: number;
  engine?: string;
  collation?: string;
  create_time?: string;
}

export interface DatabaseHealth {
  status: string;
  host: string;
  port: string;
  host_port: string;
  database: string;
  user: string;
  engine: string;
  server_version: string;
  latency_ms: number;
  tables: TableDetail[];
}

