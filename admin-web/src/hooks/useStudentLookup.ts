import { useEffect, useState } from 'react';
import { fetchStudents } from '../services/accountService';
import type { StudentAccount } from '../types/accounts';

type LookupStatus = 'idle' | 'checking' | 'found' | 'not_found' | 'error';

interface LookupResult {
  query: string;
  status: 'found' | 'not_found' | 'error';
  student?: StudentAccount;
}

const MIN_LENGTH = 4;
const DEBOUNCE_MS = 400;

/**
 * Looks up the account registered under a student number while the administrator types it, so a number
 * registered under the wrong name or email can be spotted before a ticket is issued. It only reads;
 * the server still decides whether the ticket can be issued.
 */
export function useStudentLookup(token: string, studentNumber: string) {
  const query = studentNumber.trim().toUpperCase();
  const [result, setResult] = useState<LookupResult | null>(null);

  useEffect(() => {
    if (query.length < MIN_LENGTH) return undefined;

    let isCurrent = true;
    const timer = setTimeout(() => {
      fetchStudents(token, 1, 5, query)
        .then((page) => {
          if (!isCurrent) return;
          const student = page.students.find((item) => item.student_number.toUpperCase() === query);
          setResult(student ? { query, status: 'found', student } : { query, status: 'not_found' });
        })
        .catch(() => { if (isCurrent) setResult({ query, status: 'error' }); });
    }, DEBOUNCE_MS);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [token, query]);

  // A result only counts for the number it was fetched for, so nothing is set from inside the effect.
  const current = result !== null && result.query === query ? result : null;
  const status: LookupStatus = query.length < MIN_LENGTH ? 'idle' : (current?.status ?? 'checking');

  return { status, student: current?.student };
}
