import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Badge, EmptyState, useToast, Button, STATUS_TONE, statusLabel, CategoryBadge, InitialsAvatar, ErrorNote, Loading } from '../components/ui.jsx';
import { useApi } from '../hooks/useApi.js';
import { api } from '../api/client.js';
import { timeAgo, formatDateTime } from '../lib/format.js';
import { colors } from '../theme/theme.js';

const LIST_POLL_MS = 15000;
const THREAD_POLL_MS = 10000;
const MESSAGE_MAX = 1000;

/**
 * Representatives see the requests addressed to them (their inbox).
 * Students see the requests they sent. Approved requests open a message thread.
 */
export default function Messages() {
  const { user } = useAuth();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeId = searchParams.get('request');
  const isStudent = user.role === 'student';

  const list = useApi(isStudent ? '/contact-requests/mine' : '/contact-requests/inbox', { pollMs: LIST_POLL_MS });
  const requests = list.data?.requests || [];
  const active = requests.find((r) => r.id === activeId) || null;
  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  const thread = useApi(active?.status === 'approved' ? `/contact-requests/${active.id}/messages` : null, { pollMs: THREAD_POLL_MS });
  const messages = thread.data?.messages || [];

  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' });
  }, [messages.length, activeId]);

  const select = (id) => {
    setActionError(null);
    setReply('');
    setSearchParams({ request: id });
  };

  const respond = async (action) => {
    setBusy(true);
    setActionError(null);
    try {
      await api.post(`/contact-requests/${active.id}/${action}`);
      toast(action === 'approve' ? 'Request approved. The message thread is open' : 'Request declined', 'success');
      await list.reload();
    } catch (error) {
      setActionError(error);
    } finally {
      setBusy(false);
    }
  };

  const send = async (e) => {
    e.preventDefault();
    const content = reply.trim();
    if (!content || busy) return;
    setBusy(true);
    setActionError(null);
    try {
      await api.post(`/contact-requests/${active.id}/messages`, { content });
      setReply('');
      await thread.reload();
    } catch (error) {
      setActionError(error);
    } finally {
      setBusy(false);
    }
  };

  const other = (r) => (isStudent ? r.to : r.from);
  const otherSub = (r) =>
    isStudent ? r.to.positionTitle || 'Representative' : [r.from.unitCode, r.from.year && `Year ${r.from.year}`].filter(Boolean).join(' · ');

  return (
    <div className="wrap">
      <div className="sec-head">
        <div className="schip"><span className="schip-ln" />Communication<span className="schip-ln" /></div>
        <div className="spread">
          <h1 className="page-title">{isStudent ? <>My <em>Requests</em></> : <>Contact Request <em>Inbox</em></>}</h1>
          {!isStudent && pendingCount > 0 && <Badge tone="gold" icon="inbox">{pendingCount} pending</Badge>}
        </div>
        <p className="muted" style={{ fontSize: '0.85rem', maxWidth: 640 }}>
          {isStudent
            ? 'Requests you have sent to council representatives. Messaging opens once a request is approved.'
            : 'Students must send a contact request first. Approve one to open a message thread with that student.'}
        </p>
      </div>

      <ErrorNote error={list.error} onRetry={list.reload} />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 360px) minmax(0, 1fr)', gap: '1.5rem', alignItems: 'start' }}>
        {/* Request list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {list.loading && !list.data && <Loading />}
          {list.data && requests.length === 0 && (
            <div className="card" style={{ padding: '1.5rem' }}>
              <EmptyState
                icon="inbox"
                title={isStudent ? 'No requests yet' : 'No contact requests'}
                desc={isStudent ? 'Find a representative in the Council Directory and send a contact request.' : 'Requests from students will appear here.'}
              />
              {isStudent && (
                <div className="center"><Link to="/council" className="btn-prim btn-sm">Open Council Directory</Link></div>
              )}
            </div>
          )}
          {requests.map((r) => (
            <button
              key={r.id}
              type="button"
              className="row-card"
              onClick={() => select(r.id)}
              aria-current={r.id === activeId}
              style={{
                textAlign: 'left', width: '100%', font: 'inherit', alignItems: 'flex-start',
                ...(r.id === activeId ? { borderColor: colors.blue, boxShadow: '0 8px 24px var(--blue-glow)' } : {}),
              }}
            >
              <InitialsAvatar name={other(r).fullName} size={42} fontSize="0.9rem" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="spread" style={{ gap: 8 }}>
                  <span className="rc-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{other(r).fullName}</span>
                  <span className="faint" style={{ fontSize: '10px', flexShrink: 0 }}>{timeAgo(r.lastMessageAt || r.createdAt)}</span>
                </div>
                <div className="rc-sub">{otherSub(r)}</div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, margin: '6px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.reasonTitle}</div>
                <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                  <CategoryBadge category={r.category} />
                  <Badge tone={STATUS_TONE[r.status] || 'gray'}>{statusLabel(r.status)}</Badge>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Detail / thread */}
        <div className="card" style={{ padding: '1.5rem', minHeight: 460, display: 'flex', flexDirection: 'column' }}>
          {!active ? (
            <EmptyState
              icon="comment-dots"
              title={requests.length ? 'Select a request' : 'Nothing selected'}
              desc={isStudent ? 'Choose a request on the left to see its status or open the thread.' : 'Choose a request on the left to read it and respond.'}
            />
          ) : (
            <>
              <div style={{ paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
                <div className="spread" style={{ alignItems: 'flex-start', gap: 10 }}>
                  <div>
                    <Link to={`/council/${other(active).id}`} style={{ fontWeight: 800, fontSize: '0.95rem', color: 'inherit', textDecoration: 'none' }}>
                      {other(active).fullName}
                    </Link>
                    <div className="faint" style={{ fontSize: '11px' }}>{otherSub(active)} · sent {formatDateTime(active.createdAt)}</div>
                  </div>
                  <div className="row" style={{ gap: 6 }}>
                    <CategoryBadge category={active.category} />
                    <Badge tone={STATUS_TONE[active.status] || 'gray'}>{statusLabel(active.status)}</Badge>
                  </div>
                </div>
                <div style={{ marginTop: 12, background: colors.whiteTint, borderRadius: 12, padding: '12px 14px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.86rem' }}>{active.reasonTitle}</div>
                  <p style={{ fontSize: '0.82rem', color: colors.charcoalSoft, marginTop: 6, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{active.description}</p>
                </div>
              </div>

              <ErrorNote error={actionError || thread.error} />

              {active.status === 'pending' && (
                <div style={{ padding: '18px 0' }}>
                  {isStudent ? (
                    <p className="muted" style={{ fontSize: '0.84rem' }}>
                      <i className="fas fa-hourglass-half" style={{ marginRight: 8, color: colors.blue }} />
                      Request sent. Awaiting approval from {active.to.fullName}.
                    </p>
                  ) : (
                    <>
                      <p className="muted" style={{ fontSize: '0.82rem', marginBottom: 12 }}>
                        Approving opens a private message thread with this student. Declining closes the request.
                      </p>
                      <div className="row">
                        <Button onClick={() => respond('approve')} disabled={busy}><i className="fas fa-check" /> Approve</Button>
                        <Button variant="danger" onClick={() => respond('decline')} disabled={busy}><i className="fas fa-xmark" /> Decline</Button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {active.status === 'declined' && (
                <p className="muted" style={{ fontSize: '0.84rem', padding: '18px 0' }}>
                  <i className="fas fa-circle-xmark" style={{ marginRight: 8, color: '#c0392b' }} />
                  {isStudent
                    ? 'This request was declined. You can send a new request to this representative 24 hours after the decline.'
                    : 'You declined this request.'}
                </p>
              )}

              {active.status === 'approved' && (
                <>
                  <div role="log" aria-label="Messages" style={{ flex: 1, padding: '18px 0', overflowY: 'auto', maxHeight: 420, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {thread.loading && !thread.data && <Loading label="Loading messages…" />}
                    {thread.data && messages.length === 0 && (
                      <p className="faint center" style={{ fontSize: '0.8rem' }}>Request approved. Start the conversation.</p>
                    )}
                    {messages.map((m) => {
                      const mine = m.senderId === user.id;
                      return (
                        <div key={m.id} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '75%' }}>
                          <div
                            style={{
                              background: mine ? 'linear-gradient(135deg,#2266ED,#3b7af8)' : colors.whiteTint,
                              color: mine ? '#fff' : colors.charcoal,
                              padding: '10px 15px',
                              borderRadius: mine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                              fontSize: '0.84rem',
                              boxShadow: 'var(--sh-sm)',
                              whiteSpace: 'pre-wrap',
                              overflowWrap: 'anywhere',
                            }}
                          >
                            {m.content}
                          </div>
                          <div className="faint" style={{ fontSize: '10px', marginTop: 3, textAlign: mine ? 'right' : 'left' }}>{formatDateTime(m.sentAt)}</div>
                        </div>
                      );
                    })}
                    <div ref={endRef} />
                  </div>
                  <form className="row" onSubmit={send} style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                    <input
                      className="input"
                      placeholder="Type a message…"
                      aria-label="Message"
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      maxLength={MESSAGE_MAX}
                    />
                    <Button type="submit" disabled={busy || !reply.trim()} aria-label="Send message"><i className="fas fa-paper-plane" /></Button>
                  </form>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
