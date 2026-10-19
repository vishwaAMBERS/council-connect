import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Badge, Timeline, STATUS_TONE, statusLabel, Button, Chip } from '../components/ui.jsx';
import { grievances } from '../data/mock.js';
import { colors } from '../theme/theme.js';

export default function GrievanceDetail() {
  const { id } = useParams();
  const g = grievances.find((x) => x.id === id);

  if (!g) {
    return (
      <div className="wrap center">
        <h2 className="page-title">Complaint not found</h2>
        <Link to="/grievances" className="btn-prim" style={{ marginTop: 16 }}>Back</Link>
      </div>
    );
  }

  return (
    <div className="wrap" style={{ maxWidth: 860 }}>
      <div className="row mb-2" style={{ fontSize: '12px' }}>
        <Link to="/grievances" className="muted" style={{ textDecoration: 'none' }}>
          <i className="fas fa-arrow-left" style={{ marginRight: 5 }} /> My Complaints
        </Link>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div>
          <div className="card-accent">
            <div className="schip"><span className="schip-ln" />Complaint <span style={{ marginLeft: 4 }}>#{g.id.toUpperCase()}</span><span className="schip-ln" /></div>
            <h1 className="page-title" style={{ fontSize: '1.4rem' }}>{g.title}</h1>
            <div className="row" style={{ margin: '10px 0' }}>
              <Badge tone="blue" icon="tag">{g.category}</Badge>
              <Badge tone={STATUS_TONE[g.priority]}>{statusLabel(g.priority)} priority</Badge>
              <Badge tone={STATUS_TONE[g.status]} icon="circle-notch">{statusLabel(g.status)}</Badge>
            </div>
            <p style={{ fontSize: '0.85rem', color: colors.charcoalSoft, lineHeight: 1.7 }}>{g.desc}</p>
            <div className="muted" style={{ fontSize: '0.76rem', marginTop: 14 }}>
              <div><i className="fas fa-building" style={{ color: colors.blue, width: 18, marginRight: 6 }} />Room {g.room}</div>
              <div><i className="fas fa-user-cog" style={{ color: colors.blue, width: 18, marginRight: 6 }} />Assigned to {g.assignedTo}</div>
              <div><i className="fas fa-clock" style={{ color: colors.blue, width: 18, marginRight: 6 }} />Submitted {g.submittedAt}</div>
            </div>
          </div>

          <div className="card" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
            <div className="sec-head" style={{ marginBottom: 14 }}>
              <div className="schip"><span className="schip-ln" />AI Analysis<span className="schip-ln" /></div>
              <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '1.05rem' }}>Routed by <em className="blue">intelligence</em></h3>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <Chip icon="robot">Category: {g.category}</Chip>
              <Chip icon="gauge-high">Priority: {statusLabel(g.priority)}</Chip>
              <Chip icon="route">Auto-routed to {g.assignedTo}</Chip>
            </div>
            {g.priority === 'urgent' && (
              <p style={{ fontSize: '0.75rem', color: colors.charcoalMuted, marginTop: 10 }}>
                <i className="fas fa-triangle-exclamation" style={{ color: '#c0392b', marginRight: 6 }} />
                Urgent complaints are auto-escalated if unresolved within 24 hours.
              </p>
            )}
          </div>
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <div className="sec-head" style={{ marginBottom: 14 }}>
            <div className="schip"><span className="schip-ln" />Status<span className="schip-ln" /></div>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '1.05rem' }}>Live <em className="blue">timeline</em></h3>
          </div>
          <Timeline items={g.timeline} />
          <div className="row" style={{ marginTop: 16 }}>
            <Button variant="ghost" size="sm"><i className="fas fa-comment-dots" /> Add Note</Button>
            {g.status !== 'resolved' && <Button size="sm" tone="green"><i className="fas fa-check" /> Mark Resolved</Button>}
          </div>
        </div>
      </div>
    </div>
  );
}
