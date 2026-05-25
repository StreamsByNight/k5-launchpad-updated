import { canvasFetch } from './canvasAuth.js';

interface CanvasCourse {
  id: number;
  name: string;
}

interface CanvasAnnouncement {
  id: number;
  title: string;
  message?: string;
  posted_at?: string;
  context_code?: string;
  read_state?: string;
  html_url?: string;
}

interface DiscussionTopic {
  id: number;
  title: string;
  message?: string;
  posted_at?: string;
  last_reply_at?: string;
  read_state?: string;
  html_url?: string;
}

export interface AnnouncementDto {
  id: string;
  title: string;
  message: string;
  postedAt: string;
  readState: 'read' | 'unread';
  htmlUrl?: string;
}

export interface CourseAnnouncementGroupDto {
  courseId: string;
  label: string;
  unread: number;
  announcements: AnnouncementDto[];
}

export interface AnnouncementsResponseDto {
  global: AnnouncementDto[];
  courses: CourseAnnouncementGroupDto[];
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function mapAnnouncement(a: CanvasAnnouncement | DiscussionTopic, courseId?: string): AnnouncementDto {
  const posted = 'posted_at' in a && a.posted_at ? a.posted_at : '';
  return {
    id: String(a.id),
    title: a.title || 'Announcement',
    message: stripHtml(a.message ?? ''),
    postedAt: posted,
    readState: a.read_state === 'unread' ? 'unread' : 'read',
    htmlUrl: a.html_url,
    ...(courseId ? {} : {}),
  };
}

async function loadCourses(token: string): Promise<CanvasCourse[]> {
  return canvasFetch<CanvasCourse[]>(
    '/courses?enrollment_state=active&per_page=100',
    token
  );
}

async function fetchBulkAnnouncements(
  token: string,
  courseIds: number[]
): Promise<CanvasAnnouncement[]> {
  if (courseIds.length === 0) return [];

  const params = new URLSearchParams({ per_page: '100' });
  for (const id of courseIds) {
    params.append('context_codes[]', `course_${id}`);
  }

  try {
    return await canvasFetch<CanvasAnnouncement[]>(`/announcements?${params}`, token);
  } catch {
    return [];
  }
}

async function fetchCourseDiscussionAnnouncements(
  token: string,
  courseId: number
): Promise<DiscussionTopic[]> {
  try {
    return await canvasFetch<DiscussionTopic[]>(
      `/courses/${courseId}/discussion_topics?only_announcements=1&per_page=50&order_by=recent_activity`,
      token
    );
  } catch {
    return [];
  }
}

export async function fetchAnnouncementsForUser(accessToken: string): Promise<AnnouncementsResponseDto> {
  const courses = await loadCourses(accessToken);
  const courseIds = courses.map((c) => c.id);

  const bulk = await fetchBulkAnnouncements(accessToken, courseIds);

  const global: AnnouncementDto[] = [];
  const byCourseId = new Map<number, AnnouncementDto[]>();

  for (const course of courses) {
    byCourseId.set(course.id, []);
  }

  for (const a of bulk) {
    const item = mapAnnouncement(a);
    const match = a.context_code?.match(/^course_(\d+)$/);
    if (match) {
      const cid = Number(match[1]);
      byCourseId.get(cid)?.push(item);
    } else {
      global.push(item);
    }
  }

  for (const courseId of courseIds) {
    if ((byCourseId.get(courseId)?.length ?? 0) > 0) continue;

    const topics = await fetchCourseDiscussionAnnouncements(accessToken, courseId);
    for (const t of topics) {
      byCourseId.get(courseId)?.push(mapAnnouncement(t, String(courseId)));
    }
  }

  const courseGroups: CourseAnnouncementGroupDto[] = courses.map((c) => {
    const items = (byCourseId.get(c.id) ?? []).sort(
      (a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()
    );
    return {
      courseId: String(c.id),
      label: c.name,
      unread: items.filter((i) => i.readState === 'unread').length,
      announcements: items,
    };
  });

  return {
    global: global.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()),
    courses: courseGroups,
  };
}
