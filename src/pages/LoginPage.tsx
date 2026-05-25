import { useAuth } from '../context/AuthContext';
import './LoginPage.css';

export default function LoginPage() {
  const { login, oauthConfigured, loading, authenticated } = useAuth();

  if (authenticated) {
    window.location.href = '/courses';
    return null;
  }

  return (
    <div className="login-page">
      <div className="login-card card">
        <h1 className="login-logo">K12</h1>
        <h2>K5 Launchpad</h2>
        <p>Sign in with your Stride K12 Canvas account to load courses, agenda, announcements, and teachers.</p>

        {!oauthConfigured && (
          <div className="login-warning">
            OAuth is not configured on the server. Copy <code>.env.example</code> to <code>.env</code> and add your
            Canvas developer key credentials, then restart <code>npm run dev</code>.
          </div>
        )}

        <button
          type="button"
          className="btn btn-primary login-btn"
          disabled={!oauthConfigured || loading}
          onClick={() => login()}
        >
          Sign in with Canvas
        </button>
      </div>
    </div>
  );
}
