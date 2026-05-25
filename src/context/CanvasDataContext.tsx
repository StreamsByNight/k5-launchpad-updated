import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { canvasGet, fetchAnnouncements } from '../api/client';
import { fetchTeachersFromCanvas } from '../services/fetchTeachers';
import {
  formatCourseWithTeacher,
  mapCalendarToAgenda,
  mapCourses,
  mapModules,
} from '../services/canvasMappers';
import type { AgendaItem, Announcement, Course, CourseAnnouncementGroup, Module, Teacher } from '../types';
import { isoToDateKey } from '../utils/dates';
import { useAuth } from './AuthContext';
import { useSettings } from './SettingsContext';

interface CanvasDataValue {
  courses: Course[];
  agenda: AgendaItem[];
  teachers: Teacher[];
  globalAnnouncements: Announcement[];
  courseAnnouncementGroups: CourseAnnouncementGroup[];
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  fetchModules: (courseId: string) => Promise<Module[]>;
}

const CanvasDataContext = createContext<CanvasDataValue | null>(null);

export function CanvasDataProvider({ children }: { children: ReactNode }) {
  const { authenticated } = useAuth();
  const { timeZone } = useSettings();
  const [courses, setCourses] = useState<Course[]>([]);
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [globalAnnouncements, setGlobalAnnouncements] = useState<Announcement[]>([]);
  const [courseAnnouncementGroups, setCourseAnnouncementGroups] = useState<CourseAnnouncementGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moduleCache, setModuleCache] = useState<Record<string, Module[]>>({});

  const clearData = useCallback(() => {
    setCourses([]);
    setAgenda([]);
    setTeachers([]);
    setGlobalAnnouncements([]);
    setCourseAnnouncementGroups([]);
    setModuleCache({});
  }, []);

  const refreshData = useCallback(async () => {
    if (!authenticated) {
      clearData();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const now = new Date();
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      const end = new Date(now);
      end.setDate(end.getDate() + 21);

      const rawCourses = await canvasGet<Parameters<typeof mapCourses>[0]>('/courses', {
        enrollment_state: 'active',
        'include[]': ['teachers', 'total_scores'],
        per_page: '100',
      }).catch(() =>
        canvasGet<Parameters<typeof mapCourses>[0]>('/courses', {
          enrollment_state: 'active',
          per_page: '100',
        })
      );

      const mappedCourses = mapCourses(rawCourses);
      const courseIds = mappedCourses.map((c) => c.id);

      const [events, announcementData, mappedTeachers] = await Promise.all([
        canvasGet<
          Array<{
            id: number;
            title: string;
            start_at: string;
            end_at?: string;
            context_code?: string;
            workflow_state?: string;
            type: string;
            description?: string;
            html_url?: string;
            location_name?: string;
          }>
        >('/calendar_events', {
          start_date: isoToDateKey(start.toISOString(), timeZone),
          end_date: isoToDateKey(end.toISOString(), timeZone),
          per_page: '100',
        }),
        fetchAnnouncements(),
        fetchTeachersFromCanvas(courseIds, rawCourses),
      ]);

      const courseNames = Object.fromEntries(
        mappedCourses.map((c) => [c.id, formatCourseWithTeacher(c)])
      );
      const mappedAgenda = mapCalendarToAgenda(events, timeZone, courseNames);

      const byCourseId = Object.fromEntries(announcementData.courses.map((g) => [g.courseId, g]));

      const groups: CourseAnnouncementGroup[] = mappedCourses.map((course) => {
        const fromApi = byCourseId[course.id];
        return {
          courseId: course.id,
          label: formatCourseWithTeacher(course),
          unread: fromApi?.unread ?? 0,
          announcements: fromApi?.announcements ?? [],
        };
      });

      setCourses(mappedCourses);
      setAgenda(mappedAgenda);
      setTeachers(mappedTeachers);
      setGlobalAnnouncements(announcementData.global);
      setCourseAnnouncementGroups(groups);
      setModuleCache({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Canvas data');
      clearData();
    } finally {
      setLoading(false);
    }
  }, [authenticated, timeZone, clearData]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const fetchModules = useCallback(
    async (courseId: string): Promise<Module[]> => {
      if (!authenticated) return [];
      if (moduleCache[courseId]) return moduleCache[courseId];

      try {
        const raw = await canvasGet<
          Array<{
            id: number;
            name: string;
            position: number;
            state: string;
            items_count: number;
            items?: unknown[];
          }>
        >(`/courses/${courseId}/modules`, { 'include[]': 'items', per_page: '50' });
        const mapped = mapModules(raw as Parameters<typeof mapModules>[0], courseId);
        setModuleCache((c) => ({ ...c, [courseId]: mapped }));
        return mapped;
      } catch {
        return [];
      }
    },
    [authenticated, moduleCache]
  );

  return (
    <CanvasDataContext.Provider
      value={{
        courses,
        agenda,
        teachers,
        globalAnnouncements,
        courseAnnouncementGroups,
        loading,
        error,
        refreshData,
        fetchModules,
      }}
    >
      {children}
    </CanvasDataContext.Provider>
  );
}

export function useCanvasData() {
  const ctx = useContext(CanvasDataContext);
  if (!ctx) throw new Error('useCanvasData must be used within CanvasDataProvider');
  return ctx;
}
