import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Badge, Chip, Button, Modal, Field, useToast, Card } from '../components/ui.jsx';
import { councilMembers } from '../data/mock.js';
import { colors } from '../theme/theme.js';

export default function RepProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const member = councilMembers.find((m) => m.id === id);
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState('Academic');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!member) {
    return (
      <div className="wrap center">
        <h2 className="page-title">Member not found</h2>
        <Link to="/council" className="btn-prim" style={{ marginTop: 16 }}>Back to Directory</Link>
      </div>
    );
  }

  const sendRequest = () => {
    setOpen(false);
    setSubmitted(true);
    toast('Contact request sent to AI categorization', 'success');
  };

  return (
    <div className="wrap">
      <div className="row mb-2" style={{ fontSize: '12px' }}>
        <Link to="/council" className="muted" style={{ textDecoration: 'none' }}>
          <i className="fas fa-arrow-left" style={{ marginRight: 5 }} /> Council Directory
        </Link>
      </div>

      <div className="grid-2" style={{ gap: '2rem', alignItems: 'start' }}>
        {/* Left card */}
        <Card accent pad style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 130,
              height: 130,
              borderRadius: '50%',
              margin: '0 auto 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: "'Fraunces', serif",
              fontWeight: 900,
              fontSize: '2.4rem',
              color: colors.blueDark,
              background: colors.blueLight,
              border: '4px solid #fff',
              boxShadow: '0 10px 32px rgba(0,0,0,.12), 0 0 0 8px rgba(34,102,237,.07)',
            }}
          >
            {member.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
          </div>
          <h1 className="page-title" style={{ fontSize: '1.5rem' }}>{member.name}</h1>
          <div className="row" style={{ justifyContent: 'center', margin: '8px 0 12px' }}>
            <Badge tone={member.verified ? 'green' : 'gray'} icon={member.verified ? 'badge-check' : 'hourglass-half'}>
              {member.verified ? 'Verified' : 'Pending Verification'}
            </Badge>
            {member.verified && <Badge tone="blue" icon="shield-halved">{member.verifiedBy}</Badge>}
          </div>
          <Chip blue icon="medal">{member.position}</Chip>
          <div className="muted" style={{ fontSize: '0.78rem', marginTop: 12 }}>
            <div><i className="fas fa-graduation-cap" style={{ marginRight: 6, color: colors.blue }} />{member.branch || 'GECA'} · {member.year ? `Year ${member.year}` : 'College Administration'}</div>
            <div style={{ marginTop: 4 }}><i className="fas fa-calendar" style={{ marginRight: 6, color: colors.blue }} />Serving term {member.term}</div>
          </div>

          {member.email && (
            <div style={{ marginTop: 16, background: colors.blueSoft, border: '1.5px dashed rgba(34,102,237,.35)', borderRadius: 14, padding: '12px 14px', textAlign: 'left' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: colors.blueDark }}>
                <i className="fas fa-envelope-circle-check" style={{ marginRight: 6 }} />
                <code style={{ fontSize: '12px' }}>{member.email}</code>
              </div>
              <p style={{ fontSize: '10.5px', color: colors.charcoalMuted, margin: '5px 0 0', lineHeight: 1.5 }}>
                <i className="fas fa-arrow-right-arrow-left" style={{ color: colors.blue, marginRight: 4 }} />
                Role forwarding inbox — stays <strong>{member.email}</strong> even after this person leaves.
                It routes to the current {member.position}.
              </p>
            </div>
          )}

          <div style={{ marginTop: 22 }}>
            {member.verified ? (
              <Button lg style={{ width: '100%' }} onClick={() => setOpen(true)}>
                <i className="fas fa-paper-plane" /> Contact {member.name.split(' ')[0]}
              </Button>
            ) : (
              <Button lg variant="ghost" style={{ width: '100%' }} disabled>
                <i className="fas fa-lock" /> Not available until verified
              </Button>
            )}
            <p className="faint" style={{ fontSize: '10.5px', marginTop: 10 }}>
              Contact is moderated — your request goes through AI categorization and approval first.
            </p>
          </div>
        </Card>

        {/* About */}
        <div>
          <Card pad>
            <div className="sec-head">
              <div className="schip"><span className="schip-ln" />Profile<span className="schip-ln" /></div>
              <h2 className="page-title" style={{ fontSize: '1.3rem' }}>About</h2>
            </div>
            <p style={{ fontSize: '0.86rem', color: colors.charcoalSoft, lineHeight: 1.7 }}>{member.about}</p>
            <div style={{ marginTop: 18 }}>
              <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: colors.charcoalMuted, marginBottom: 8 }}>
                Responsibilities
              </div>
              <ul style={{ listStyle: 'none', padding: 0, fontSize: '0.82rem', color: colors.charcoalSoft }}>
                {['Manage contact requests & approval', 'Create official events', 'Handle grievances & responses', 'Coordinate student activities'].map((r) => (
                  <li key={r} style={{ padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                    <i className="fas fa-check-circle" style={{ color: colors.blue, marginRight: 8 }} />{r}
                  </li>
                ))}
              </ul>
            </div>
            <div className="row" style={{ marginTop: 16, gap: 6 }}>
              {member.tags.map((t) => <Chip key={t} icon="tag">{t}</Chip>)}
            </div>
          </Card>
        </div>
      </div>

      {/* Contact request modal */}
      <Modal open={open} onClose={() => setOpen(false)} title={`Contact ${member.name.split(' ')[0]}`}>
        {submitted ? (
          <div className="center" style={{ padding: '12px 0' }}>
            <i className="fas fa-check-circle" style={{ fontSize: '2.6rem', color: '#1d7a46' }} />
            <h3 style={{ fontFamily: "'Fraunces', serif", margin: '10px 0 4px' }}>Request submitted!</h3>
            <p className="muted" style={{ fontSize: '0.82rem' }}>
              AI categorized your request and it's now pending {member.name.split(' ')[0]}'s approval.
            </p>
            <Button onClick={() => navigate('/messages')} style={{ marginTop: 16 }}>
              View Inbox <i className="fas fa-arrow-right" />
            </Button>
          </div>
        ) : (
          <>
            <div className="field">
              <label className="field-label">Category (AI will verify)</label>
              <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
                {['Academic', 'Personal', 'Event', 'Urgent'].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="field-label">Message</label>
              <textarea
                className="textarea"
                placeholder={`Write a short message to ${member.name.split(' ')[0]}...`}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
            <Button onClick={sendRequest} disabled={!message.trim()}>
              <i className="fas fa-paper-plane" /> Submit Request
            </Button>
          </>
        )}
      </Modal>
    </div>
  );
}
