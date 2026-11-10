import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { StatBand, Badge, Table, Button, useToast, EmptyState, Modal, InitialsAvatar, ErrorNote, Loading, DemoDataNote } from '../components/ui.jsx';
import { useApi } from '../hooks/useApi.js';
import { api } from '../api/client.js';
import { formatDateTime } from '../lib/format.js';
import { analytics } from '../data/mock.js';
import { colors } from '../theme/theme.js';

/** Unverified members the signed-in user is allowed to verify (HOD: General Secretaries; GS: own branch). */
function VerificationPanel() {
  const toast = useToast();
  const pending = useApi('/verification/pending');
  const [target, setTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const members = pending.data?.members || [];

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/council-profiles/${target.profileId}/verify`);
      toast(`${target.fullName} is now verified`, 'success');
      setTarget(null);
      await pending.reload();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="sec-head" style={{ marginBottom: 14 }}>
        <div className="schip"><span className="schip-ln" />Verification Chain<span className="schip-ln" /></div>
        <h2 className="page-title" style={{ fontSize: '1.2rem' }}>
          HOD / Faculty Admin <i className="fas fa-arrow-right" style={{ color: colors.blue, fontSize: '0.9rem', margin: '0 10px' }} />
          General Secretaries <i className="fas fa-arrow-right" style={{ color: colors.blue, fontSize: '0.9rem', margin: '0 10px' }} />
          Branch Representatives
        </h2>
        <p className="muted" style={{ fontSize: '0.8rem' }}>Only the members you are allowed to verify are listed here.</p>
      </div>

      <ErrorNote error={pending.error} onRetry={pending.reload} />
      {pending.loading && !pending.data ? (
        <Loading />
      ) : members.length === 0 && !pending.error ? (
        <EmptyState icon="user-check" title="Nothing waiting for you" desc="Every member you can verify is already verified." />
      ) : (
        <div className="grid-3">
          {members.map((m) => (
            <div key={m.profileId} className="card-accent" style={{ textAlign: 'center' }}>
              <InitialsAvatar name={m.fullName} size={80} fontSize="1.4rem" style={{ margin: '0 auto 12px' }} />
              <Link to={`/council/${m.userId}`} className="card-title" style={{ textDecoration: 'none', display: 'block' }}>{m.fullName}</Link>
              <Badge tone="gray" icon="hourglass-half">Unverified</Badge>
              <div className="muted" style={{ fontSize: '0.74rem', margin: '8px 0 12px' }}>{m.positionTitle} · {m.council.name}</div>
              <Button size="sm" onClick={() => { setError(null); setTarget(m); }}><i className="fas fa-user-check" /> Verify this Member</Button>
            </div>
          ))}
        </div>
      )}

      <Modal open={Boolean(target)} onClose={() => setTarget(null)} title="Verify this member?">
        {target && (
          <>
            <ErrorNote error={error} />
            <p style={{ fontSize: '0.88rem', lineHeight: 1.7 }}>
              You are confirming that <strong>{target.fullName}</strong> holds the position of{' '}
              <strong>{target.positionTitle}</strong> in the <strong>{target.council.name}</strong>.
            </p>
            <p className="muted" style={{ fontSize: '0.78rem', margin: '10px 0 16px' }}>
              Verification is recorded in the audit log under your name and cannot be undone.
            </p>
            <div className="row">
              <Button onClick={confirm} disabled={busy}><i className="fas fa-check" /> {busy ? 'Verifying…' : 'Confirm Verification'}</Button>
              <Button variant="ghost" onClick={() => setTarget(null)}>Cancel</Button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}

function VerificationLog() {
  const logs = useApi('/verification/logs');
  const rows = logs.data?.logs || [];
  return (
    <div className="card-accent">
      <div className="sec-head" style={{ marginBottom: 12 }}>
        <div className="schip"><span className="schip-ln" />Traceability<span className="schip-ln" /></div>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '1.1rem' }}>Verification <em className="blue">Log</em></h3>
      </div>
      <ErrorNote error={logs.error} onRetry={logs.reload} />
      {logs.loading && !logs.data ? (
        <Loading />
      ) : rows.length === 0 ? (
        <EmptyState icon="clock-rotate-left" title="No verifications recorded yet" />
      ) : (
        <Table head={['When', 'Member', 'Position', 'Council', 'Verified by']}>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="faint">{formatDateTime(row.verifiedAt)}</td>
              <td><Link to={`/council/${row.member.id}`} style={{ color: 'inherit', fontWeight: 700 }}>{row.member.fullName}</Link></td>
              <td>{row.positionTitle}</td>
              <td>{row.councilName}</td>
              <td className="blue" style={{ fontWeight: 700 }}>{row.verifiedBy.fullName}</td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}

function DemoAnalytics() {
  return (
    <>
      <DemoDataNote />
      <StatBand items={analytics.governance.slice(0, 4).map((g, i) => ({ icon: ['users', 'circle-check', 'hourglass-half', 'envelope'][i], num: g.value, ac: '', label: g.label }))} />
      <div className="grid-2" style={{ marginTop: '1.5rem' }}>
        {[['Event', analytics.events], ['Complaint', analytics.complaints]].map(([title, rows]) => (
          <div className="card-accent" key={title}>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '1.1rem', marginBottom: 12 }}>{title} <em className="blue">Analytics</em></h3>
            <Table head={['Metric', 'Value']}>
              {rows.map((e) => (
                <tr key={e.label}><td>{e.label}</td><td className="blue" style={{ fontWeight: 800 }}>{e.value}</td></tr>
              ))}
            </Table>
          </div>
        ))}
      </div>
    </>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  const [tab, setTab] = useState('verify');

  if (!isAdmin && !user.canVerify) {
    return (
      <div className="wrap center">
        <h1 className="page-title">Access <em>restricted</em></h1>
        <p className="muted" style={{ marginTop: 8 }}>This area is for administrators and verified General Secretaries.</p>
      </div>
    );
  }

  const tabs = [
    ['verify', 'user-check', 'Verification'],
    ...(isAdmin ? [['audit', 'history', 'Verification Log'], ['overview', 'chart-pie', 'Analytics']] : []),
  ];

  return (
    <div className="wrap">
      <div className="sec-head">
        <div className="schip"><span className="schip-ln" />{isAdmin ? 'Admin / HOD' : 'General Secretary'}<span className="schip-ln" /></div>
        <div className="spread">
          <h1 className="page-title">{isAdmin ? <>Governance <em>Dashboard</em></> : <>Member <em>Verification</em></>}</h1>
          <Badge tone="blue" icon="shield-halved">{user.name}</Badge>
        </div>
      </div>

      {tabs.length > 1 && (
        <div className="tabs" style={{ marginBottom: '1.5rem' }}>
          {tabs.map(([key, icon, label]) => (
            <button key={key} className={`tab ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>
              <i className={`fas fa-${icon}`} style={{ marginRight: 6 }} /> {label}
            </button>
          ))}
        </div>
      )}

      {tab === 'verify' && <VerificationPanel />}
      {tab === 'audit' && isAdmin && <VerificationLog />}
      {tab === 'overview' && isAdmin && <DemoAnalytics />}
    </div>
  );
}
