import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DataBanner from '../components/DataBanner';
import { StatusIcon } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { useCanvasData } from '../context/CanvasDataContext';
import { useSettings } from '../context/SettingsContext';
import {
  addDays,
  formatLongDate,
  formatShortDate,
  fromDateKey,
  isDateInRange,
  todayKey,
  weekRange,
} from '../utils/dates';
import './AgendaPage.css';

type AgendaTab = 'daily' | 'weekly' | 'past-due';

export default function AgendaPage() {
  const { timeZone } = useSettings();
  const { userName } = useAuth();
  const { agenda } = useCanvasData();
  const [tab, setTab] = useState<AgendaTab>('daily');
  const today = todayKey(timeZone);
  const [selectedDate, setSelectedDate] = useState(today);

  const displayName =
    userName?.includes(',') ? userName.split(',')[1]?.trim() : userName?.split(' ')[0] ?? 'there';
  const todayDate = fromDateKey(today);

  const pastDueCount = agenda.filter((i) => i.isPastDue).length;

  const filtered = useMemo(() => {
    if (tab === 'past-due') return agenda.filter((i) => i.isPastDue);
    if (tab === 'daily') return agenda.filter((i) => i.date === selectedDate && !i.isPastDue);
    const { start, end } = weekRange(selectedDate, timeZone);
    return agenda.filter((i) => isDateInRange(i.date, start, end) && !i.isPastDue);
  }, [tab, selectedDate, agenda, timeZone]);

  const shiftDate = (days: number) => {
    setSelectedDate(addDays(selectedDate, days, timeZone));
  };

  return (
    <div className="agenda-page">
      <DataBanner />
      <div className="agenda-header-row">
        <h1 className="page-title">My Agenda</h1>
        <p className="agenda-today">Today&apos;s Date: {formatLongDate(todayDate, timeZone)}</p>
      </div>

      <div className="agenda-tabs">
        <button type="button" className={tab === 'daily' ? 'active' : ''} onClick={() => setTab('daily')}>
          Daily Plan
        </button>
        <button type="button" className={tab === 'weekly' ? 'active' : ''} onClick={() => setTab('weekly')}>
          Weekly Plan
        </button>
        <button type="button" className={tab === 'past-due' ? 'active' : ''} onClick={() => setTab('past-due')}>
          Past Due
          {pastDueCount > 0 && <span className="agenda-badge">{pastDueCount}</span>}
        </button>
      </div>

      {tab !== 'past-due' && (
        <div className="agenda-date-picker card">
          <button type="button" onClick={() => shiftDate(-1)} aria-label="Previous day">
            ‹
          </button>
          <span>{formatShortDate(fromDateKey(selectedDate), timeZone)}</span>
          <button type="button" onClick={() => shiftDate(1)} aria-label="Next day">
            ›
          </button>
          <button type="button" className="today-btn" onClick={() => setSelectedDate(today)} title="Go to today">
            📅
          </button>
        </div>
      )}

      <div className="agenda-layout">
        <div className="agenda-list card">
          <div className="agenda-list-header">
            <span>Items ({filtered.length})</span>
            <span>Requirement Status</span>
          </div>
          {filtered.map((item) => (
            <div key={item.id} className="agenda-item">
              <div className="agenda-item-main">
                {item.type === 'class-connect' ? (
                  <Link
                    to={`/class-connect/${item.id}`}
                    state={{ title: item.title, time: item.time, htmlUrl: item.htmlUrl }}
                    className="agenda-item-title link"
                  >
                    {item.title}
                  </Link>
                ) : item.htmlUrl ? (
                  <a href={item.htmlUrl} target="_blank" rel="noreferrer" className="agenda-item-title link">
                    {item.title}
                  </a>
                ) : (
                  <strong className="agenda-item-title">{item.title}</strong>
                )}
                {item.subtitle && <p className="agenda-item-sub">{item.subtitle}</p>}
                {item.time && <p className="agenda-item-time">{item.time}</p>}
                {item.type === 'class-connect' && (
                  <p className="agenda-connect-hint">
                    <Link to={`/class-connect/${item.id}`} state={{ title: item.title, time: item.time, htmlUrl: item.htmlUrl }}>
                      Click to view Class Connect session →
                    </Link>
                  </p>
                )}
              </div>
              <div className="agenda-item-actions">
                <StatusIcon status={item.status} />
                {item.status !== 'Completed' && item.htmlUrl && (
                  <a href={item.htmlUrl} target="_blank" rel="noreferrer" className="btn btn-success">
                    Open
                  </a>
                )}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="agenda-empty">No items for this view. Great job staying on track!</p>
          )}
        </div>

        <aside className="agenda-mascot">
          <div className="mascot-bubble">Hi, {displayName}</div>
          <div className="mascot-fox">🦊</div>
        </aside>
      </div>

      <p className="coach-tip">
        💡 <strong>Tip for Learning Coaches:</strong> Encourage your learner to start each day by opening the Agenda to see what&apos;s scheduled.
      </p>
    </div>
  );
}
