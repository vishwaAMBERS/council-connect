import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Badge, Table, Button, useToast, EmptyState, Modal, Field, InitialsAvatar, ErrorNote, Loading } from '../components/ui.jsx';
import { useApi } from '../hooks/useApi.js';
import { api } from '../api/client.js';
import { formatDateTime } from '../lib/format.js';
import { colors } from '../theme/theme.js';
import AdminAnalytics from './AdminAnalytics.jsx';

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
              <InitialsAvatar name={m.fullName} src={m.avatarUrl} size={80} fontSize="1.4rem" style={{ margin: '0 auto 12px' }} />
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

const ENTITY_LABEL = { member: 'Verification', request: 'Contact requests', event: 'Events', grievance: 'Complaints', archive: 'Archive', account: 'Accounts' };
const actionLabel = (action) => {
  const [entity, verb] = action.split('.');
  return `${ENTITY_LABEL[entity] || entity}: ${verb.replace(/_/g, ' ')}`;
};

/** Who did what, when: verifications, request decisions, events, complaint handling, archive runs. */
function AuditLog() {
  const [entity, setEntity] = useState('');
  const logs = useApi(`/audit-logs${entity ? `?entity=${entity}` : ''}`);
  const rows = logs.data?.logs || [];

  return (
    <div className="card-accent">
      <div className="spread" style={{ marginBottom: 12, gap: 12, flexWrap: 'wrap' }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '1.1rem' }}>Audit <em className="blue">Log</em></h3>
        <select className="select" value={entity} onChange={(e) => setEntity(e.target.value)} aria-label="Filter by area" style={{ width: 'auto', minWidth: 180 }}>
          <option value="">All activity</option>
          {(logs.data?.entities || []).map((key) => <option key={key} value={key}>{ENTITY_LABEL[key] || key}</option>)}
        </select>
      </div>
      <ErrorNote error={logs.error} onRetry={logs.reload} />
      {logs.loading && !logs.data ? (
        <Loading />
      ) : rows.length === 0 ? (
        <EmptyState icon="clock-rotate-left" title="Nothing recorded yet" />
      ) : (
        <>
          <Table head={['When', 'Who', 'Action', 'Details']}>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="faint" style={{ whiteSpace: 'nowrap' }}>{formatDateTime(row.createdAt)}</td>
                <td style={{ fontWeight: 700 }}>{row.actorName}</td>
                <td className="blue" style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{actionLabel(row.action)}</td>
                <td style={{ overflowWrap: 'anywhere' }}>
                  {row.entityType === 'grievance' && row.entityId ? <Link to={`/grievances/${row.entityId}`} style={{ color: 'inherit' }}>{row.summary}</Link> : row.summary}
                </td>
              </tr>
            ))}
          </Table>
          <p className="faint" style={{ fontSize: '11px', marginTop: 10 }}>Showing the latest {rows.length} entries. Entries cannot be edited or deleted.</p>
        </>
      )}
    </div>
  );
}

/** Suggests the year that is ending: July to June, so November 2026 is in 2026-27. */
function currentAcademicYear() {
  const now = new Date();
  const start = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}

/** End-of-year action: archive the whole council and clear the directory for the next one. */
function AcademicYear() {
  const { refreshUser } = useAuth();
  const toast = useToast();
  const preview = useApi('/archive/preview');
  const [year, setYear] = useState(currentAcademicYear());
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const active = preview.data?.activeProfiles ?? 0;
  const alreadyArchived = (preview.data?.archivedYears || []).includes(year);

  const run = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await api.post('/archive/run', { academicYear: year });
      toast(`Archived ${result.archived} council seats for ${result.academicYear}`, 'success');
      setOpen(false);
      setTyped('');
      await preview.reload();
      refreshUser().catch(() => {});
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card-accent" style={{ maxWidth: 720 }}>
      <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '1.1rem' }}>Close the academic <em className="blue">year</em></h3>
      <p className="muted" style={{ fontSize: '0.84rem', lineHeight: 1.7, margin: '8px 0 14px' }}>
        At the end of the year, every active council seat is copied into the archive with its term, verification record and activity
        counts. The seats are then closed, their holders return to ordinary student accounts, and the directory is empty for the
        incoming council. Archived records cannot be changed.
      </p>
      <ErrorNote error={preview.error} onRetry={preview.reload} />
      {preview.data && (
        <>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            <Badge tone="blue" icon="users">{active} active council seat{active === 1 ? '' : 's'}</Badge>
            {preview.data.archivedYears.map((y) => <Badge key={y} tone="gray" icon="box-archive">{y} archived</Badge>)}
            <Link to="/archive" className="btn-ghost btn-sm">Browse the archive</Link>
          </div>
          <div className="row" style={{ gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <Field label="Academic year that is ending" hint="Format: 2026-27">
              <input className="input" value={year} onChange={(e) => setYear(e.target.value.trim())} pattern="\d{4}-\d{2}" maxLength={7} style={{ width: 160 }} />
            </Field>
            <div style={{ marginBottom: '1rem' }}>
              <Button variant="danger" disabled={active === 0 || !/^\d{4}-\d{2}$/.test(year)} onClick={() => { setError(null); setTyped(''); setOpen(true); }}>
                <i className="fas fa-box-archive" /> Archive council and start new year
              </Button>
            </div>
          </div>
          {active === 0 && <p className="faint" style={{ fontSize: '0.78rem' }}>There are no active council members to archive.</p>}
          {alreadyArchived && active > 0 && (
            <p style={{ fontSize: '0.78rem', color: '#9a6b14', fontWeight: 600 }}>
              <i className="fas fa-triangle-exclamation" style={{ marginRight: 6 }} />
              {year} already has archived records. Running it again adds the current members to the same year.
            </p>
          )}
        </>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={`Close academic year ${year}?`}>
        <form onSubmit={run}>
          <ErrorNote error={error} />
          <p style={{ fontSize: '0.88rem', lineHeight: 1.7 }}>
            This archives <strong>{active} council seat{active === 1 ? '' : 's'}</strong> under <strong>{year}</strong>, removes all of
            them from the directory, and turns their holders back into student accounts.
          </p>
          <p style={{ fontSize: '0.82rem', margin: '10px 0 14px', color: '#c0392b', fontWeight: 600 }}>
            This cannot be undone. New council members must register with invite codes and be verified again.
          </p>
          <Field label={`Type ${year} to confirm`}>
            <input className="input" value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus autoComplete="off" />
          </Field>
          <div className="row">
            <Button type="submit" variant="danger" disabled={busy || typed.trim() !== year}>{busy ? 'Archiving…' : 'Archive and close the year'}</Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>
    </div>
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
    ...(isAdmin ? [['analytics', 'chart-simple', 'Analytics'], ['audit', 'clock-rotate-left', 'Audit Log'], ['year', 'box-archive', 'Academic Year']] : []),
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
      {tab === 'analytics' && isAdmin && <AdminAnalytics />}
      {tab === 'audit' && isAdmin && <AuditLog />}
      {tab === 'year' && isAdmin && <AcademicYear />}
    </div>
  );
}
