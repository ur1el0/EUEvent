import { apiRequest } from './apiClient';
import type { SecurityStaff } from '../types';
import type { StudentPage } from '../types/accounts';

export async function fetchSecurityStaff(token: string): Promise<SecurityStaff[]> {
  const result = await apiRequest<{ staff: SecurityStaff[] }>('/admin/security-staff', { token });
  return result.staff;
}

export async function createSecurityStaff(
  token: string,
  body: { name: string; email: string; password: string; password_confirmation: string },
): Promise<SecurityStaff> {
  const result = await apiRequest<{ staff: SecurityStaff }>('/admin/security-staff', { method: 'POST', token, body });
  return result.staff;
}

export async function setSecurityStaffActive(token: string, staffId: number, isActive: boolean): Promise<SecurityStaff> {
  const result = await apiRequest<{ staff: SecurityStaff }>('/admin/security-staff/' + staffId + '/status', {
    method: 'PATCH',
    token,
    body: { is_active: isActive },
  });
  return result.staff;
}

/** DELETE /api/v1/admin/security-staff/{staff}: soft delete. */
export async function deleteSecurityStaff(token: string, staffId: number): Promise<void> {
  await apiRequest('/admin/security-staff/' + staffId, { method: 'DELETE', token });
}

export function fetchStudents(token: string, page: number, perPage: number, search: string): Promise<StudentPage> {
  const query = new URLSearchParams({ page: String(page), per_page: String(perPage) });
  if (search) query.set('search', search);

  return apiRequest<StudentPage>('/admin/students?' + query.toString(), { token });
}

/** DELETE /api/v1/admin/students/{student}: soft delete. */
export async function deleteStudent(token: string, studentId: number): Promise<void> {
  await apiRequest('/admin/students/' + studentId, { method: 'DELETE', token });
}
