import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Badge, EmptyState, STATUS_TONE, statusLabel } from '../components/ui.jsx';
import { grievances } from '../data/mock.js';
import { colors } from '../theme/theme.js';

export default function Grievances() {
  const { user } = useAuth();
  const [tab, setTab] = useState(user?.role === 'student' ? 'mine' : 'queue');
  const isStaff = user?.role === 'rep' || user?.role === 'admin';

  const list = tab === 'mine' ? grievances : grievances;

  return (
    <div className="wrap">
      <div className="sec-head">
        <div className="schip"><span className="schip-ln" />Hostel Grievance<span className="schip-ln" /></div>
        <div className="spread">
          <h1 className="page-title">Grievance <em>Management</em></h1>
          {user?.role === 'student' && (
            <Link to="/grievances/new" className="btn-prim">
              <i className="fas fa-plus" /> Submit Complaint
            </Link>
          )}
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: '1.5rem' }}>
        {user?.role === 'student' ? (
          <button className="tab active"><i className="fas fa-file-alt" style={{ marginRight: 6 }} /> My Complaints</button>
        ) : (
          <>
            <button className={`tab ${tab === 'queue' ? 'active' : ''}`} onClick={() => setTab('queue')}><i className="fas fa-inbox" style={{ marginRight: 6 }} /> Complaint Queue</button>
            <button className={`tab ${tab === 'escalated' ? 'active' : ''}`} onClick={() => setTab('escalated')}><i className="fas fa-arrow-up" style={{ marginRight: 6 }} /> Escalated</button>
          </>
        )}
      </div>

      <div className="grid-2">
        {list.map((g) => (
          <Link key={g.id} to={`/grievances/${g.id}`} style={{ textDecoration: 'none' }}>
            <div className="card-accent" style={{ height: '100%' }}>
              <div className="spread">
                <Badge tone="blue" icon="tag">{g.category}</Badge>
                <Badge tone={STATUS_TONE[g.priority] || 'gray'} icon={g.priority === 'urgent' ? 'bolt' : 'flag'}>
                  {statusLabel(g.priority)} priority
                </Badge>
              </div>
              <div className="card-title" style={{ marginTop: 12 }}>{g.title}</div>
              <p style={{ fontSize: '0.8rem', color: colors.charcoalMuted, margin: '6px 0 12px' }}>{g.desc}</p>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div className="muted" style={{ fontSize: '0.72rem' }}>
                  <i className="fas fa-building" style={{ color: colors.blue, marginRight: 5 }} />{g.room}
                  <br />
                  <i className="fas fa-user-cog" style={{ color: colors.blue, marginRight: 5 }} />{g.assignedTo}
                </div>
                <Badge tone={STATUS_TONE[g.status] || 'gray'} icon="circle-notch">{statusLabel(g.status)}</Badge>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {list.length === 0 && <EmptyState icon="clipboard-list" title="No complaints yet" />}
    </div>
  );
}
