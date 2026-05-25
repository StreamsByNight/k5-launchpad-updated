import { canvasGet, fetchTeachers as fetchTeachersApi } from '../api/client';
import { normalizeTeacherEmail } from '../utils/teacherEmail';
import { parseTeacherFromCourseName } from './canvasMappers';
import type { Teacher } from '../types';

/** Teacher object on course list/detail (Canvas UserDisplay) */
export interface CanvasCourseTeacher {
  id?: number;
  display_name?: string;
  name?: string;
  sortable_name?: string;
  email?: string;
  login_id?: string;
}

export interface CanvasCourseWithTeachers {
  id: number;
  name?: string;
  teachers?: CanvasCourseTeacher[];
}

interface CanvasCourseUser {
  id?: number;
  name?: string;
  display_name?: string;
  sortable_name?: string;
  short_name?: string;
  email?: string;
  login_id?: string;
}

interface CanvasEnrollment {
  id: number;
  type: string;
  user?: CanvasCourseUser;
}

interface CanvasUserProfile {
  id: number;
  name?: string;
  sortable_name?: string;
  email?: string;
  login_id?: string;
}

const AVATAR_COLORS = ['#e67e22', '#27ae60', '#e91e63', '#9b59b6', '#3498db', '#1abc9c', '#f39c12'];

function displayNameOf(user: CanvasCourseUser | CanvasCourseTeacher): string {
  return (
    user.sortable_name ||
    user.display_name ||
    user.name ||
    ''
  ).trim();
}

function initialsFromName(displayName: string): string {
  if (displayName.includes(',')) {
    const [last, first] = displayName.split(',').map((s) => s.trim());
    if (first && last) return `${first[0]}${last[0]}`.toUpperCase();
  }
  const parts = displayName.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return displayName.slice(0, 2).toUpperCase();
}

function userKey(user: CanvasCourseUser | CanvasCourseTeacher): string {
  if (user.id) return `id:${user.id}`;
  const name = displayNameOf(user);
  return `name:${name.toLowerCase()}`;
}

/** Collect teachers embedded on course list/detail responses (works for students). */
function extractTeachersFromCourses(courses: CanvasCourseWithTeachers[]): CanvasCourseUser[] {
  const users: CanvasCourseUser[] = [];
  for (const course of courses) {
    for (const t of course.teachers ?? []) {
      const name = displayNameOf(t);
      if (!name) continue;
      users.push({
        id: t.id,
        name,
        display_name: t.display_name ?? name,
        sortable_name: t.sortable_name,
        email: t.email,
      });
    }
  }
  return users;
}

export function mapCanvasUsersToTeachers(users: CanvasCourseUser[]): Teacher[] {
  const byKey = new Map<string, Teacher>();
  let colorIdx = 0;

  for (const user of users) {
    const displayName = displayNameOf(user);
    if (!displayName) continue;

    const key = userKey(user);
    const existing = byKey.get(key);
    if (existing) {
      if (!existing.email && user.email) existing.email = user.email;
      continue;
    }

    byKey.set(key, {
      id: user.id ? String(user.id) : key,
      name: user.sortable_name || displayName,
      initials: initialsFromName(displayName),
      color: AVATAR_COLORS[colorIdx++ % AVATAR_COLORS.length],
      email: normalizeTeacherEmail(displayName, user.email, user.login_id),
    });
  }

  return [...byKey.values()].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );
}

async function fetchTeachersViaCourseDetail(courseIds: string[]): Promise<CanvasCourseUser[]> {
  const users: CanvasCourseUser[] = [];
  const batchSize = 4;

  for (let i = 0; i < courseIds.length; i += batchSize) {
    const batch = courseIds.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (courseId) => {
        try {
          const course = await canvasGet<CanvasCourseWithTeachers>(`/courses/${courseId}`, {
            'include[]': 'teachers',
          });
          return extractTeachersFromCourses([course]);
        } catch {
          return [];
        }
      })
    );
    users.push(...results.flat());
  }
  return users;
}

async function fetchTeachersViaCourseUsers(courseIds: string[]): Promise<CanvasCourseUser[]> {
  const users: CanvasCourseUser[] = [];
  const batchSize = 4;

  for (let i = 0; i < courseIds.length; i += batchSize) {
    const batch = courseIds.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (courseId) => {
        try {
          const list = await canvasGet<CanvasCourseUser[]>(`/courses/${courseId}/users`, {
            'enrollment_type[]': ['teacher', 'ta'],
            'include[]': 'email',
            per_page: '50',
          });
          if (list.length > 0) return list;
        } catch {
          /* fall through */
        }

        try {
          const enrollments = await canvasGet<CanvasEnrollment[]>(`/courses/${courseId}/enrollments`, {
            'type[]': ['TeacherEnrollment', 'TaEnrollment'],
            'include[]': ['user', 'email'],
            per_page: '50',
          });
          return enrollments.map((e) => e.user).filter((u): u is CanvasCourseUser => Boolean(u));
        } catch {
          return [];
        }
      })
    );
    users.push(...results.flat());
  }
  return users;
}

function pickEmail(...sources: Array<string | undefined | null>): string {
  for (const s of sources) {
    if (s?.includes('@')) return s.trim();
  }
  return '';
}

async function enrichWithProfiles(teachers: Teacher[]): Promise<Teacher[]> {
  return Promise.all(
    teachers.map(async (t) => {
      if (t.email?.includes('@') || !t.id || !/^\d+$/.test(t.id)) return t;

      try {
        const profile = await canvasGet<CanvasUserProfile & { primary_email?: string; login_id?: string }>(
          `/users/${t.id}/profile`
        );
        const email = pickEmail(profile.email, profile.primary_email, profile.login_id);
        if (email) return { ...t, email, name: profile.sortable_name || profile.name || t.name };
      } catch {
        /* continue */
      }

      try {
        const user = await canvasGet<CanvasUserProfile & { login_id?: string }>(`/users/${t.id}`);
        const email = pickEmail(user.email, user.login_id);
        if (email) return { ...t, email, name: user.sortable_name || user.name || t.name };
      } catch {
        /* continue */
      }

      try {
        const channels = await canvasGet<Array<{ type: string; address: string }>>(
          `/users/${t.id}/communication_channels`,
          { per_page: '10' }
        );
        const email = channels.find((c) => c.type === 'email' && c.address?.includes('@'))?.address;
        if (email) return { ...t, email };
      } catch {
        /* no email available */
      }

      return t;
    })
  );
}

function mergeUserLists(...lists: CanvasCourseUser[]): CanvasCourseUser[] {
  const seen = new Set<string>();
  const out: CanvasCourseUser[] = [];
  for (const u of lists) {
    const k = userKey(u);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(u);
  }
  return out;
}

/**
 * Load teachers for all active courses.
 * 1) teachers[] on course list (student-safe)
 * 2) per-course ?include[]=teachers
 * 3) course users / enrollments (if permitted)
 * 4) profile lookup for emails
 */
export async function fetchTeachersFromCanvas(
  courseIds: string[],
  rawCourses: CanvasCourseWithTeachers[]
): Promise<Teacher[]> {
  try {
    const fromServer = await fetchTeachersApi();
    if (fromServer.length > 0) return fromServer;
  } catch {
    /* use client-side aggregation */
  }

  if (courseIds.length === 0) return [];

  let users = extractTeachersFromCourses(rawCourses);

  if (users.length === 0) {
    users = await fetchTeachersViaCourseDetail(courseIds);
  }

  if (users.length === 0) {
    users = await fetchTeachersViaCourseUsers(courseIds);
  }

  if (users.length === 0) {
    for (const c of rawCourses) {
      const parsed = c.name ? parseTeacherFromCourseName(c.name) : null;
      if (parsed) users.push({ name: parsed, display_name: parsed });
    }
  }

  users = mergeUserLists(...users);

  let teachers = mapCanvasUsersToTeachers(users);
  teachers = await enrichWithProfiles(teachers);

  return teachers.map((t) => ({
    ...t,
    email: normalizeTeacherEmail(t.name, t.email),
  }));
}
