import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, homePathFor } from '../context/AuthContext.jsx';
import { Button, Field, ErrorNote } from '../components/ui.jsx';
import { useApi } from '../hooks/useApi.js';
import { colors } from '../theme/theme.js';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const meta = useApi('/meta');
  const [form, setForm] = useState({ fullName: '', email: '', password: '', unitCode: '', year: '1', inviteCode: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const hasInvite = form.inviteCode.trim().length > 0;

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const user = await register({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
        unitCode: form.unitCode || undefined,
        year: Number(form.year),
        inviteCode: form.inviteCode.trim() || undefined,
      });
      navigate(homePathFor(user), { replace: true });
    } catch (err) {
      setError(err);
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
        padding: '32px 16px',
        background: `radial-gradient(ellipse 80% 60% at 20% 0%, ${colors.blueSoft} 0%, transparent 60%), ${colors.whiteTint}`,
      }}
    >
      <div style={{ width: 'min(520px, 100%)' }}>
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <h1 className="page-title" style={{ fontSize: '1.6rem' }}>
            Create your <em>account</em>
          </h1>
          <p className="muted" style={{ fontSize: '0.82rem' }}>
            Register with your college email (@geca.ac.in)
          </p>
        </div>

        <div className="form-card">
          <ErrorNote error={error || meta.error} />
          <form onSubmit={submit}>
            <div className="grid-2" style={{ gap: '0 14px' }}>
              <Field label="Full Name">
                <input className="input" placeholder="e.g. Aditya Adhave" value={form.fullName} onChange={set('fullName')} required minLength={2} maxLength={150} />
              </Field>
              <Field label="College Email">
                <input type="email" className="input" placeholder="rollno@geca.ac.in" value={form.email} onChange={set('email')} required />
              </Field>
            </div>
            <Field label="Password" hint="At least 8 characters">
              <input type="password" className="input" value={form.password} onChange={set('password')} required minLength={8} autoComplete="new-password" />
            </Field>
            <div className="grid-2" style={{ gap: '0 14px' }}>
              <Field label="Branch">
                <select className="select" value={form.unitCode} onChange={set('unitCode')} required={!hasInvite}>
                  <option value="">{meta.loading ? 'Loading…' : 'Select branch'}</option>
                  {(meta.data?.units || []).map((unit) => (
                    <option key={unit.code} value={unit.code}>{unit.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Year of Study">
                <select className="select" value={form.year} onChange={set('year')}>
                  {['1', '2', '3', '4'].map((y) => <option key={y} value={y}>Year {y}</option>)}
                </select>
              </Field>
            </div>

            <Field
              label="Invite Code (council members and admins only)"
              hint="Students leave this empty. Representative and admin accounts are created only with a code issued for that position; the position then needs verification."
            >
              <input className="input" placeholder="e.g. IT-COTECH-2026" value={form.inviteCode} onChange={set('inviteCode')} maxLength={40} autoComplete="off" />
            </Field>

            <Button type="submit" lg style={{ width: '100%', marginTop: 6 }} disabled={loading}>
              {loading ? 'Creating…' : hasInvite ? 'Create Council Account' : 'Create Student Account'} <i className="fas fa-user-plus" />
            </Button>
          </form>
          <div style={{ textAlign: 'center', marginTop: 16, fontSize: '12px' }}>
            <span className="muted">Already have an account? </span>
            <Link to="/login" className="blue" style={{ fontWeight: 700, textDecoration: 'none' }}>Sign In</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
