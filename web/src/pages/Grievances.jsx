import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Badge, EmptyState, STATUS_TONE, statusLabel, ErrorNote, Loading } from '../components/ui.jsx';
import { useApi } from '../hooks/useApi.js';
import { timeAgo } from '../lib/format.js';
import { colors } from '../theme/theme.js';

export const CATEGORY_LABEL = { electrical: 'Electrical', water: 'Water', wifi: 'Wi-Fi', mess: 'Mess', infrastructure: 'Infrastructure' };

/** Category and priority assigned by AI triage; both are empty for a moment after submission. */
export function TriageBadges({ grievance }) {
  if (!grievance.category) return <Badge tone="gray" icon="robot">Categorising…</Badge>;
  return (
    <>
      <Badge tone="blue" icon="tag" title="Category assigned by AI">{CATEGORY_LABEL[grievance.category]}</Badge>
      <Badge tone={STATUS_TONE[grievance.priority] || 'gray'} icon={grievance.priority === 'critical' ? 'bolt' : 'flag'} title="Priority assigned by AI">
        {statusLabel(grievance.priority)} priority
      </Badge>
    </>
  );
}

export default function Grievances() {
  const { user } = useAuth();
  const list = useApi('/grievances', { pollMs: 30000 });
  const isHandler = Boolean(list.data?.isHandler);
  const [tab, setTab] = useState('open');
  const all = list.data?.grievances || [];
  const counts = {
    open: all.filter((g) => g.status !== 'resolved' && !g.escalatedAt).length,
    escalated: all.filter((g) => g.status !== 'resolved' && g.escalatedAt).length,
    resolved: all.filter((g) => g.status === 'resolved').length,
  };
  const shown = all.filter((g) =>
    tab === 'resolved' ? g.status === 'resolved' : tab === 'escalated' ? g.status !== 'resolved' && g.escalatedAt : g.status !== 'resolved' && !g.escalatedAt
  );

  return (
    <div className="wrap">
      <div className="sec-head">
        <div className="schip"><span className="schip-ln" />Hostel Grievance<span className="schip-ln" /></div>
        <div className="spread">
          <h1 className="page-title">{isHandler ? <>Complaint <em>Queue</em></> : <>My <em>Complaints</em></>}</h1>
          {user.role === 'student' && (
            <Link to="/grievances/new" className="btn-prim"><i className="fas fa-plus" /> Submit Complaint</Link>
          )}
        </div>
        {isHandler && (
          <p className="muted" style={{ fontSize: '0.85rem', maxWidth: 640 }}>
            {user.role === 'admin'
              ? 'Escalated complaints are yours to handle. You can also pick up any open complaint.'
              : 'Take a complaint to start working on it. Complaints not resolved in time are escalated to the HOD.'}
          </p>
        )}
      </div>

      <div className="tabs" style={{ marginBottom: '1.5rem' }}>
        {[['open', 'inbox', 'Open'], ['escalated', 'arrow-up', 'Escalated'], ['resolved', 'circle-check', 'Resolved']].map(([key, icon, label]) => (
          <button key={key} className={`tab ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>
            <i className={`fas fa-${icon}`} style={{ marginRight: 6 }} /> {label} ({counts[key]})
          </button>
        ))}
      </div>

      <ErrorNote error={list.error} onRetry={list.reload} />
      {list.loading && !list.data ? (
        <Loading label="Loading complaints…" />
      ) : shown.length === 0 && !list.error ? (
        <EmptyState
          icon="clipboard-list"
          title={tab === 'open' ? 'No open complaints' : tab === 'escalated' ? 'Nothing escalated' : 'No resolved complaints yet'}
          desc={user.role === 'student' && tab === 'open' ? 'Something broken in the hostel? Submit a complaint and track it here.' : undefined}
        />
      ) : (
        <div className="grid-2">
          {shown.map((g) => (
            <Link key={g.id} to={`/grievances/${g.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="card-accent" style={{ height: '100%' }}>
                <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}><TriageBadges grievance={g} /></div>
                <div className="card-title" style={{ marginTop: 12 }}>{g.title}</div>
                <p style={{ fontSize: '0.8rem', color: colors.charcoalMuted, margin: '6px 0 12px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{g.description}</p>
                <div className="spread" style={{ alignItems: 'flex-end', gap: 8 }}>
                  <div className="muted" style={{ fontSize: '0.72rem', lineHeight: 1.7 }}>
                    {g.roomNumber && <div><i className="fas fa-building" style={{ color: colors.blue, marginRight: 5 }} />{g.roomNumber}</div>}
                    {isHandler && <div><i className="fas fa-user" style={{ color: colors.blue, marginRight: 5 }} />{g.raisedBy.fullName}</div>}
                    <div><i className="fas fa-user-cog" style={{ color: colors.blue, marginRight: 5 }} />{g.assignedTo ? g.assignedTo.fullName : 'Not assigned yet'}</div>
                    <div><i className="fas fa-clock" style={{ color: colors.blue, marginRight: 5 }} />{timeAgo(g.createdAt)}</div>
                  </div>
                  <Badge tone={STATUS_TONE[g.status] || 'gray'}>{statusLabel(g.status)}</Badge>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
