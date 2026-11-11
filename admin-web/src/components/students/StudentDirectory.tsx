import { GraduationCap, Loader2, Search, Trash2 } from 'lucide-react';
import type { useStudents } from '../../hooks/useStudents';
import type { StudentAccount } from '../../types/accounts';

interface StudentDirectoryProps {
  directory: ReturnType<typeof useStudents>;
  onDelete: (student: StudentAccount) => void;
}

export function StudentDirectory({ directory, onDelete }: StudentDirectoryProps) {
  const { students, meta, page, setPage, activeSearch } = directory;

  return (
    <section className="surface-card panel student-directory-panel" aria-labelledby="student-directory-title">
      <div className="panel-heading">
        <div><span className="eyebrow">Ticket eligibility</span><h2 id="student-directory-title">Registered students</h2></div>
        <span className="count-pill count-pill--amber">{meta?.total ?? 0} total</span>
      </div>

      <form className="student-search" onSubmit={directory.search}>
        <label className="visually-hidden" htmlFor="student-search-input">Search students</label>
        <Search size={16} aria-hidden="true" />
        <input id="student-search-input" value={directory.searchInput} maxLength={120} placeholder="Search name, email, or student number"
          onChange={(event) => directory.setSearchInput(event.target.value)} />
        <button type="submit">Search</button>
      </form>

      {directory.isLoading ? (
        <div className="staff-loading" role="status"><Loader2 size={20} className="spin" /> Loading student accounts…</div>
      ) : students.length > 0 ? (
        <>
          <ul className="students-list">
            {students.map((student) => (
              <li className="students-list-item" key={student.id}>
                <span className="staff-avatar">{student.name.trim().slice(0, 1).toUpperCase()}</span>
                <span className="staff-person-copy"><strong>{student.name}</strong><span>{student.email}</span></span>
                <span className="student-number-badge">{student.student_number}</span>
                <button className="btn btn--compact btn--text-danger" type="button" onClick={() => onDelete(student)}
                  aria-label={`Delete ${student.name}`}>
                  <Trash2 size={14} /> Delete
                </button>
              </li>
            ))}
          </ul>
          {meta && meta.last_page > 1 ? (
            <div className="student-pagination">
              <span>Page {meta.current_page} of {meta.last_page}</span>
              <div>
                <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1}>Previous</button>
                <button type="button" onClick={() => setPage((current) => Math.min(meta.last_page, current + 1))} disabled={page >= meta.last_page}>Next</button>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <div className="staff-empty-state">
          <span className="staff-empty-icon"><GraduationCap size={21} /></span>
          <strong>{activeSearch ? 'No matching students' : 'No student accounts yet'}</strong>
          <p>{activeSearch ? 'Try a different name, email, or student number.' : 'Create an account before issuing the student’s event ticket.'}</p>
        </div>
      )}
    </section>
  );
}
