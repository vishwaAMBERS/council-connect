import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { Badge, EmptyState, useToast, Button, STATUS_TONE, statusLabel } from '../components/ui.jsx';
import { contactRequests, messages } from '../data/mock.js';
import { colors } from '../theme/theme.js';

const conversations = [
  { id: 't1', with: 'Rohit Sharma', last: 'Please share your roll number.', time: '1h ago', unread: 2, category: 'Academic' },
  { id: 't2', with: 'Priya Nair', last: 'You are confirmed for the event 👍', time: '3h ago', unread: 0, category: 'Event' },
  { id: 't3', with: 'Sneha Patil', last: 'Great, see you at the meeting.', time: '1d ago', unread: 0, category: 'General' },
];

const threadMsgs = {
  t1: [
    { from: 'me', text: 'Sir, can you help me with the placement cell registration process?' },
    { from: 'them', text: 'Sure. Are you in final year?' },
    { from: 'me', text: 'No sir, third year. But I want to prepare early.' },
    { from: 'them', text: 'Please share your roll number. I will add you to the prep group.' },
    { from: 'them', text: 'Also check the Events tab — placement drive prep workshop is on Jan 28.' },
  ],
  t2: [
    { from: 'me', text: 'Want to volunteer for the tech fest organising team.' },
    { from: 'them', text: 'Amazing! Which area interest you — events, tech or ops?' },
    { from: 'me', text: 'Tech competitions would be great.' },
    { from: 'them', text: 'You are confirmed for the event 👍' },
  ],
  t3: [
    { from: 'them', text: 'Hi! Reminder about the council open house on Friday.' },
    { from: 'me', text: 'Will be there!' },
  ],
};

export default function Messages() {
  const { user } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState(user?.role === 'student' ? 'messages' : 'requests');
  const [active, setActive] = useState(null);
  const [reply, setReply] = useState('');
  const [msgs, setMsgs] = useState(threadMsgs);

  const isRep = user?.role === 'rep' || user?.role === 'admin';

  const approve = (id, action) => {
    toast(`Request ${action}d successfully`, 'success');
  };

  const send = () => {
    if (!reply.trim() || !active) return;
    setMsgs((m) => ({ ...m, [active]: [...(m[active] || []), { from: 'me', text: reply.trim() }] }));
    setReply('');
    toast('Message sent');
  };

  const list = tab === 'messages' ? conversations : contactRequests;

  return (
    <div className="wrap">
      <div className="sec-head">
        <div className="schip"><span className="schip-ln" />Communication<span className="schip-ln" /></div>
        <h1 className="page-title">Moderated <em>Inbox</em></h1>
      </div>

      <div className="tabs" style={{ marginBottom: '1.5rem' }}>
        <button className={`tab ${tab === 'messages' ? 'active' : ''}`} onClick={() => setTab('messages')}>
          <i className="fas fa-comments" style={{ marginRight: 6 }} /> Messages
        </button>
        <button className={`tab ${tab === 'requests' ? 'active' : ''}`} onClick={() => setTab('requests')}>
          <i className="fas fa-inbox" style={{ marginRight: 6 }} /> Contact Requests {isRep && <Badge tone="gold" style={{ marginLeft: 6 }}>2</Badge>}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left: list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tab === 'messages' &&
            list.map((c) => (
              <div
                key={c.id}
                className="row-card"
                onClick={() => setActive(c.id)}
                style={active === c.id ? { borderColor: colors.blue, boxShadow: '0 8px 24px var(--blue-glow)' } : {}}
              >
                <div
                  style={{ width: 42, height: 42, borderRadius: '50%', background: colors.blueLight, color: colors.blueDark, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                >
                  {c.with.slice(0, 1)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="spread">
                    <span className="rc-title">{c.with}</span>
                    <span className="faint" style={{ fontSize: '10px' }}>{c.time}</span>
                  </div>
                  <div className="rc-sub" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.last}</div>
                </div>
                {c.unread > 0 && (
                  <span style={{ background: colors.blue, color: '#fff', borderRadius: '50%', width: 20, height: 20, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {c.unread}
                  </span>
                )}
              </div>
            ))}

          {tab === 'requests' &&
            list.map((r) => (
              <div key={r.id} className="card" style={{ padding: '1.1rem 1.2rem' }}>
                <div className="spread">
                  <div className="rc-title">{r.from}</div>
                  <Badge tone={STATUS_TONE[r.status] || 'gray'}>{statusLabel(r.status)}</Badge>
                </div>
                <div className="row" style={{ margin: '6px 0' }}>
                  <Badge tone="blue">{r.category}</Badge>
                  <span className="faint" style={{ fontSize: '10px' }}>{r.createdAt}</span>
                </div>
                <p style={{ fontSize: '0.78rem', color: colors.charcoalMuted }}>{r.message}</p>
                {r.aiNote && (
                  <div style={{ fontSize: '10.5px', color: colors.blueDark, background: colors.blueSoft, borderRadius: 8, padding: '6px 10px', marginTop: 8 }}>
                    <i className="fas fa-robot" style={{ marginRight: 5 }} />{r.aiNote}
                  </div>
                )}
                {isRep && (r.status === 'pending' || r.status === 'escalated') && (
                  <div className="row" style={{ marginTop: 12 }}>
                    <button className="btn-prim btn-sm" onClick={() => approve(r.id, 'approve')}>
                      <i className="fas fa-check" /> Approve
                    </button>
                    <button className="btn-danger btn-sm" onClick={() => approve(r.id, 'decline')}>
                      <i className="fas fa-x" /> Decline
                    </button>
                  </div>
                )}
              </div>
            ))}
          {list.length === 0 && <EmptyState icon="inbox" title="Nothing here" />}
        </div>

        {/* Right: thread */}
        {tab === 'messages' ? (
          active ? (
            <div className="card" style={{ padding: '1.5rem', minHeight: 460, display: 'flex', flexDirection: 'column' }}>
              <div className="spread" style={{ paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
                <div className="row">
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: colors.blueLight, color: colors.blueDark, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {conversations.find((c) => c.id === active)?.with.slice(0, 1)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{conversations.find((c) => c.id === active)?.with}</div>
                    <div className="faint" style={{ fontSize: '10.5px' }}>
                      <i className="fas fa-shield-halved" style={{ color: colors.blue, marginRight: 4 }} />Approved thread
                    </div>
                  </div>
                </div>
                <Badge tone="blue">{conversations.find((c) => c.id === active)?.category}</Badge>
              </div>

              <div style={{ flex: 1, padding: '18px 0', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(msgs[active] || []).map((m, i) => (
                  <div
                    key={i}
                    style={{
                      alignSelf: m.from === 'me' ? 'flex-end' : 'flex-start',
                      maxWidth: '70%',
                      background: m.from === 'me' ? 'linear-gradient(135deg,#2266ED,#3b7af8)' : colors.whiteTint,
                      color: m.from === 'me' ? '#fff' : colors.charcoal,
                      padding: '10px 15px',
                      borderRadius: m.from === 'me' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      fontSize: '0.82rem',
                      boxShadow: 'var(--sh-sm)',
                    }}
                  >
                    {m.text}
                  </div>
                ))}
              </div>

              <div className="row" style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <input
                  className="input"
                  placeholder="Type a message..."
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && send()}
                />
                <Button onClick={send}><i className="fas fa-paper-plane" /></Button>
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: '2rem', minHeight: 460 }}>
              <EmptyState icon="comment-dots" title="Select a conversation" desc="Choose a thread on the left to start reading." />
            </div>
          )
        ) : (
          <div className="card" style={{ padding: '2rem', minHeight: 460 }}>
            <EmptyState
              icon="robot"
              title="AI-assisted moderation"
              desc="Contact requests are categorized by AI (Academic, Personal, Event, Urgent) and auto-routed to the right representative. Unresolved requests escalate up the chain."
            />
          </div>
        )}
      </div>
    </div>
  );
}
