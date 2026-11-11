import { AlertCircle, ShieldCheck, Users } from 'lucide-react';
import { useSecurityStaff } from '../hooks/useSecurityStaff';
import { DeleteStaffDialog } from './staff/DeleteStaffDialog';
import { StaffCreateForm } from './staff/StaffCreateForm';
import { StaffDirectory } from './staff/StaffDirectory';

interface SecurityStaffManagementProps {
  token: string;
}

export function SecurityStaffManagement({ token }: SecurityStaffManagementProps) {
  const manager = useSecurityStaff(token);

  return (
    <section className="staff-view" aria-labelledby="staff-page-title">
      <header className="dashboard-header staff-page-header">
        <div>
          <p className="eyebrow">ACCESS MANAGEMENT</p>
          <h1 id="staff-page-title">Security staff</h1>
          <p className="dashboard-subtitle">Create accounts for staff who use the offline scanner app.</p>
        </div>
        <div className="staff-total-pill"><Users size={16} /><span>{manager.staff.length} accounts</span></div>
      </header>

      {manager.error && <div className="notice notice--error" role="alert"><AlertCircle size={18} /><span>{manager.error}</span></div>}
      {manager.notice && <div className="notice notice--success" role="status"><ShieldCheck size={18} /><span>{manager.notice}</span></div>}

      <div className="staff-grid">
        <StaffCreateForm isSaving={manager.isSaving} onCreate={manager.create} />
        <StaffDirectory staff={manager.staff} isLoading={manager.isLoading} updatingId={manager.updatingId}
          onToggle={manager.toggleActive} onDelete={manager.requestDelete} />
      </div>

      <DeleteStaffDialog person={manager.deleteTarget} busy={manager.isDeleting} error={manager.deleteError}
        onConfirm={manager.confirmDelete} onCancel={manager.cancelDelete} />
    </section>
  );
}
