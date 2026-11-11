import { useEffect, useState, type FormEvent } from 'react';
import { deleteStudent, fetchStudents } from '../services/accountService';
import { errorMessage, isNotFoundError } from '../services/errorMessage';
import type { StudentAccount, StudentPageMeta } from '../types/accounts';
import { useFlashMessages } from './useFlashMessages';

const PAGE_SIZE = 25;

/** Student directory with search and paging, and soft delete. Students create their own accounts in the mobile app. */
export function useStudents(token: string) {
  const flash = useFlashMessages();
  const [students, setStudents] = useState<StudentAccount[]>([]);
  const [meta, setMeta] = useState<StudentPageMeta | null>(null);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<StudentAccount | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;
    setIsLoading(true);

    fetchStudents(token, page, PAGE_SIZE, activeSearch)
      .then((result) => {
        if (!isCurrent) return;
        setStudents(result.students);
        setMeta(result.meta);
        flash.setError(null);
      })
      .catch((cause: unknown) => { if (isCurrent) flash.setError(errorMessage(cause, 'Could not load student accounts.')); })
      .finally(() => { if (isCurrent) setIsLoading(false); });

    return () => { isCurrent = false; };
  }, [token, page, activeSearch, reloadKey]);

  function search(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setPage(1);
    setActiveSearch(searchInput.trim());
  }

  async function confirmDelete(): Promise<void> {
    if (!deleteTarget) return;

    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteStudent(token, deleteTarget.id);
      setStudents((current) => current.filter((student) => student.id !== deleteTarget.id));
      setMeta((current) => (current ? { ...current, total: Math.max(0, current.total - 1) } : current));
      flash.setNotice(`${deleteTarget.name} (${deleteTarget.student_number}) was deleted. The account is hidden and can no longer sign in; history is kept.`);
      setDeleteTarget(null);
    } catch (cause) {
      if (isNotFoundError(cause)) {
        // Someone else already removed it: close the dialog, say so, and reload the list.
        flash.setNotice(`${deleteTarget.name}'s account no longer exists. The list was refreshed.`);
        setDeleteTarget(null);
        setReloadKey((current) => current + 1);
      } else {
        setDeleteError(errorMessage(cause, 'Could not delete this student account.'));
      }
    } finally {
      setIsDeleting(false);
    }
  }

  return {
    ...flash,
    students,
    meta,
    page,
    setPage,
    searchInput,
    setSearchInput,
    activeSearch,
    search,
    isLoading,
    deleteTarget,
    isDeleting,
    deleteError,
    requestDelete: (student: StudentAccount) => { flash.clear(); setDeleteError(null); setDeleteTarget(student); },
    cancelDelete: () => setDeleteTarget(null),
    confirmDelete: () => void confirmDelete(),
  };
}
