import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function OAuthCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { handleCallback } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = params.get('code');
    const state = params.get('state');
    const err = params.get('error');

    if (err) {
      setError(params.get('error_description') ?? err);
      return;
    }
    if (!code) {
      setError('No authorization code received from Canvas.');
      return;
    }

    handleCallback(code, state)
      .then(() => navigate('/courses', { replace: true }))
      .catch((e) => setError(e instanceof Error ? e.message : 'Sign-in failed'));
  }, [params, handleCallback, navigate]);

  if (error) {
    return (
      <div className="login-page">
        <div className="login-card card">
          <h2>Sign-in failed</h2>
          <p style={{ color: 'var(--red)', margin: '16px 0' }}>{error}</p>
          <a href="/login">Try again</a>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card card">
        <p>Completing sign-in with Canvas…</p>
      </div>
    </div>
  );
}
