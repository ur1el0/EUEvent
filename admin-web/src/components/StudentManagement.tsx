import { AlertCircle, GraduationCap, Users } from 'lucide-react';
import { useStudents } from '../hooks/useStudents';
import { DeleteStudentDialog } from './students/DeleteStudentDialog';
import { StudentCreateForm } from './students/StudentCreateForm';
import { StudentDirectory } from './students/StudentDirectory';

interface StudentManagementProps {
  token: string;
}

export function StudentManagement({ token }: StudentManagementProps) {
  const directory = useStudents(token);

  return (
    <section className="student-management-view" aria-labelledby="students-page-title">
      <header className="dashboard-header staff-page-header">
        <div>
          <p className="eyebrow">STUDENT ACCESS</p>
          <h1 id="students-page-title">Student accounts</h1>
          <p className="dashboard-subtitle">Create student sign-ins before issuing their event tickets.</p>
        </div>
        <div className="staff-total-pill"><Users size={16} /><span>{directory.meta?.total ?? '—'} accounts</span></div>
      </header>

      {directory.error && <div className="notice notice--error" role="alert"><AlertCircle size={18} /><span>{directory.error}</span></div>}
      {directory.notice && <div className="notice notice--success" role="status"><GraduationCap size={18} /><span>{directory.notice}</span></div>}

      <div className="students-layout">
        <StudentCreateForm isSaving={directory.isSaving} onCreate={directory.create} />
        <StudentDirectory directory={directory} onDelete={directory.requestDelete} />
      </div>

      <DeleteStudentDialog student={directory.deleteTarget} busy={directory.isDeleting} error={directory.deleteError}
        onConfirm={directory.confirmDelete} onCancel={directory.cancelDelete} />
    </section>
  );
}
