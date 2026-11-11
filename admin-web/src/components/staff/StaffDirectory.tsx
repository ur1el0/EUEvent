import { Loader2, ShieldCheck, Trash2, Users } from 'lucide-react';
import type { SecurityStaff } from '../../types';

interface StaffDirectoryProps {
  staff: SecurityStaff[];
  isLoading: boolean;
  updatingId: number | null;
  onToggle: (person: SecurityStaff) => void;
  onDelete: (person: SecurityStaff) => void;
}

export function StaffDirectory({ staff, isLoading, updatingId, onToggle, onDelete }: StaffDirectoryProps) {
  return (
    <section className="surface-card panel staff-directory-panel" aria-labelledby="staff-directory-title">
      <div className="panel-heading">
        <div><span className="eyebrow">Scanner access</span><h2 id="staff-directory-title">Registered staff</h2></div>
        <span className="count-pill count-pill--amber">{staff.length} total</span>
      </div>

      {isLoading ? (
        <div className="staff-loading" role="status"><Loader2 size={20} className="spin" /> Loading staff accounts…</div>
      ) : staff.length > 0 ? (
        <ul className="staff-list">
          {staff.map((person) => (
            <li className="staff-list-item" key={person.id}>
              <span className="staff-avatar">{person.name.trim().slice(0, 1).toUpperCase()}</span>
              <span className="staff-person-copy"><strong>{person.name}</strong><span>{person.email}</span></span>
              <span className={person.is_active ? 'staff-role-badge' : 'staff-role-badge staff-role-badge--inactive'}>
                <ShieldCheck size={14} /> {person.is_active ? 'Active staff' : 'Inactive'}
              </span>
              <span className="staff-actions">
                <button className="staff-status-button" type="button" disabled={updatingId === person.id}
                  onClick={() => onToggle(person)} aria-label={`${person.is_active ? 'Deactivate' : 'Reactivate'} ${person.name}`}>
                  {updatingId === person.id ? 'Updating…' : person.is_active ? 'Deactivate' : 'Reactivate'}
                </button>
                <button className="btn btn--compact btn--text-danger" type="button" onClick={() => onDelete(person)}
                  aria-label={`Delete ${person.name}`}>
                  <Trash2 size={14} /> Delete
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="staff-empty-state">
          <span className="staff-empty-icon"><Users size={21} /></span>
          <strong>No staff accounts yet</strong>
          <p>Create a security-staff account to allow scanner sign-in.</p>
        </div>
      )}
    </section>
  );
}
