import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Badge, STATUS_TONE, statusLabel, Button, Modal, Field, useToast, ErrorNote, Loading } from '../components/ui.jsx';
import { useApi } from '../hooks/useApi.js';
import { api, assetUrl } from '../api/client.js';
import { formatDateTime } from '../lib/format.js';
import { TriageBadges } from './Grievances.jsx';
import { colors } from '../theme/theme.js';

const HISTORY_TITLE = {
  submitted: 'Submitted',
  assigned: 'Assigned',
  in_progress: 'Work in progress',
  resolved: 'Resolved',
  escalated: 'Escalated to the HOD',
};

// Each action that needs text from the user: [modal title, field label, button label, required].
const DIALOGS = {
  start: ['Start work', 'Note for the student (optional)', 'Mark In Progress', false],
  resolve: ['Resolve complaint', 'What was done', 'Mark Resolved', true],
  escalate: ['Escalate to the HOD', 'Why are you escalating?', 'Escalate', true],
};

export default function GrievanceDetail() {
  const { id } = useParams();
  const toast = useToast();
  const detail = useApi(`/grievances/${id}`, { pollMs: 15000 });
  const [dialog, setDialog] = useState(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  if (detail.loading && !detail.data) return <div className="wrap"><Loading label="Loading complaint…" /></div>;
  if (detail.error && !detail.data) {
    return (
      <div className="wrap center">
        <h2 className="page-title">{detail.error.status === 404 ? 'Complaint not found' : 'Could not load this complaint'}</h2>
        <Link to="/grievances" className="btn-prim" style={{ marginTop: 16, display: 'inline-flex' }}>Back to complaints</Link>
      </div>
    );
  }

  const { grievance: g, history, actions } = detail.data;

  const run = async (action, body, message) => {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/grievances/${g.id}/${action}`, body);
      toast(message, 'success');
      setDialog(null);
      setText('');
      await detail.reload();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const submitDialog = (e) => {
    e.preventDefault();
    const value = text.trim();
    if (dialog === 'escalate') run('escalate', { reason: value }, 'Complaint escalated to the HOD');
    else run(dialog, { note: value }, dialog === 'resolve' ? 'Complaint resolved' : 'Marked in progress');
  };

  const open = (name) => {
    setError(null);
    setText('');
    setDialog(name);
  };

  return (
    <div className="wrap" style={{ maxWidth: 900 }}>
      <div className="row mb-2" style={{ fontSize: '12px' }}>
        <Link to="/grievances" className="muted" style={{ textDecoration: 'none' }}>
          <i className="fas fa-arrow-left" style={{ marginRight: 5 }} /> Complaints
        </Link>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div>
          <div className="card-accent">
            <h1 className="page-title" style={{ fontSize: '1.4rem' }}>{g.title}</h1>
            <div className="row" style={{ margin: '10px 0', gap: 6, flexWrap: 'wrap' }}>
              <TriageBadges grievance={g} />
              <Badge tone={STATUS_TONE[g.status] || 'gray'}>{statusLabel(g.status)}</Badge>
            </div>
            <p style={{ fontSize: '0.86rem', color: colors.charcoalSoft, lineHeight: 1.7, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{g.description}</p>
            {g.imageUrl && (
              <a href={assetUrl(g.imageUrl)} target="_blank" rel="noreferrer">
                <img src={assetUrl(g.imageUrl)} alt="Photo evidence" style={{ width: '100%', maxHeight: 280, objectFit: 'cover', borderRadius: 14, marginTop: 12 }} />
              </a>
            )}
            <div className="muted" style={{ fontSize: '0.78rem', marginTop: 14, lineHeight: 1.8 }}>
              {g.roomNumber && <div><i className="fas fa-building" style={{ color: colors.blue, width: 18, marginRight: 6 }} />{g.roomNumber}</div>}
              <div><i className="fas fa-user" style={{ color: colors.blue, width: 18, marginRight: 6 }} />Raised by {g.raisedBy.fullName}{g.raisedBy.unitCode ? ` (${g.raisedBy.unitCode})` : ''}</div>
              <div><i className="fas fa-user-cog" style={{ color: colors.blue, width: 18, marginRight: 6 }} />{g.assignedTo ? `Assigned to ${g.assignedTo.fullName}` : 'Not assigned yet'}</div>
              <div><i className="fas fa-clock" style={{ color: colors.blue, width: 18, marginRight: 6 }} />Submitted {formatDateTime(g.createdAt)}</div>
              {g.escalationDueAt && (
                <div><i className="fas fa-hourglass-half" style={{ color: colors.blue, width: 18, marginRight: 6 }} />Escalates automatically if unresolved by {formatDateTime(g.escalationDueAt)}</div>
              )}
            </div>
            {g.resolutionNote && (
              <div style={{ marginTop: 14, background: '#e6f6ec', border: '1px solid rgba(29,122,70,.2)', borderRadius: 12, padding: '10px 14px', fontSize: '0.84rem' }}>
                <strong>Resolution:</strong> {g.resolutionNote}
              </div>
            )}
          </div>

          {(actions.take || actions.start || actions.resolve || actions.escalate) && (
            <div className="card" style={{ padding: '1.2rem 1.5rem', marginTop: '1.5rem' }}>
              <ErrorNote error={!dialog ? error : null} />
              <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                {actions.take && (
                  <Button disabled={busy} onClick={() => run('take', {}, 'Complaint assigned to you')}>
                    <i className="fas fa-hand" /> Take this complaint
                  </Button>
                )}
                {actions.start && <Button variant="out" disabled={busy} onClick={() => open('start')}><i className="fas fa-play" /> Start work</Button>}
                {actions.resolve && <Button disabled={busy} onClick={() => open('resolve')}><i className="fas fa-check" /> Resolve</Button>}
                {actions.escalate && <Button variant="danger" disabled={busy} onClick={() => open('escalate')}><i className="fas fa-arrow-up" /> Escalate to HOD</Button>}
              </div>
              {actions.escalate && (
                <p className="faint" style={{ fontSize: '11px', marginTop: 10 }}>
                  Not getting a response? You can escalate now instead of waiting for the automatic deadline.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <div className="sec-head" style={{ marginBottom: 14 }}>
            <div className="schip"><span className="schip-ln" />Status<span className="schip-ln" /></div>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '1.05rem' }}>Timeline</h3>
          </div>
          <ul className="tl">
            {history.map((entry) => (
              <li key={entry.id} className="tl-item done">
                <div className="tl-title">{HISTORY_TITLE[entry.status]}</div>
                <div className="tl-sub">{entry.actorName} · {formatDateTime(entry.createdAt)}</div>
                {entry.note && <div className="tl-sub" style={{ marginTop: 3, color: colors.charcoalSoft, overflowWrap: 'anywhere' }}>{entry.note}</div>}
              </li>
            ))}
            {g.status !== 'resolved' && (
              <li className="tl-item">
                <div className="tl-title" style={{ color: colors.charcoalMuted }}>Resolution pending</div>
              </li>
            )}
          </ul>
        </div>
      </div>

      <Modal open={Boolean(dialog)} onClose={() => setDialog(null)} title={dialog ? DIALOGS[dialog][0] : ''}>
        {dialog && (
          <form onSubmit={submitDialog}>
            <ErrorNote error={error} />
            <Field label={DIALOGS[dialog][1]} hint={`${text.length}/1000`}>
              <textarea className="textarea" value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} required={DIALOGS[dialog][3]} autoFocus />
            </Field>
            <div className="row">
              <Button type="submit" variant={dialog === 'escalate' ? 'danger' : 'prim'} disabled={busy || (DIALOGS[dialog][3] && !text.trim())}>
                {busy ? 'Saving…' : DIALOGS[dialog][2]}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setDialog(null)}>Cancel</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
