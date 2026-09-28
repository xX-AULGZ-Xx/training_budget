import Swal from 'sweetalert2';

// Custom SweetAlert2 Mixin for Toast notifications
export const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  customClass: {
    popup: 'font-[\'Sarabun\',sans-serif] text-xs shadow-xl rounded-2xl border border-slate-100'
  },
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer;
    toast.onmouseleave = Swal.resumeTimer;
  }
});

// Fast Toast Helpers
export const showSuccessToast = (title: string) => {
  return Toast.fire({
    icon: 'success',
    title
  });
};

export const showErrorToast = (title: string) => {
  return Toast.fire({
    icon: 'error',
    title
  });
};

export const showInfoToast = (title: string) => {
  return Toast.fire({
    icon: 'info',
    title
  });
};

// Modal Alert Helpers
export const showSuccessAlert = (title: string, text?: string) => {
  return Swal.fire({
    icon: 'success',
    title,
    text,
    confirmButtonText: 'ตกลง',
    confirmButtonColor: '#2563eb',
    customClass: {
      popup: 'font-[\'Sarabun\',sans-serif] rounded-3xl p-6 shadow-2xl',
      title: 'text-lg font-bold text-slate-900',
      confirmButton: 'px-6 py-2.5 rounded-xl font-bold text-sm shadow-md'
    }
  });
};

export const showErrorAlert = (title: string, text?: string) => {
  return Swal.fire({
    icon: 'error',
    title,
    text,
    confirmButtonText: 'รับทราบ',
    confirmButtonColor: '#ef4444',
    customClass: {
      popup: 'font-[\'Sarabun\',sans-serif] rounded-3xl p-6 shadow-2xl',
      title: 'text-lg font-bold text-slate-900',
      confirmButton: 'px-6 py-2.5 rounded-xl font-bold text-sm shadow-md'
    }
  });
};

export const showWarningAlert = (title: string, text?: string) => {
  return Swal.fire({
    icon: 'warning',
    title,
    text,
    confirmButtonText: 'ตกลง',
    confirmButtonColor: '#f59e0b',
    customClass: {
      popup: 'font-[\'Sarabun\',sans-serif] rounded-3xl p-6 shadow-2xl',
      title: 'text-lg font-bold text-slate-900',
      confirmButton: 'px-6 py-2.5 rounded-xl font-bold text-sm shadow-md'
    }
  });
};

// Standard Confirmation Dialog
export const showConfirmDialog = async (
  title: string,
  text?: string,
  confirmButtonText: string = 'ยืนยัน',
  cancelButtonText: string = 'ยกเลิก'
): Promise<boolean> => {
  const result = await Swal.fire({
    title,
    text,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#2563eb',
    cancelButtonColor: '#64748b',
    confirmButtonText,
    cancelButtonText,
    reverseButtons: true,
    customClass: {
      popup: 'font-[\'Sarabun\',sans-serif] rounded-3xl p-6 shadow-2xl',
      title: 'text-lg font-bold text-slate-900',
      confirmButton: 'px-5 py-2.5 rounded-xl font-bold text-sm shadow-md cursor-pointer',
      cancelButton: 'px-5 py-2.5 rounded-xl font-semibold text-sm cursor-pointer'
    }
  });
  return result.isConfirmed;
};

// Dangerous Action Confirmation Dialog (Red Confirm Button)
export const showDangerConfirmDialog = async (
  title: string,
  text?: string,
  confirmButtonText: string = 'ใช่, ต้องการลบ',
  cancelButtonText: string = 'ยกเลิก'
): Promise<boolean> => {
  const result = await Swal.fire({
    title,
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#64748b',
    confirmButtonText,
    cancelButtonText,
    reverseButtons: true,
    customClass: {
      popup: 'font-[\'Sarabun\',sans-serif] rounded-3xl p-6 shadow-2xl',
      title: 'text-lg font-bold text-slate-900',
      confirmButton: 'px-5 py-2.5 rounded-xl font-bold text-sm bg-rose-600 hover:bg-rose-700 shadow-md cursor-pointer',
      cancelButton: 'px-5 py-2.5 rounded-xl font-semibold text-sm cursor-pointer'
    }
  });
  return result.isConfirmed;
};

// Loading Modal
export const showLoadingAlert = (title: string = 'กำลังประมวลผล...', text?: string) => {
  Swal.fire({
    title,
    text,
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    },
    customClass: {
      popup: 'font-[\'Sarabun\',sans-serif] rounded-3xl p-6 shadow-2xl',
      title: 'text-base font-bold text-slate-800'
    }
  });
};

export const closeAlert = () => {
  Swal.close();
};

export default Swal;
