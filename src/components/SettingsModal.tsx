import { useSettings } from '../context/SettingsContext';
import type { HomePage, ThemeId } from '../types';
import './SettingsModal.css';

const timeZones = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'Pacific/Honolulu',
];

const homePages: { value: HomePage; label: string }[] = [
  { value: 'courses', label: 'Courses' },
  { value: 'agenda', label: 'Agenda' },
  { value: 'announcements', label: 'Announcements' },
  { value: 'teachers', label: 'Teachers' },
];

const themes: { value: ThemeId; label: string }[] = [
  { value: 'nature', label: 'Nature (Default)' },
  { value: 'winter', label: 'Winter' },
  { value: 'space', label: 'Space' },
];

export default function SettingsModal() {
  const {
    settingsOpen,
    closeSettings,
    timeZone,
    setTimeZone,
    defaultHomePage,
    setDefaultHomePage,
    theme,
    setTheme,
  } = useSettings();

  if (!settingsOpen) return null;

  return (
    <div className="settings-overlay" onClick={closeSettings} role="presentation">
      <div className="settings-modal card" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="settings-title">
        <div className="settings-header">
          <h2 id="settings-title">Dashboard Settings</h2>
          <button type="button" className="settings-close" onClick={closeSettings} aria-label="Close">
            ×
          </button>
        </div>
        <div className="settings-body">
          <label className="settings-field">
            <span>Time Zone</span>
            <select value={timeZone} onChange={(e) => setTimeZone(e.target.value)}>
              {timeZones.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
            <small>If class times look off, double-check your time zone.</small>
          </label>
          <label className="settings-field">
            <span>Default Dashboard Home Page</span>
            <select value={defaultHomePage} onChange={(e) => setDefaultHomePage(e.target.value as HomePage)}>
              {homePages.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="settings-field">
            <legend>Dashboard Visual Theme</legend>
            <div className="theme-options">
              {themes.map((t) => (
                <label key={t.value} className="theme-option">
                  <input
                    type="radio"
                    name="theme"
                    value={t.value}
                    checked={theme === t.value}
                    onChange={() => setTheme(t.value)}
                  />
                  {t.label}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        <div className="settings-footer">
          <button type="button" className="btn btn-primary" onClick={closeSettings}>
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
}
