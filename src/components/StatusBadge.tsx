import type { RequirementStatus } from '../types';

const statusClass: Record<RequirementStatus, string> = {
  Completed: 'status-completed',
  'In Progress': 'status-in-progress',
  'Past Due': 'status-past-due',
  'Not Started': 'status-not-started',
  Mastered: 'status-mastered',
  'Not Mastered': 'status-not-started',
};

const statusIcon: Record<RequirementStatus, string> = {
  Completed: '✓',
  'In Progress': '◐',
  'Past Due': '!',
  'Not Started': '☆',
  Mastered: '★',
  'Not Mastered': '○',
};

export function StatusIcon({ status }: { status: RequirementStatus }) {
  return (
    <span className={`status-badge ${statusClass[status]}`} title={status}>
      {statusIcon[status]} {status}
    </span>
  );
}

export function StatusDot({ status }: { status: RequirementStatus }) {
  const colors: Record<RequirementStatus, string> = {
    Completed: '#2e7d32',
    'In Progress': '#2e7d32',
    'Past Due': '#c62828',
    'Not Started': '#9e9e9e',
    Mastered: '#f9a825',
    'Not Mastered': '#9e9e9e',
  };
  return (
    <span
      className="status-dot"
      style={{ background: colors[status] }}
      title={status}
    >
      {statusIcon[status]}
    </span>
  );
}
