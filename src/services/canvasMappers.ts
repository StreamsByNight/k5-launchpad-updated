import { isoToDateKey } from '../utils/dates';
import type { AgendaItem, Course, Module, ModuleItem, RequirementStatus, Teacher } from '../types';

interface CanvasCourse {
  id: number;
  name: string;
  course_code?: string;
  enrollments?: Array<{
    computed_current_score?: number;
    computed_current_letter_grade?: string;
    computed_final_score?: number;
    computed_final_letter_grade?: string;
  }>;
  teachers?: Array<{ display_name: string }>;
}

interface CanvasCalendarEvent {
  id: number;
  title: string;
  description?: string;
  start_at: string;
  end_at?: string;
  context_code?: string;
  workflow_state?: string;
  type: string;
  html_url?: string;
  location_name?: string;
}

interface CanvasAnnouncement {
  id: number;
  title: string;
  message: string;
  posted_at: string;
  read_state?: string;
  context_code?: string;
}

interface CanvasModule {
  id: number;
  name: string;
  position: number;
  state: string;
  items_count: number;
  items?: CanvasModuleItem[];
}

interface CanvasModuleItem {
  id: number;
  title: string;
  type: string;
  completion_requirement?: { type: string };
  due_at?: string;
  url?: string;
  html_url?: string;
}

interface CanvasEnrollment {
  id: number;
  course_id: number;
  role: string;
  user?: { id: number; name: string; sortable_name?: string };
}

interface CanvasAssignment {
  id: number;
  name: string;
  due_at?: string;
  submission?: { submitted_at?: string; score?: number; grade?: string; workflow_state?: string };
  points_possible?: number;
}

export function parseTeacherFromCourseName(courseName: string): string | null {
  const parts = courseName.split(' - ');
  if (parts.length >= 2) {
    const teacher = parts[parts.length - 1].trim();
    if (teacher && teacher.length < 80 && !/^(term|period)\b/i.test(teacher)) return teacher;
  }
  return null;
}

/** Short label for display, e.g. "Deal, Ashlee" → "Deal" */
export function shortTeacherLabel(teacher: string): string {
  if (teacher.includes(',')) return teacher.split(',')[0].trim();
  const parts = teacher.trim().split(/\s+/);
  if (parts.length >= 2) return parts[parts.length - 1];
  return teacher;
}

/** Remove trailing " - Teacher" from Canvas course title when already present */
export function stripTeacherFromTitle(fullName: string, teacher: string): string {
  const label = shortTeacherLabel(teacher);
  const suffix = ` - ${label}`;
  if (fullName.endsWith(suffix)) return fullName.slice(0, -suffix.length).trim();

  const parsed = parseTeacherFromCourseName(fullName);
  if (parsed) {
    const parsedSuffix = ` - ${parsed}`;
    if (fullName.endsWith(parsedSuffix)) return fullName.slice(0, -parsedSuffix.length).trim();
  }

  return fullName;
}

/** Course title + teacher, without duplicating the teacher suffix */
export function formatCourseWithTeacher(course: { name: string; teacher: string }): string {
  const label = shortTeacherLabel(course.teacher);
  const suffix = ` - ${label}`;
  if (course.name.endsWith(suffix) || course.name.toLowerCase().endsWith(suffix.toLowerCase())) {
    return course.name;
  }
  return `${course.name} - ${label}`;
}

function inferSubject(name: string): Course['subject'] {
  const n = name.toLowerCase();
  if (n.includes('ela') || n.includes('english') || n.includes('reading')) return 'ela';
  if (n.includes('math')) return 'math';
  if (n.includes('science') || n.includes('forestry')) return 'science';
  if (n.includes('geo') || n.includes('history') || n.includes('social')) return 'social';
  if (n.includes('homeroom')) return 'homeroom';
  return 'other';
}

function mapSubmissionStatus(
  sub?: CanvasAssignment['submission'],
  dueAt?: string,
  pointsPossible?: number
): RequirementStatus {
  if (sub?.workflow_state === 'graded' || sub?.submitted_at) {
    if (sub.score != null && pointsPossible && sub.score >= pointsPossible * 0.9) return 'Mastered';
    return 'Completed';
  }
  if (dueAt && new Date(dueAt) < new Date()) return 'Past Due';
  return 'Not Started';
}

function mapModuleItemState(type: string, completed?: boolean): RequirementStatus {
  if (completed) return 'Completed';
  return 'Not Started';
}

export function mapCourses(raw: CanvasCourse[]): Course[] {
  return raw
    .filter((c) => c.name && !c.name.toLowerCase().includes('sandbox'))
    .map((c) => {
      const en = c.enrollments?.[0];
      const score = en?.computed_current_score ?? en?.computed_final_score ?? null;
      const grade = en?.computed_current_letter_grade ?? en?.computed_final_letter_grade ?? null;
      const teacherRaw =
        c.teachers?.[0]?.display_name ??
        (c.teachers?.[0] as { name?: string })?.name ??
        parseTeacherFromCourseName(c.name) ??
        'Teacher';
      const teacher = shortTeacherLabel(teacherRaw);
      const name = stripTeacherFromTitle(c.name, teacher);
      return {
        id: String(c.id),
        name,
        teacher,
        subject: inferSubject(c.name),
        currentScore: score != null ? Math.round(score * 100) / 100 : null,
        grade: grade ?? null,
        itemCount: 0,
        mastered: 0,
        pastDue: 0,
      };
    });
}

export function mapTeachersFromCourses(courses: CanvasCourse[]): Teacher[] {
  const seen = new Map<string, Teacher>();
  const colors = ['#e67e22', '#27ae60', '#e91e63', '#9b59b6', '#3498db', '#1abc9c', '#f39c12'];
  let i = 0;

  for (const c of courses) {
    for (const t of c.teachers ?? []) {
      const key = t.display_name.toLowerCase();
      if (seen.has(key)) continue;
      const parts = t.display_name.split(' ');
      const initials = parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : t.display_name.slice(0, 2);
      seen.set(key, {
        id: key,
        name: t.display_name,
        initials: initials.toUpperCase(),
        color: colors[i++ % colors.length],
        email: '',
      });
    }
  }

  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function mapCalendarToAgenda(
  events: CanvasCalendarEvent[],
  timeZone: string,
  courseNames: Record<string, string>
): AgendaItem[] {
  const now = new Date();

  return events.map((ev) => {
    const dateKey = isoToDateKey(ev.start_at, timeZone);
    const courseId = ev.context_code?.replace('course_', '') ?? '';
    const courseLabel = courseNames[courseId] ?? ev.title;
    const isClassConnect =
      ev.title.toLowerCase().includes('class connect') ||
      ev.title.toLowerCase().includes('live class') ||
      ev.location_name?.toLowerCase().includes('connect');

    let status: RequirementStatus = 'Not Started';
    if (ev.workflow_state === 'completed') status = 'Completed';
    else if (ev.end_at && new Date(ev.end_at) < now) status = 'Past Due';

    const isPastDue = Boolean(ev.end_at && new Date(ev.end_at) < now && ev.workflow_state !== 'completed');

    return {
      id: String(ev.id),
      courseId,
      courseName: courseLabel,
      title: ev.title,
      subtitle: ev.description?.replace(/<[^>]+>/g, '').slice(0, 120) || ev.type,
      time: formatTimeRange(ev.start_at, ev.end_at ?? null, timeZone),
      type: isClassConnect ? 'class-connect' : ev.type === 'assignment' ? 'assignment' : 'event',
      status,
      date: dateKey,
      isPastDue,
      htmlUrl: ev.html_url,
    };
  });
}

function formatTimeRange(start: string, end: string | null, timeZone: string): string | undefined {
  const opts: Intl.DateTimeFormatOptions = { timeZone, hour: 'numeric', minute: '2-digit', hour12: true };
  const s = new Date(start).toLocaleTimeString('en-US', opts);
  if (!end) return `Start: ${s}`;
  const e = new Date(end).toLocaleTimeString('en-US', opts);
  return `Start: ${s} | End: ${e}`;
}

export function mapAnnouncements(
  global: CanvasAnnouncement[],
  courseList: { courseId: string; label: string; unread: number }[]
) {
  const globalUnread = global.filter((a) => a.read_state === 'unread').length;
  return { globalUnread, global, courseList };
}

export function mapModules(raw: CanvasModule[], courseId: string): Module[] {
  return raw.map((m, idx) => {
    const items: ModuleItem[] = (m.items ?? []).map((item) => ({
      id: String(item.id),
      title: item.title,
      type: item.type,
      reqType: item.completion_requirement?.type ?? '—',
      dateDue: item.due_at ? isoToDateKey(item.due_at, Intl.DateTimeFormat().resolvedOptions().timeZone) : null,
      dateCompleted: null,
      score: null,
      percent: null,
      letterGrade: null,
      status: mapModuleItemState(item.type, false),
      htmlUrl: item.html_url ?? item.url,
    }));

    const completed = items.filter((i) => i.status === 'Completed').length;
    let moduleStatus: RequirementStatus = 'Not Started';
    if (m.state === 'completed') moduleStatus = 'Completed';
    else if (completed > 0) moduleStatus = 'In Progress';

    const num = m.position ?? idx + 1;
    return {
      id: String(m.id),
      courseId,
      number: String(num).padStart(2, '0'),
      title: m.name,
      itemCount: m.items_count ?? items.length,
      mastered: 0,
      pastDue: 0,
      moduleStatus,
      items,
      expanded: idx === 0,
    };
  });
}

export function mapAssignmentsToModuleItems(assignments: CanvasAssignment[], timeZone: string): ModuleItem[] {
  return assignments.map((a) => {
    const sub = a.submission;
    const status = mapSubmissionStatus(sub, a.due_at, a.points_possible);
    const pct =
      sub?.score != null && a.points_possible
        ? `${((sub.score / a.points_possible) * 100).toFixed(2)}%`
        : null;

    return {
      id: String(a.id),
      title: a.name,
      type: 'Assignment',
      reqType: 'Must Submit',
      dateDue: a.due_at ? isoToDateKey(a.due_at, timeZone) : null,
      dateCompleted: sub?.submitted_at ? isoToDateKey(sub.submitted_at, timeZone) : null,
      score: sub?.score != null && a.points_possible ? `${sub.score}/${a.points_possible}` : null,
      percent: pct,
      letterGrade: sub?.grade ?? null,
      status,
    };
  });
}

export function buildCourseAnnouncementList(courses: Course[], unreadByCourse: Record<string, number>) {
  return courses.map((c) => ({
    courseId: c.id,
    label: formatCourseWithTeacher(c),
    unread: unreadByCourse[c.id] ?? 0,
  }));
}
