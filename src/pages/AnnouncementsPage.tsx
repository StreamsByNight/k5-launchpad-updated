import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCanvasData } from '../context/CanvasDataContext';
import { useSettings } from '../context/SettingsContext';
import DataBanner from '../components/DataBanner';
import './AnnouncementsPage.css';

function formatPostedAt(iso: string, timeZone: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', {
    timeZone,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function AnnouncementsPage() {
  const { canvasBaseUrl } = useAuth();
  const { timeZone } = useSettings();
  const { globalAnnouncements, courseAnnouncementGroups, loading, refreshData } = useCanvasData();
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);

  const courseUnread = courseAnnouncementGroups.reduce((s, c) => s + c.unread, 0);
  const globalUnread = globalAnnouncements.filter((a) => a.readState === 'unread').length;
  const canvasAnnouncementsUrl = canvasBaseUrl ? `${canvasBaseUrl}/announcements` : '#';

  return (
    <div className="announcements-page">
      <DataBanner />

      <div className="announcements-grid">
        <section>
          <h2 className="section-title">Global Announcements({globalUnread})</h2>

          {globalAnnouncements.length === 0 ? (
            <div className="announcement-box card global-empty">
              <span className="info-icon">ℹ</span>
              <div>
                <p>You have no Global Announcements at this time.</p>
                <p className="announcement-links">
                  <a href={canvasAnnouncementsUrl} target="_blank" rel="noreferrer">
                    View All Announcements in Canvas
                  </a>
                </p>
              </div>
            </div>
          ) : (
            <ul className="announcement-items">
              {globalAnnouncements.map((a) => (
                <li key={a.id} className={`announcement-item card ${a.readState}`}>
                  {a.readState === 'unread' && <span className="unread-pill">New</span>}
                  <h3>
                    {a.htmlUrl ? (
                      <a href={a.htmlUrl} target="_blank" rel="noreferrer">
                        {a.title}
                      </a>
                    ) : (
                      a.title
                    )}
                  </h3>
                  {a.postedAt && <p className="posted-at">{formatPostedAt(a.postedAt, timeZone)}</p>}
                  {a.message && (
                    <p className="announcement-preview">
                      {a.message.length > 200 ? `${a.message.slice(0, 200)}…` : a.message}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="section-title">Course Announcements({courseUnread})</h2>

          {loading && <p className="announcements-loading">Loading course announcements…</p>}

          <ul className="course-announcement-list">
            {courseAnnouncementGroups.map((group) => {
              const expanded = expandedCourse === group.courseId;
              const hasItems = group.announcements.length > 0;

              return (
                <li key={group.courseId} className="course-group card">
                  <button
                    type="button"
                    className="course-announcement-item"
                    onClick={() =>
                      setExpandedCourse(expanded ? null : group.courseId)
                    }
                    aria-expanded={expanded}
                  >
                    <span className={`chevron ${expanded ? 'open' : ''}`}>›</span>
                    <span className="course-group-label">{group.label}</span>
                    <span className="course-count">
                      {hasItems ? `${group.announcements.length} announcement(s)` : 'No announcements'}
                    </span>
                    {group.unread > 0 && (
                      <span className="unread-badge">{group.unread}</span>
                    )}
                  </button>

                  {expanded && hasItems && (
                    <ul className="announcement-items nested">
                      {group.announcements.map((a) => (
                        <li key={a.id} className={`announcement-item ${a.readState}`}>
                          {a.readState === 'unread' && <span className="unread-pill">New</span>}
                          <h4>
                            {a.htmlUrl ? (
                              <a href={a.htmlUrl} target="_blank" rel="noreferrer">
                                {a.title}
                              </a>
                            ) : (
                              a.title
                            )}
                          </h4>
                          {a.postedAt && (
                            <p className="posted-at">{formatPostedAt(a.postedAt, timeZone)}</p>
                          )}
                          {a.message && (
                            <p className="announcement-preview">
                              {a.message.length > 280 ? `${a.message.slice(0, 280)}…` : a.message}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}

                  {expanded && !hasItems && (
                    <p className="no-course-announcements">No announcements posted for this course yet.</p>
                  )}
                </li>
              );
            })}
          </ul>

          {!loading && courseAnnouncementGroups.length === 0 && (
            <p className="announcements-empty">No courses found.</p>
          )}
        </section>
      </div>

      <p className="coach-tip">
        💡 Course announcements display in the same order as course cards on the Dashboard.{' '}
        <button type="button" className="link-btn" onClick={() => refreshData()}>
          Refresh
        </button>
      </p>
    </div>
  );
}
