import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, homePathFor } from '../context/AuthContext.jsx';
import { Button, Field } from '../components/ui.jsx';
import { colors } from '../theme/theme.js';

// Seeded by the backend in development (backend/src/db/seed.js). Hidden in production builds.
const DEMO_PASSWORD = 'demo1234';
const demoAccounts = import.meta.env.DEV
  ? [
      { email: 'student@geca.ac.in', role: 'Student (IT, 3rd year)' },
      { email: 'it_cr3@geca.ac.in', role: 'Class Representative (IT)' },
      { email: 'it_gs@geca.ac.in', role: 'General Secretary (IT)' },
      { email: 'hod@geca.ac.in', role: 'Admin / HOD' },
    ].map((account) => ({ ...account, password: DEMO_PASSWORD }))
  : [];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await login(email.trim(), password);
      navigate(homePathFor(user), { replace: true });
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        background: `radial-gradient(ellipse 80% 60% at 20% 0%, ${colors.blueSoft} 0%, transparent 60%), ${colors.whiteTint}`,
      }}
    >
      <div style={{ width: 'min(440px, 100%)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div
            style={{
              width: 62,
              height: 62,
              borderRadius: 18,
              background: 'linear-gradient(135deg, #2266ED, #3b7af8)',
              color: '#fff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: "'Fraunces', serif",
              fontWeight: 900,
              fontSize: 20,
              boxShadow: '0 10px 30px rgba(34,102,237,.35)',
              marginBottom: 14,
            }}
          >
            CC
          </div>
          <h1 className="page-title" style={{ fontSize: '1.7rem' }}>
            Council<em>Connect</em>
          </h1>
          <p className="muted" style={{ fontSize: '0.82rem' }}>
            Sign in with your institutional email
          </p>
        </div>

        <div className="form-card">
          {error && (
            <div
              style={{
                background: '#fdeaea',
                color: '#c0392b',
                borderRadius: 12,
                padding: '10px 14px',
                fontSize: '12px',
                fontWeight: 600,
                marginBottom: 14,
                border: '1px solid #f0c4c4',
              }}
            >
              {error}
            </div>
          )}
          <form onSubmit={submit}>
            <Field label="Institutional Email">
              <input
                type="email"
                className="input"
                placeholder="rollno@geca.ac.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>
            <Field label="Password">
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Field>
            <Button type="submit" lg style={{ width: '100%', marginTop: 6 }} disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
              <i className="fas fa-arrow-right" />
            </Button>
          </form>
          <div style={{ textAlign: 'center', marginTop: 18, fontSize: '12px' }}>
            <span className="muted">New to CouncilConnect? </span>
            <Link to="/register" className="blue" style={{ fontWeight: 700, textDecoration: 'none' }}>
              Create an account
            </Link>
          </div>
        </div>

        {demoAccounts.length > 0 && (
        <div
          className="card"
          style={{ marginTop: 18, padding: '14px 18px', background: colors.blueSoft, borderColor: 'rgba(34,102,237,.15)' }}
        >
          <div style={{ fontSize: '11px', fontWeight: 700, color: colors.blueDark, marginBottom: 8 }}>
            <i className="fas fa-flask" style={{ marginRight: 6 }} /> Demo accounts (development only)
          </div>
          {demoAccounts.map((d) => (
            <div
              key={d.email}
              className="row"
              style={{
                justifyContent: 'space-between',
                padding: '7px 0',
                borderBottom: '1px solid rgba(34,102,237,.08)',
                cursor: 'pointer',
              }}
              onClick={() => {
                setEmail(d.email);
                setPassword(d.password);
              }}
            >
              <span style={{ fontSize: '11px', color: colors.charcoalMuted }}>
                {d.role}
                <br />
                <code style={{ fontSize: '10px' }}>{d.email}</code>
              </span>
              <Button variant="out" size="sm" type="button" onClick={() => { setEmail(d.email); setPassword(d.password); }}>
                Use
              </Button>
            </div>
          ))}
        </div>
        )}

      </div>
    </div>
  );
}
