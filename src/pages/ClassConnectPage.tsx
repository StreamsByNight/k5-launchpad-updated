import { Link, useLocation, useParams } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import './ClassConnectPage.css';

interface LocationState {
  title?: string;
  time?: string;
  htmlUrl?: string;
}

export default function ClassConnectPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const location = useLocation();
  const { timeZone } = useSettings();
  const state = (location.state as LocationState) ?? {};

  const title = state.title ?? '👩‍💻 Live Class Connect';
  const joinUrl = state.htmlUrl ?? '#join';
  const sessionTime =
    state.time ??
    new Date().toLocaleString('en-US', {
      timeZone,
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

  return (
    <div className="class-connect-page">
      <nav className="breadcrumb">
        <Link to="/agenda">Agenda</Link>
        <span> › Calendar Events › </span>
        <span>{title}</span>
      </nav>

      <div className="class-connect-header">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="session-time">{sessionTime}</p>
          <p className="join-cta">
            <a href={joinUrl} target="_blank" rel="noreferrer" className="join-link">
              Click HERE to enter Class Connect
            </a>
          </p>
          <p className="playback-note">
            Missed a session? Check the Playback Room for recordings (if available) through the event link above.
          </p>
          {sessionId && <p className="session-id">Event ID: {sessionId}</p>}
        </div>
        <Link to="/agenda" className="back-calendar">
          ← Back to Calendar
        </Link>
      </div>

      <p className="coach-tip">
        💡 <strong>Tip for Learning Coaches:</strong> If your learner misses a session, remind them to check the Playback Room for recordings.
      </p>
    </div>
  );
}
