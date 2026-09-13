import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Boxes, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import Spinner from '../components/Spinner';
import ThemeToggle from '../components/ThemeToggle';

export default function Login() {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const [needsSetup, setNeedsSetup] = useState(false);
  const [checking, setChecking] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get('/auth/setup-status')
      .then((res) => setNeedsSetup(res.data.needsSetup))
      .catch(() => setNeedsSetup(false))
      .finally(() => setChecking(false));
  }, []);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (needsSetup) {
        await register(name, email, password);
      } else {
        await login(email, password);
      }
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-toggle">
        <ThemeToggle compact />
      </div>
      <div className="login-card">
        <div className="login-brand">
          <div className="login-logo">
            <Boxes size={20} />
          </div>
          <span className="login-brand-name">
            Store<span style={{ color: 'var(--accent-cyan)' }}>Flow</span>
          </span>
        </div>
        <p className="login-tagline">Point of sale, inventory &amp; invoicing for any kind of store.</p>

        {checking ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 30 }}>
            <Spinner />
          </div>
        ) : (
          <form onSubmit={submit} className="login-form">
            {needsSetup && (
              <div style={{ background: 'var(--chip-soon-bg)', border: '1px solid var(--chip-soon-border)', borderRadius: 8, padding: '10px 12px', fontSize: 12.5, color: 'var(--text-info)', marginBottom: 4 }}>
                First time here — create your store admin account.
              </div>
            )}
            {needsSetup && (
              <div>
                <label>Full name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your full name" required />
              </div>
            )}
            <div>
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email address" required />
            </div>
            <div>
              <label>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  minLength={6}
                  required
                  style={{ paddingRight: 38 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-muted)', padding: 4 }}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            {error && <div style={{ color: 'var(--text-error)', fontSize: 12.5 }}>{error}</div>}
            <button type="submit" className="btn btn-primary" disabled={busy} style={{ justifyContent: 'center', padding: '11px 16px', fontSize: 14 }}>
              {busy ? 'Please wait…' : needsSetup ? 'Create admin account' : 'Sign in'}
            </button>
          </form>
        )}
      </div>

      <style>{`
        .login-page {
          min-height: 100vh; display: flex; align-items: center; justify-content: center;
          background: radial-gradient(1200px 600px at 50% -10%, var(--accent-cyan-dim), transparent), var(--bg-void);
          padding: 20px; position: relative;
        }
        .login-toggle { position: absolute; top: 20px; right: 20px; }
        .login-card {
          width: 100%; max-width: 400px; background: var(--bg-panel); border: 1px solid var(--border-hairline-soft);
          border-radius: var(--radius-lg); padding: 34px 30px; box-shadow: 0 24px 60px rgba(0,0,0,0.3);
        }
        .login-brand { display: flex; align-items: center; gap: 10px; justify-content: center; }
        .login-logo {
          width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, var(--accent-cyan), var(--accent-violet)); color: var(--text-on-accent);
        }
        .login-brand-name { font-family: var(--font-display); font-size: 22px; font-weight: 700; }
        .login-tagline { text-align: center; color: var(--text-secondary); font-size: 13px; margin: 10px 0 26px; }
        .login-form { display: flex; flex-direction: column; gap: 16px; }
        .login-hint { text-align: center; font-size: 12px; color: var(--text-muted); margin-top: 20px; }
      `}</style>
    </div>
  );
}
