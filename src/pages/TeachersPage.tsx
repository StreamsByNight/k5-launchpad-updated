import { useAuth } from '../context/AuthContext';
import { useCanvasData } from '../context/CanvasDataContext';
import DataBanner from '../components/DataBanner';
import './TeachersPage.css';

export default function TeachersPage() {
  const { canvasBaseUrl } = useAuth();
  const { teachers, loading, refreshData } = useCanvasData();
  const inboxUrl = canvasBaseUrl ? `${canvasBaseUrl}/conversations` : 'https://stridek12academy.com/conversations';

  return (
    <div className="teachers-page">
      <DataBanner />
      <h1 className="page-title">My Teachers ({teachers.length})</h1>

      {loading && <p className="teachers-loading">Loading teachers from your courses…</p>}

      {!loading && teachers.length === 0 && (
        <p className="teachers-empty card">
          No teachers found on your active courses.{' '}
          <button type="button" className="link-btn" onClick={() => refreshData()}>
            Refresh
          </button>
        </p>
      )}

      <ul className="teacher-list">
        {teachers.map((t) => (
          <li key={t.id} className="teacher-card card">
            <div className="teacher-avatar" style={{ background: t.color }}>
              {t.initials}
            </div>
            <span className="teacher-name">{t.name}</span>
            <div className="teacher-contact">
              <strong>Email:</strong>{' '}
              {t.email ? (
                <a href={`mailto:${t.email}`}>{t.email}</a>
              ) : (
                <span className="no-email">
                  <a href={inboxUrl} target="_blank" rel="noreferrer">
                    Canvas Inbox
                  </a>
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>

      <p className="coach-tip">
        💡 <strong>Tip for Learning Coaches:</strong> Look for emails from your student&apos;s teachers to stay informed and communicate about your child.
      </p>
    </div>
  );
}
