import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { Badge, Chip, Card, Button, Field, useToast, Modal } from '../components/ui.jsx';
import { colors } from '../theme/theme.js';
import { updateProfile } from '../data/usersStore.js';

export default function Profile() {
  const { user } = useAuth();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', branch: '', year: '', roll: '' });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  if (!user) {
    return (
      <div className="wrap center">
        <h1 className="page-title">Not <em>signed in</em></h1>
      </div>
    );
  }

  const openEdit = () => {
    setForm({ name: user.name || '', branch: user.branch || '', year: user.year || '', roll: user.roll || '' });
    setEditing(true);
  };

  const save = (e) => {
    e.preventDefault();
    const patch = { name: form.name.trim() || user.name };
    if (user.role === 'student') {
      patch.branch = form.branch || user.branch;
      patch.year = form.year ? Number(form.year) : user.year;
      patch.roll = form.roll || user.roll;
    }
    updateProfile(user.id, patch);
    toast('Profile updated', 'success');
    setEditing(false);
  };

  return (
    <div className="wrap" style={{ maxWidth: 760 }}>
      <div className="sec-head">
        <div className="schip"><span className="schip-ln" />Account<span className="schip-ln" /></div>
        <div className="spread">
          <h1 className="page-title">My <em>Profile</em></h1>
          <Button variant="out" size="sm" onClick={openEdit}><i className="fas fa-pen" /> Edit Profile</Button>
        </div>
      </div>

      <Card accent pad style={{ textAlign: 'center' }}>
        <div style={{ width: 110, height: 110, borderRadius: '50%', margin: '0 auto 16px', background: colors.blueLight, color: colors.blueDark, fontFamily: "'Fraunces', serif", fontWeight: 900, fontSize: '2.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '4px solid #fff', boxShadow: '0 10px 32px rgba(0,0,0,.12), 0 0 0 8px rgba(34,102,237,.07)' }}>
          {user.name.slice(0, 2)}
        </div>
        <h1 className="page-title" style={{ fontSize: '1.5rem' }}>{user.name}</h1>
        <div className="row" style={{ justifyContent: 'center', margin: '10px 0' }}>
          <Badge tone="blue" icon="envelope">{user.email}</Badge>
          <Badge tone={user.verified ? 'green' : 'gold'} icon={user.verified ? 'badge-check' : 'hourglass-half'}>
            {user.verified ? 'Verified' : 'Pending Verification'}
          </Badge>
        </div>
        {user.position && <Chip blue icon="medal">{user.position}</Chip>}
      </Card>

      <div className="grid-2" style={{ marginTop: '1.5rem' }}>
        <Card pad>
          <h3 style={{ fontFamily: "'Fraunces', serif", marginBottom: 14 }}>Details</h3>
          {[
            ['Branch', user.branch || 'GECA'],
            ['Year', user.year ? `Year ${user.year}` : 'College Administration'],
            ['Roll Number', user.roll || '—'],
            ['Role', user.role],
          ].map(([k, v]) => (
            <div key={k} className="spread" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <span className="muted" style={{ fontSize: '0.78rem' }}>{k}</span>
              <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>{v}</span>
            </div>
          ))}
          {user.roleEmail && (
            <div className="spread" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <span className="muted" style={{ fontSize: '0.78rem' }}>Role inbox</span>
              <span style={{ fontSize: '0.82rem', fontWeight: 700 }} className="blue">
                <i className="fas fa-envelope-circle-check" style={{ marginRight: 5 }} />
                <code style={{ fontSize: '12px' }}>{user.roleEmail}</code>
              </span>
            </div>
          )}
        </Card>
        <Card pad>
          <h3 style={{ fontFamily: "'Fraunces', serif", marginBottom: 14 }}>Access</h3>
          <p className="muted" style={{ fontSize: '0.8rem', lineHeight: 1.7 }}>
            Your account uses role-based access control (RBAC) with Row-Level Security.
            Verification actions and communications are permanently audit-logged for institutional
            accountability.
          </p>
          <div className="row" style={{ marginTop: 12, gap: 6 }}>
            <Badge tone="blue" icon="shield-halved">JWT Secured</Badge>
            <Badge tone="green" icon="lock">RLS Enabled</Badge>
          </div>
          {user.roleEmail && (
            <div style={{ marginTop: 14, background: colors.blueSoft, borderRadius: 12, padding: '10px 12px', fontSize: '11px', color: colors.charcoalSoft }}>
              <i className="fas fa-arrow-right-arrow-left" style={{ color: colors.blue, marginRight: 6 }} />
              Your <strong>{user.position}</strong> inbox <code>{user.roleEmail}</code> is a <strong>role address</strong> —
              it stays with the post, not the person. When this position changes hands, the address stays
              and the new holder inherits it.
            </div>
          )}
        </Card>
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} title="Edit Profile">
        <form onSubmit={save}>
          <Field label="Name">
            <input className="input" value={form.name} onChange={set('name')} required />
          </Field>
          {user.role === 'student' && (
            <>
              <Field label="Branch">
                <input className="input" value={form.branch} onChange={set('branch')} placeholder="e.g. Computer Science" />
              </Field>
              <div className="grid-2" style={{ gap: '0 14px' }}>
                <Field label="Year">
                  <input type="number" min={1} max={5} className="input" value={form.year} onChange={set('year')} />
                </Field>
                <Field label="Roll Number">
                  <input className="input" value={form.roll} onChange={set('roll')} placeholder="e.g. CS23112" />
                </Field>
              </div>
            </>
          )}
          {user.roleEmail && (
            <div style={{ background: colors.blueSoft, borderRadius: 12, padding: '10px 12px', fontSize: '11px', color: colors.charcoalSoft, marginBottom: '1rem' }}>
              <i className="fas fa-lock" style={{ color: colors.blue, marginRight: 6 }} />
              Role inbox <code>{user.roleEmail}</code> is permanent and cannot be changed here.
            </div>
          )}
          <div className="row">
            <Button type="submit"><i className="fas fa-check" /> Save Changes</Button>
            <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
