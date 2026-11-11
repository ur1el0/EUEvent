import { useEffect, useState } from 'react';
import {
  createSecurityStaff, deleteSecurityStaff, fetchSecurityStaff, setSecurityStaffActive,
} from '../services/accountService';
import { errorMessage } from '../services/errorMessage';
import type { SecurityStaff } from '../types';
import { useFlashMessages } from './useFlashMessages';

export interface NewStaffValues {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

/** Security staff list, create, activate/deactivate and (planned) soft delete. */
export function useSecurityStaff(token: string) {
  const flash = useFlashMessages();
  const [staff, setStaff] = useState<SecurityStaff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SecurityStaff | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;

    fetchSecurityStaff(token)
      .then((list) => { if (isCurrent) setStaff(list); })
      .catch((cause: unknown) => { if (isCurrent) flash.setError(errorMessage(cause, 'Could not load security staff.')); })
      .finally(() => { if (isCurrent) setIsLoading(false); });

    return () => { isCurrent = false; };
  }, [token]);

  async function create(values: NewStaffValues): Promise<boolean> {
    flash.clear();
    if (values.password !== values.password_confirmation) {
      flash.setError('The passwords do not match.');
      return false;
    }

    setIsSaving(true);
    try {
      const created = await createSecurityStaff(token, { ...values, name: values.name.trim(), email: values.email.trim().toLowerCase() });
      setStaff((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
      flash.setNotice('Staff account created. Share the initial password with the staff member through your approved channel.');
      return true;
    } catch (cause) {
      flash.setError(errorMessage(cause, 'Could not create the staff account.'));
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleActive(person: SecurityStaff): Promise<void> {
    const next = !person.is_active;
    const warning = next ? '' : '\n\nA disconnected scanner may keep using its cached gate manifest until it reconnects. Secure any lost phone and pause its gate until it can be reached.';
    if (!window.confirm(`Are you sure you want to ${next ? 'reactivate' : 'deactivate'} ${person.name}?${warning}`)) return;

    flash.clear();
    setUpdatingId(person.id);
    try {
      const updated = await setSecurityStaffActive(token, person.id, next);
      setStaff((current) => current.map((entry) => (entry.id === updated.id ? updated : entry)));
      flash.setNotice(next ? `${person.name} can sign in to the scanner again.` : `${person.name} is deactivated. Online access tokens were revoked.`);
    } catch (cause) {
      flash.setError(errorMessage(cause, `Could not ${next ? 'reactivate' : 'deactivate'} this staff account.`));
    } finally {
      setUpdatingId(null);
    }
  }

  async function confirmDelete(): Promise<void> {
    if (!deleteTarget) return;

    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteSecurityStaff(token, deleteTarget.id);
      setStaff((current) => current.filter((entry) => entry.id !== deleteTarget.id));
      flash.setNotice(`${deleteTarget.name} was deleted. The account is hidden and can no longer sign in; scan and assignment history is kept.`);
      setDeleteTarget(null);
    } catch (cause) {
      setDeleteError(errorMessage(cause, 'Could not delete this staff account.'));
    } finally {
      setIsDeleting(false);
    }
  }

  return {
    ...flash,
    staff,
    isLoading,
    isSaving,
    updatingId,
    create,
    toggleActive: (person: SecurityStaff) => void toggleActive(person),
    deleteTarget,
    isDeleting,
    deleteError,
    requestDelete: (person: SecurityStaff) => { flash.clear(); setDeleteError(null); setDeleteTarget(person); },
    cancelDelete: () => setDeleteTarget(null),
    confirmDelete: () => void confirmDelete(),
  };
}
