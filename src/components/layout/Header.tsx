import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import SettingsModal from '../SettingsModal';
import './Header.css';

const tabs = [
  { to: '/courses', label: 'Courses' },
  { to: '/agenda', label: 'Agenda' },
  { to: '/announcements', label: 'Announcements' },
  { to: '/teachers', label: 'Teachers' },
];

export default function Header() {
  const { openSettings } = useSettings();
  const { authenticated, userName, logout, loading } = useAuth();
  const displayName = userName ?? 'Student';

  return (
    <>
      <header className="header">
        <div className="header-left">
          <span className="header-logo">K12</span>
          <nav className="header-tabs">
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) => `header-tab ${isActive ? 'active' : ''}`}
              >
                {tab.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="header-right">
          <span className="header-user">👤 {displayName}</span>
          <span className="header-divider">|</span>
          {!loading && (
            authenticated ? (
              <button type="button" className="btn btn-outline header-signout" onClick={() => logout()}>
                Sign out
              </button>
            ) : (
              <Link to="/login" className="btn btn-outline header-signout">
                Sign in
              </Link>
            )
          )}
          <button type="button" className="btn btn-primary header-settings" onClick={openSettings}>
            ⚙ Settings
          </button>
        </div>
      </header>
      <SettingsModal />
    </>
  );
}
