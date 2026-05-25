export type ThemeId = 'nature' | 'winter' | 'space';
export type HomePage = 'courses' | 'agenda' | 'announcements' | 'teachers';

export type RequirementStatus =
  | 'Completed'
  | 'In Progress'
  | 'Past Due'
  | 'Not Started'
  | 'Mastered'
  | 'Not Mastered';

export interface Course {
  id: string;
  name: string;
  teacher: string;
  subject: 'ela' | 'math' | 'science' | 'social' | 'homeroom' | 'other';
  currentScore: number | null;
  grade: string | null;
  itemCount: number;
  mastered: number;
  pastDue: number;
}

export interface Teacher {
  id: string;
  name: string;
  initials: string;
  color: string;
  email: string;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  postedAt: string;
  readState: 'read' | 'unread';
  htmlUrl?: string;
}

export interface CourseAnnouncementGroup {
  courseId: string;
  label: string;
  unread: number;
  announcements: Announcement[];
}

export interface AgendaItem {
  id: string;
  courseId: string;
  courseName: string;
  title: string;
  subtitle?: string;
  time?: string;
  type: 'lesson' | 'class-connect' | 'assignment' | 'event';
  status: RequirementStatus;
  date: string;
  isPastDue?: boolean;
  htmlUrl?: string;
}

export interface ModuleItem {
  id: string;
  title: string;
  type: string;
  reqType: string;
  dateDue: string | null;
  dateCompleted: string | null;
  score: string | null;
  percent: string | null;
  letterGrade: string | null;
  status: RequirementStatus;
  htmlUrl?: string;
}

export interface Module {
  id: string;
  courseId: string;
  number: string;
  title: string;
  itemCount: number;
  mastered: number;
  pastDue: number;
  moduleStatus: RequirementStatus;
  items: ModuleItem[];
  expanded?: boolean;
}

export interface LessonPage {
  id: string;
  moduleItemId: string;
  courseId: string;
  title: string;
  activityType: string;
  activityTitle: string;
  totalPages: number;
}
