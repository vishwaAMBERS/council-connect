import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Button, Field } from '../components/ui.jsx';
import { branches, departmentCodes, roleEmail, positionSlugs, institutionPositions } from '../data/mock.js';
import { colors } from '../theme/theme.js';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    branch: '',
    year: '1',
    roll: '',
    applyingAs: 'student',
    repPosition: '',
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const previewEmail =
    form.applyingAs === 'rep' && form.branch && form.repPosition
      ? roleEmail(form.branch, form.repPosition)
      : null;

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    await register(form);
    setMsg(form.applyingAs === 'rep'
      ? 'Account created. Your representative position is pending verification by the HOD.'
      : 'Account created. Welcome to CouncilConnect!');
    setLoading(false);
    setTimeout(() => navigate('/'), 900);
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
            Register with your institutional email to join the campus ecosystem
          </p>
        </div>

        <div className="form-card">
          {msg && (
            <div
              style={{
                background: '#e6f6ec',
                color: '#1d7a46',
                borderRadius: 12,
                padding: '10px 14px',
                fontSize: '12px',
                fontWeight: 600,
                marginBottom: 14,
                border: '1px solid rgba(29,122,70,.2)',
              }}
            >
              {msg}
            </div>
          )}
          <form onSubmit={submit}>
            <div className="grid-2" style={{ gap: '0 14px' }}>
              <Field label="Full Name">
                <input className="input" placeholder="e.g. Aditya Adhave" value={form.name} onChange={set('name')} required />
              </Field>
              <Field label="Institutional Email">
                <input type="email" className="input" placeholder="rollno@geca.ac.in" value={form.email} onChange={set('email')} required />
              </Field>
            </div>
            <Field label="Password">
              <input type="password" className="input" placeholder="Min 8 characters" value={form.password} onChange={set('password')} required minLength={8} />
            </Field>
            <div className="grid-2" style={{ gap: '0 14px' }}>
              <Field label="Branch">
                <select className="select" value={form.branch} onChange={set('branch')} required>
                  <option value="">Select branch</option>
                  {branches.map((b) => <option key={b}>{b}</option>)}
                </select>
              </Field>
              <Field label="Year">
                <select className="select" value={form.year} onChange={set('year')}>
                  {['1', '2', '3', '4'].map((y) => <option key={y}>Year {y}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid-2" style={{ gap: '0 14px' }}>
              <Field label="Roll Number">
                <input className="input" placeholder="e.g. CS23112" value={form.roll} onChange={set('roll')} required />
              </Field>
              <Field label="I am registering as">
                <select className="select" value={form.applyingAs} onChange={set('applyingAs')}>
                  <option value="student">Student</option>
                  <option value="rep">Representative (needs verification)</option>
                </select>
              </Field>
            </div>

            {form.applyingAs === 'rep' && (
              <>
                <Field label="Position applying for">
                  <select className="select" value={form.repPosition} onChange={set('repPosition')}>
                    <option value="">Select position</option>
                    {Object.keys(positionSlugs).filter((p) => !institutionPositions.includes(p)).map((p) => <option key={p}>{p}</option>)}
                  </select>
                </Field>
                {previewEmail ? (
                  <div
                    style={{
                      background: colors.blueSoft,
                      border: '1.5px dashed rgba(34,102,237,.35)',
                      borderRadius: 14,
                      padding: '12px 14px',
                      marginBottom: '1rem',
                      fontSize: '12px',
                      color: colors.charcoalSoft,
                    }}
                  >
                    <div style={{ fontWeight: 800, color: colors.blueDark, marginBottom: 4 }}>
                      <i className="fas fa-envelope-circle-check" style={{ marginRight: 6 }} />
                      Your role inbox: <code style={{ fontSize: '12px' }}>{previewEmail}</code>
                    </div>
                    <p style={{ fontSize: '11px', margin: 0 }}>
                      This is a <strong>forwarding address</strong>, not a personal mailbox. It always stays
                      <strong> {previewEmail}</strong> — even if you leave the post, the next{' '}
                      {form.repPosition} inherits it. Messages sent here are routed to whoever currently
                      holds the position.
                    </p>
                  </div>
                ) : (
                  <div style={{ fontSize: '11px', color: colors.charcoalMuted, marginBottom: '1rem' }}>
                    <i className="fas fa-info-circle" style={{ color: colors.blue, marginRight: 6 }} />
                    Pick a branch and position to preview your permanent role email (e.g. it_gs@geca.ac.in).
                  </div>
                )}
              </>
            )}
            <Button type="submit" lg style={{ width: '100%', marginTop: 6 }} disabled={loading}>
              {loading ? 'Creating...' : 'Create Account'} <i className="fas fa-user-plus" />
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
