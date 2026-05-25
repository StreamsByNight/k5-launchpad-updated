import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import DataBanner from '../components/DataBanner';
import { StatusDot, StatusIcon } from '../components/StatusBadge';
import { useCanvasData } from '../context/CanvasDataContext';
import { formatCourseWithTeacher } from '../services/canvasMappers';
import type { Module } from '../types';
import './CourseDetailPage.css';

export default function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { courses, fetchModules, teachers } = useCanvasData();
  const course = courses.find((c) => c.id === courseId);
  const [courseModules, setCourseModules] = useState<Module[]>([]);
  const [modulesLoading, setModulesLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!courseId) return;
    setModulesLoading(true);
    fetchModules(courseId)
      .then((mods) => {
        setCourseModules(mods);
        setExpanded(Object.fromEntries(mods.map((m) => [m.id, m.expanded ?? false])));
      })
      .finally(() => setModulesLoading(false));
  }, [courseId, fetchModules]);

  if (!course) {
    return (
      <div>
        <p>Course not found.</p>
        <Link to="/courses">← Back to Courses</Link>
      </div>
    );
  }

  const teacher =
    teachers.find((t) => course.teacher && t.name.toLowerCase().includes(course.teacher.toLowerCase())) ??
    teachers[0];

  const toggleModule = (id: string) => {
    setExpanded((e) => ({ ...e, [id]: !e[id] }));
  };

  return (
    <div className="course-detail-page">
      <DataBanner />
      <nav className="breadcrumb">
        <Link to="/courses">My Courses</Link>
        <span> › </span>
        <span>Course:</span>
      </nav>

      <div className="course-detail-header">
        <div>
          <h1 className="page-title">
            {course.subject === 'math' && '🔢 '}
            {formatCourseWithTeacher(course)}
          </h1>
          <p className="course-stats">
            {course.itemCount || '—'} Items |{' '}
            <span className="stat-mastered">{course.mastered} Mastered</span> |{' '}
            <span className="stat-past-due">{course.pastDue} Past Due</span>
          </p>
        </div>
        <div className="course-detail-cards">
          <div className="grade-summary card">
            <span className="grade-score">
              {course.currentScore != null ? `${course.currentScore}%` : '--'}
            </span>
            <span className="grade-label">Current Score</span>
            <span className="grade-letter-big">{course.grade ?? '--'}</span>
            <span className="grade-label">Grade</span>
          </div>
          {teacher && (
            <div className="teacher-summary card">
              <div className="teacher-avatar" style={{ background: teacher.color }}>
                {teacher.initials}
              </div>
              <div>
                <strong>{teacher.name}</strong>
                <p>Teacher</p>
                {teacher.email ? <a href={`mailto:${teacher.email}`}>Contact</a> : <span>Canvas Inbox</span>}
              </div>
            </div>
          )}
        </div>
      </div>

      <section className="modules-section">
        <div className="modules-section-header">
          <h2>Course Modules ({courseModules.length})</h2>
          <button type="button" className="btn btn-outline filter-btn">
            🔽 Filter
          </button>
        </div>

        {modulesLoading && <p className="modules-placeholder card">Loading modules from Canvas…</p>}

        {!modulesLoading && courseModules.length === 0 && (
          <p className="modules-placeholder card">No modules found for this course.</p>
        )}

        {!modulesLoading &&
          courseModules.map((mod) => (
            <div key={mod.id} className="module card">
              <button
                type="button"
                className="module-header"
                onClick={() => toggleModule(mod.id)}
                aria-expanded={expanded[mod.id]}
              >
                <span className="module-chevron">{expanded[mod.id] ? '▼' : '▶'}</span>
                <div className="module-header-text">
                  <strong>
                    {mod.number}: {mod.title}
                  </strong>
                  <p>
                    {mod.itemCount} Items | <span className="stat-mastered">{mod.mastered} Mastered</span> |{' '}
                    <span className="stat-past-due">{mod.pastDue} Past Due</span>
                  </p>
                </div>
                <div className="module-header-status">
                  {mod.moduleStatus === 'Completed' && (
                    <>
                      <span className="module-checks">✓✓✓✓✓✓</span>
                      <StatusIcon status="Completed" />
                    </>
                  )}
                  {mod.moduleStatus === 'In Progress' && (
                    <span className="status-in-progress">*In Progress*</span>
                  )}
                </div>
              </button>

              {expanded[mod.id] && mod.items.length > 0 && (
                <div className="module-items">
                  <div className="module-items-header">
                    <span>Items ({mod.items.length})</span>
                    <span>Date Due</span>
                    <span>Date Completed</span>
                    <span>Score | Grade</span>
                    <span>Requirement Status</span>
                  </div>
                  {mod.items.map((item) => (
                    <div key={item.id} className="module-item-row">
                      <div className="module-item-name">
                        📄{' '}
                        {item.htmlUrl ? (
                          <a href={item.htmlUrl} target="_blank" rel="noreferrer">
                            {item.title}
                          </a>
                        ) : (
                          <Link
                            to={`/lesson/${item.id}`}
                            state={{
                              title: item.title,
                              courseId,
                              courseName: formatCourseWithTeacher(course),
                            }}
                          >
                            {item.title}
                          </Link>
                        )}
                        <small>
                          Type: {item.type} | Req. Type: {item.reqType}
                        </small>
                      </div>
                      <span>{item.dateDue ?? '-'}</span>
                      <span>{item.dateCompleted ?? '-'}</span>
                      <span className="module-item-score">
                        {item.score && <>{item.score} </>}
                        {item.percent && <span className="grade-pill">{item.percent}</span>}
                        {item.letterGrade && <span className="grade-letter">{item.letterGrade}</span>}
                        {!item.score && !item.percent && 'N / A'}
                      </span>
                      <span className="module-item-status">
                        <StatusDot status={item.status} />
                        <span className="status-label">{item.status}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
      </section>

      <Link to="/courses" className="back-link">
        ← Return to K5 Dashboard
      </Link>
    </div>
  );
}
