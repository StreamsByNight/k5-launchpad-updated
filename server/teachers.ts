import { canvasFetch } from './canvasAuth.js';
import { normalizeTeacherEmail } from './teacherEmail.js';

interface CanvasTeacher {
  id?: number;
  display_name?: string;
  name?: string;
  sortable_name?: string;
  email?: string;
}

interface CanvasCourse {
  id: number;
  name?: string;
  teachers?: CanvasTeacher[];
}

interface CanvasUser {
  id: number;
  name?: string;
  display_name?: string;
  sortable_name?: string;
  email?: string;
  login_id?: string;
  primary_email?: string;
}

interface CanvasProfile {
  id?: number;
  name?: string;
  sortable_name?: string;
  email?: string;
  primary_email?: string;
  login_id?: string;
}

interface CommunicationChannel {
  type: string;
  address: string;
  workflow_state?: string;
}

export interface TeacherDto {
  id: string;
  name: string;
  initials: string;
  color: string;
  email: string;
}

const COLORS = ['#e67e22', '#27ae60', '#e91e63', '#9b59b6', '#3498db', '#1abc9c', '#f39c12'];

function parseTeacherFromCourseName(courseName: string): string | null {
  const parts = courseName.split(' - ');
  if (parts.length >= 2) {
    const teacher = parts[parts.length - 1].trim();
    if (teacher && !/^\d+$/.test(teacher)) return teacher;
  }
  return null;
}

function displayName(t: CanvasTeacher | CanvasUser): string {
  return (t.sortable_name || t.display_name || t.name || '').trim();
}

function normalizeNameKey(name: string): string {
  const n = name.toLowerCase().trim();
  if (n.includes(',')) {
    const [last, first] = n.split(',').map((s) => s.trim());
    if (first && last) return `${first} ${last}`;
  }
  return n;
}

function initials(name: string): string {
  if (name.includes(',')) {
    const parts = normalizeNameKey(name).split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function pickEmail(...sources: Array<string | undefined | null>): string {
  for (const s of sources) {
    if (!s) continue;
    const v = s.trim();
    if (v.includes('@')) return v;
  }
  return '';
}

async function loadCourses(token: string): Promise<CanvasCourse[]> {
  return canvasFetch<CanvasCourse[]>(
    '/courses?enrollment_state=active&per_page=100&include[]=teachers&include[]=total_scores',
    token
  );
}

async function loadCourseTeachers(token: string, courseId: number): Promise<CanvasTeacher[]> {
  try {
    const course = await canvasFetch<CanvasCourse>(`/courses/${courseId}?include[]=teachers`, token);
    return course.teachers ?? [];
  } catch {
    return [];
  }
}

async function loadCourseUsers(token: string, courseId: number): Promise<CanvasUser[]> {
  const users: CanvasUser[] = [];

  try {
    const teachers = await canvasFetch<CanvasUser[]>(
      `/courses/${courseId}/users?enrollment_type[]=teacher&enrollment_type[]=ta&include[]=email&per_page=50`,
      token
    );
    users.push(...teachers);
  } catch {
    /* roster may be restricted */
  }

  try {
    const enrollments = await canvasFetch<Array<{ user?: CanvasUser }>>(
      `/courses/${courseId}/enrollments?type[]=TeacherEnrollment&type[]=TaEnrollment&include[]=user&include[]=email&per_page=50`,
      token
    );
    for (const e of enrollments) {
      if (e.user) users.push(e.user);
    }
  } catch {
    /* ignore */
  }

  return users;
}

async function loadCourseUser(token: string, courseId: number, userId: number): Promise<CanvasUser | null> {
  try {
    return await canvasFetch<CanvasUser>(
      `/courses/${courseId}/users/${userId}?include[]=email`,
      token
    );
  } catch {
    return null;
  }
}

async function loadProfile(token: string, userId: number): Promise<CanvasProfile | null> {
  try {
    return await canvasFetch<CanvasProfile>(`/users/${userId}/profile`, token);
  } catch {
    return null;
  }
}

async function loadUser(token: string, userId: number): Promise<CanvasUser | null> {
  try {
    return await canvasFetch<CanvasUser>(`/users/${userId}`, token);
  } catch {
    return null;
  }
}

async function loadCommunicationChannels(token: string, userId: number): Promise<string> {
  try {
    const channels = await canvasFetch<CommunicationChannel[]>(
      `/users/${userId}/communication_channels?per_page=20`,
      token
    );
    const emailChannel = channels.find(
      (c) => c.type === 'email' && c.workflow_state !== 'unconfirmed' && c.address?.includes('@')
    );
    return emailChannel?.address ?? channels.find((c) => c.address?.includes('@'))?.address ?? '';
  } catch {
    return '';
  }
}

async function resolveEmail(
  token: string,
  userId: number,
  courseIds: number[],
  existing = ''
): Promise<string> {
  if (existing.includes('@')) return existing;

  const user = await loadUser(token, userId);
  let email = pickEmail(user?.email, user?.primary_email, user?.login_id);
  if (email) return email;

  const profile = await loadProfile(token, userId);
  email = pickEmail(profile?.email, profile?.primary_email, profile?.login_id);
  if (email) return email;

  email = await loadCommunicationChannels(token, userId);
  if (email) return email;

  for (const courseId of courseIds.slice(0, 8)) {
    const inCourse = await loadCourseUser(token, courseId, userId);
    email = pickEmail(inCourse?.email, inCourse?.login_id);
    if (email) return email;
  }

  return '';
}

export async function fetchTeachersForUser(accessToken: string): Promise<TeacherDto[]> {
  const courses = await loadCourses(accessToken);
  const courseIds = courses.map((c) => c.id);

  const roster = new Map<number, { name: string; email: string; loginId?: string }>();
  const nameOnly = new Map<string, { name: string; email: string; loginId?: string }>();

  const addById = (userId: number, name: string, email = '', loginId?: string) => {
    if (!name || name === 'Teacher') return;
    const prev = roster.get(userId);
    roster.set(userId, {
      name: prev?.name || name,
      email: pickEmail(prev?.email, email),
      loginId: prev?.loginId || loginId,
    });
  };

  const addByName = (name: string, email = '', loginId?: string) => {
    if (!name || name === 'Teacher') return;
    const key = normalizeNameKey(name);
    const prev = nameOnly.get(key);
    nameOnly.set(key, {
      name: prev?.name || name,
      email: pickEmail(prev?.email, email),
      loginId: prev?.loginId || loginId,
    });
  };

  for (const course of courses) {
    for (const t of course.teachers ?? []) {
      const name = displayName(t);
      if (!name) continue;
      if (t.id) addById(t.id, t.sortable_name || name, t.email);
      else addByName(name, t.email);
    }

    if (!course.teachers?.length && course.name) {
      const parsed = parseTeacherFromCourseName(course.name);
      if (parsed) addByName(parsed);
    }
  }

  for (const course of courses) {
    const detailTeachers = await loadCourseTeachers(accessToken, course.id);
    for (const t of detailTeachers) {
      const name = displayName(t);
      if (!name) continue;
      if (t.id) addById(t.id, t.sortable_name || name, t.email);
      else addByName(name, t.email);
    }
  }

  for (const course of courses) {
    const users = await loadCourseUsers(accessToken, course.id);
    for (const u of users) {
      const name = displayName(u);
      if (!name) continue;
      addById(u.id, u.sortable_name || name, pickEmail(u.email, u.login_id), u.login_id);
    }
  }

  await Promise.all(
    [...roster.entries()].map(async ([userId, data]) => {
      const email = await resolveEmail(accessToken, userId, courseIds, data.email);
      roster.set(userId, { ...data, email });
    })
  );

  for (const [userId, data] of roster) {
    const key = normalizeNameKey(data.name);
    if (nameOnly.has(key)) {
      const n = nameOnly.get(key)!;
      if (!n.email && data.email) n.email = data.email;
      nameOnly.delete(key);
    }
  }

  const byKey = new Map<string, TeacherDto>();
  let colorIdx = 0;

  const insert = (id: string, name: string, rawEmail: string, loginId?: string) => {
    const email = normalizeTeacherEmail(name, rawEmail, loginId);
    const key = /^\d+$/.test(id) ? `id:${id}` : `name:${normalizeNameKey(name)}`;
    if (byKey.has(key)) return;
    byKey.set(key, {
      id,
      name,
      initials: initials(name),
      color: COLORS[colorIdx++ % COLORS.length],
      email,
    });
  };

  for (const [userId, data] of roster) {
    insert(String(userId), data.name, data.email, data.loginId);
  }

  for (const [, data] of nameOnly) {
    insert(`name:${normalizeNameKey(data.name)}`, data.name, data.email, data.loginId);
  }

  return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}
