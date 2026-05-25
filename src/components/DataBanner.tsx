import { useCanvasData } from '../context/CanvasDataContext';
import './DataBanner.css';

export default function DataBanner() {
  const { loading, error, refreshData } = useCanvasData();

  if (loading) {
    return <div className="data-banner loading">Loading from Canvas…</div>;
  }

  if (error) {
    return (
      <div className="data-banner error">
        {error}
        <button type="button" onClick={() => refreshData()}>
          Retry
        </button>
      </div>
    );
  }

  return <div className="data-banner live">Live data from Canvas · dates use your timezone setting</div>;
}
