import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { StatBand, Badge, Table, Button, useToast, EmptyState, Modal, Field } from '../components/ui.jsx';
import { analytics, councilMembers } from '../data/mock.js';
import { getUsers, handoverPosition } from '../data/usersStore.js';
import { colors } from '../theme/theme.js';

const pendingVerification = councilMembers.filter((m) => !m.verified);

const escalated = [
  { id: 'e1', from: 'Sarthak Bansal', complaint: 'Mess food quality complaint', escalatedBy: 'Mess Committee', hoursOpen: '31h', status: 'urgent' },
  { id: 'e2', from: 'Neha Kale', complaint: 'Electrical issue — hostel B', escalatedBy: 'Warden Office', hoursOpen: '26h', status: 'urgent' },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState('overview');
  const [handoverPos, setHandoverPos] = useState(null);
  const [pick, setPick] = useState('');

  if (user?.role !== 'admin') {
    return (
      <div className="wrap center">
        <h1 className="page-title">Access <em>restricted</em></h1>
        <p className="muted" style={{ marginTop: 8 }}>This dashboard is for Administrators / HOD only.</p>
      </div>
    );
  }

  const allUsers = getUsers();
  const holders = allUsers.filter((u) => u.position);
  const candidates = allUsers.filter((u) => u.role === 'student' && u.id !== user.id);

  const approve = (name) => {
    toast(`${name} verified successfully`, 'success');
  };

  const confirmHandover = (e) => {
    e.preventDefault();
    if (!handoverPos || !pick) return;
    const res = handoverPosition(handoverPos, pick);
    if (res) {
      toast(`${handoverPos} transferred — ${res.next.name} now holds it.`, 'success');
      setHandoverPos(null);
      setPick('');
    } else {
      toast('Transfer failed — check that the target is a registered student.', 'error');
    }
  };

  return (
    <div className="wrap">
      <div className="sec-head">
        <div className="schip"><span className="schip-ln" />Admin / HOD<span className="schip-ln" /></div>
        <div className="spread">
          <h1 className="page-title">Governance <em>Dashboard</em></h1>
          <Badge tone="blue" icon="shield-halved">{user.name}</Badge>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: '1.5rem' }}>
        <button className={`tab ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}><i className="fas fa-chart-pie" style={{ marginRight: 6 }} /> Analytics</button>
        <button className={`tab ${tab === 'verify' ? 'active' : ''}`} onClick={() => setTab('verify')}><i className="fas fa-user-check" style={{ marginRight: 6 }} /> Verification</button>
        <button className={`tab ${tab === 'escalations' ? 'active' : ''}`} onClick={() => setTab('escalations')}><i className="fas fa-arrow-up" style={{ marginRight: 6 }} /> Escalations</button>
        <button className={`tab ${tab === 'positions' ? 'active' : ''}`} onClick={() => setTab('positions')}><i className="fas fa-user-shield" style={{ marginRight: 6 }} /> Positions</button>
        <button className={`tab ${tab === 'audit' ? 'active' : ''}`} onClick={() => setTab('audit')}><i className="fas fa-history" style={{ marginRight: 6 }} /> Audit Log</button>
      </div>

      {tab === 'overview' && (
        <>
          <StatBand
            items={[
              { icon: 'users', num: analytics.governance[0].value, ac: '', label: analytics.governance[0].label },
              { icon: 'badge-check', num: analytics.governance[1].value, ac: '', label: analytics.governance[1].label },
              { icon: 'hourglass-half', num: analytics.governance[2].value, ac: '', label: analytics.governance[2].label },
              { icon: 'envelope', num: analytics.governance[3].value, ac: '', label: analytics.governance[3].label },
            ]}
          />
          <div className="grid-2" style={{ marginTop: '1.5rem' }}>
            <div className="card-accent">
              <div className="sec-head" style={{ marginBottom: 12 }}>
                <div className="schip"><span className="schip-ln" />Events<span className="schip-ln" /></div>
                <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '1.1rem' }}>Event <em className="blue">Analytics</em></h3>
              </div>
              <Table head={['Metric', 'Value']}>
                {analytics.events.map((e) => (
                  <tr key={e.label}><td>{e.label}</td><td className="blue" style={{ fontWeight: 800 }}>{e.value}</td></tr>
                ))}
              </Table>
            </div>
            <div className="card-accent">
              <div className="sec-head" style={{ marginBottom: 12 }}>
                <div className="schip"><span className="schip-ln" />Complaints<span className="schip-ln" /></div>
                <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '1.1rem' }}>Complaint <em className="blue">Analytics</em></h3>
              </div>
              <Table head={['Metric', 'Value']}>
                {analytics.complaints.map((e) => (
                  <tr key={e.label}><td>{e.label}</td><td className="blue" style={{ fontWeight: 800 }}>{e.value}</td></tr>
                ))}
              </Table>
            </div>
          </div>

          <div className="card-accent" style={{ marginTop: '1.5rem' }}>
            <div className="sec-head" style={{ marginBottom: 12 }}>
              <div className="schip"><span className="schip-ln" />Engagement<span className="schip-ln" /></div>
              <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '1.1rem' }}>Student <em className="blue">Engagement</em></h3>
            </div>
            <div className="grid-4">
              {[
                { label: 'Active students', v: '1,240', icon: 'graduation-cap', pct: '82% of student body' },
                { label: 'Weekly active users', v: '680', icon: 'user-clock', pct: '+12% this month' },
                { label: 'Avg sessions / user', v: '14', icon: 'signal', pct: 'per week' },
                { label: 'Event participation', v: '78%', icon: 'calendar-check', pct: 'of registrants attend' },
              ].map((k) => (
                <div key={k.label} className="card" style={{ padding: '1.3rem', textAlign: 'center' }}>
                  <i className={`fas fa-${k.icon}`} style={{ fontSize: '1.4rem', color: colors.blue, marginBottom: 8 }} />
                  <div style={{ fontFamily: "'Fraunces', serif", fontSize: '1.7rem', fontWeight: 900, color: colors.charcoal }}>{k.v}</div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: colors.charcoalMuted, textTransform: 'uppercase', letterSpacing: 1 }}>{k.label}</div>
                  <div className="faint" style={{ fontSize: '10px', marginTop: 4 }}>{k.pct}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {tab === 'verify' && (
        <>
          <div className="sec-head" style={{ marginBottom: 14 }}>
            <div className="schip"><span className="schip-ln" />Verification Chain<span className="schip-ln" /></div>
            <h2 className="page-title" style={{ fontSize: '1.2rem' }}>
              HOD / Faculty Admin <i className="fas fa-arrow-down" style={{ color: colors.blue, fontSize: '0.9rem', margin: '0 10px' }} />
              General Secretaries <i className="fas fa-arrow-down" style={{ color: colors.blue, fontSize: '0.9rem', margin: '0 10px' }} />
              Branch Representatives
            </h2>
          </div>
          {pendingVerification.length === 0 ? (
            <EmptyState icon="user-check" title="All representatives verified" />
          ) : (
            <div className="grid-3">
              {pendingVerification.map((m) => (
                <div key={m.id} className="card-accent" style={{ textAlign: 'center' }}>
                  <div style={{ width: 80, height: 80, borderRadius: '50%', margin: '0 auto 12px', background: colors.blueLight, color: colors.blueDark, fontWeight: 800, fontFamily: "'Fraunces', serif", fontSize: '1.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {m.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                  </div>
                  <div className="card-title">{m.name}</div>
                  <Badge tone="gray" icon="hourglass-half">Pending Verification</Badge>
                  <div className="muted" style={{ fontSize: '0.74rem', margin: '8px 0' }}>{m.position} · {m.branch || 'GECA'}</div>
                  <div className="row" style={{ justifyContent: 'center' }}>
                    <Button size="sm" onClick={() => approve(m.name)}><i className="fas fa-check" /> Verify</Button>
                    <Button size="sm" variant="danger"><i className="fas fa-x" /> Reject</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'escalations' && (
        <div className="grid-2">
          {escalated.map((e) => (
            <div key={e.id} className="card-accent" style={{ borderColor: 'rgba(192,57,43,.25)' }}>
              <div className="spread">
                <Badge tone="red" icon="bolt">URGENT · {e.hoursOpen}</Badge>
                <span className="faint" style={{ fontSize: '11px' }}>from {e.escalatedBy}</span>
              </div>
              <div className="card-title" style={{ marginTop: 10 }}>{e.complaint}</div>
              <p className="muted" style={{ fontSize: '0.78rem' }}>Filed by {e.from}. Auto-escalated after no response within 24h.</p>
              <div className="row" style={{ marginTop: 12 }}>
                <Button size="sm"><i className="fas fa-check" /> Assign & Resolve</Button>
                <Button size="sm" variant="ghost"><i className="fas fa-comment-dots" /> Note</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'positions' && (
        <div className="card-accent">
          <div className="sec-head" style={{ marginBottom: 12 }}>
            <div className="schip"><span className="schip-ln" />Role Addresses<span className="schip-ln" /></div>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '1.1rem' }}>
              Position <em className="blue">Handover</em>
            </h3>
            <p className="muted" style={{ fontSize: '0.78rem', maxWidth: 640 }}>
              Each post keeps a <strong>permanent role inbox</strong> (e.g. <code>cse_gs@geca.ac.in</code>).
              When the holder changes, the address stays and the new holder inherits it — the previous
              holder reverts to a student account.
            </p>
          </div>
          <Table head={['Position', 'Role Inbox', 'Current Holder', 'Action']}>
            {holders.map((h) => (
              <tr key={h.id}>
                <td style={{ fontWeight: 700 }}>{h.position}</td>
                <td><code>{h.roleEmail || '—'}</code></td>
                <td>{h.name}</td>
                <td>
                  <Button size="sm" variant="out" onClick={() => { setHandoverPos(h.position); setPick(''); }}>
                    <i className="fas fa-arrows-rotate" /> Transfer
                  </Button>
                </td>
              </tr>
            ))}
          </Table>
          {candidates.length === 0 && (
            <p className="muted" style={{ fontSize: '0.75rem', marginTop: 12 }}>
              No eligible students to hand over to — register a student account first.
            </p>
          )}
        </div>
      )}

      {tab === 'audit' && (
        <div className="card-accent">
          <div className="sec-head" style={{ marginBottom: 12 }}>
            <div className="schip"><span className="schip-ln" />Traceability<span className="schip-ln" /></div>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '1.1rem' }}>Audit <em className="blue">Log</em></h3>
          </div>
          <Table head={['Time', 'Actor', 'Action', 'Target']}>
            {[
              ['10:42 AM', 'Dr. A. V. Kulkarni', 'Verified', 'Rohit Sharma (GS)'],
              ['09:15 AM', 'Rohit Sharma', 'Verified', 'Priya Nair (BR)'],
              ['08:50 AM', 'AI Service', 'Categorized', 'Contact request #r1 → Academic'],
              ['Yesterday', 'AI Service', 'Escalated', 'Grievance g3 → Admin'],
              ['Yesterday', 'Sneha Patil', 'Approved', 'Contact request #r2'],
            ].map((r, i) => (
              <tr key={i}>
                <td className="faint">{r[0]}</td>
                <td>{r[1]}</td>
                <td className="blue" style={{ fontWeight: 700 }}>{r[2]}</td>
                <td>{r[3]}</td>
              </tr>
            ))}
          </Table>
        </div>
      )}

      <Modal open={!!handoverPos} onClose={() => setHandoverPos(null)} title={`Transfer ${handoverPos || ''}`}>
        {handoverPos && (
          <form onSubmit={confirmHandover}>
            <div style={{ background: colors.blueSoft, borderRadius: 12, padding: '10px 12px', fontSize: '11px', color: colors.charcoalSoft, marginBottom: '1rem' }}>
              <i className="fas fa-arrow-right-arrow-left" style={{ color: colors.blue, marginRight: 6 }} />
              Transferring <strong>{handoverPos}</strong>. The role inbox stays the same; the previous
              holder reverts to a student account.
            </div>
            <Field label="New holder (registered student)">
              <select className="select" value={pick} onChange={(e) => setPick(e.target.value)} required>
                <option value="">Select a student...</option>
                {candidates.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} · {c.branch || 'GECA'} · {c.roll || c.email}</option>
                ))}
              </select>
            </Field>
            <div className="row">
              <Button type="submit" disabled={!pick}><i className="fas fa-arrows-rotate" /> Confirm Transfer</Button>
              <Button variant="ghost" onClick={() => setHandoverPos(null)}>Cancel</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
