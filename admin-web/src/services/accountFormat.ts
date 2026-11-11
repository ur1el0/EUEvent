/** The date an account was registered, or a clear note when the API did not send one. */
export function formatRegisteredDate(value: string | null): string {
  if (!value) return 'Registration date unavailable';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Registration date unavailable';

  return 'Registered ' + new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
}
