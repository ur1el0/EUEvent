import { useEffect, useState, type FormEvent } from 'react';
import { createStudent, deleteStudent, fetchStudents } from '../services/accountService';
import { errorMessage } from '../services/errorMessage';
import type { StudentAccount, StudentPageMeta } from '../types/accounts';
import { useFlashMessages } from './useFlashMessages';

const PAGE_SIZE = 25;

export interface NewStudentValues {
  name: string;
  student_number: string;
  email: string;
  password: string;
  password_confirmation: string;
}

/** Student directory with search and paging, create, and (planned) soft delete. */
export function useStudents(token: string) {
  const flash = useFlashMessages();
  const [students, setStudents] = useState<StudentAccount[]>([]);
  const [meta, setMeta] = useState<StudentPageMeta | null>(null);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
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

  async function create(values: NewStudentValues): Promise<boolean> {
    flash.clear();
    if (values.password !== values.password_confirmation) {
      flash.setError('The passwords do not match.');
      return false;
    }

    setIsSaving(true);
    try {
      await createStudent(token, { ...values, name: values.name.trim(), student_number: values.student_number.trim(), email: values.email.trim().toLowerCase() });
      flash.setNotice('Student account created. Share its initial password through your approved private channel.');
      setSearchInput('');
      setActiveSearch('');
      setPage(1);
      setReloadKey((current) => current + 1);
      return true;
    } catch (cause) {
      flash.setError(errorMessage(cause, 'Could not create the student account.'));
      return false;
    } finally {
      setIsSaving(false);
    }
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
      setDeleteError(errorMessage(cause, 'Could not delete this student account.'));
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
    isSaving,
    create,
    deleteTarget,
    isDeleting,
    deleteError,
    requestDelete: (student: StudentAccount) => { flash.clear(); setDeleteError(null); setDeleteTarget(student); },
    cancelDelete: () => setDeleteTarget(null),
    confirmDelete: () => void confirmDelete(),
  };
}
