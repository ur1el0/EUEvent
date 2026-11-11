export interface StudentAccount {
  id: number;
  name: string;
  email: string;
  student_number: string;
  created_at: string | null;
}

export interface StudentPageMeta {
  current_page: number;
  per_page: number;
  last_page: number;
  total: number;
}

export interface StudentPage {
  students: StudentAccount[];
  meta: StudentPageMeta;
}
