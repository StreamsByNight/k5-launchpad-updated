import { NavLink } from 'react-router-dom';
import './Sidebar.css';

const navItems = [
  { to: '/account', label: 'Account', icon: '👤' },
  { to: '/', label: 'Dashboard', icon: '📊', end: true },
  { to: '/courses', label: 'Courses', icon: '📚' },
  { to: '/groups', label: 'Groups', icon: '👥' },
  { to: '/calendar', label: 'Calendar', icon: '📅' },
  { to: '/inbox', label: 'Inbox', icon: '✉️', badge: 1 },
  { to: '/history', label: 'History', icon: '🕐' },
  { to: '/resources', label: 'Resources', icon: '🌐' },
  { to: '/studio', label: 'Studio', icon: '🖥️' },
  { to: '/help', label: 'Help', icon: '❓' },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">K12</div>
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span className="sidebar-label">{item.label}</span>
            {item.badge != null && <span className="sidebar-badge">{item.badge}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
