import { Link } from 'react-router-dom';

export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div>
      <h1 className="page-title">{title}</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
        This section connects to your K12 platform. Use the main dashboard tabs for daily learning.
      </p>
      <Link to="/courses">← Back to Dashboard</Link>
    </div>
  );
}
