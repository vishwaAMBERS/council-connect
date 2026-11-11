import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Badge, Chip, Button, Modal, useToast, Card, EmptyState, ErrorNote, Loading, Table } from '../components/ui.jsx';
import { useApi } from '../hooks/useApi.js';
import { api, assetUrl } from '../api/client.js';
import { formatDateTime } from '../lib/format.js';
import { colors } from '../theme/theme.js';

const seats = (e) => (e.capacity ? `${e.registrationCount}/${e.capacity}` : `${e.registrationCount} registered`);

function EventMeta({ event }) {
  return (
    <div className="muted" style={{ fontSize: '0.78rem', lineHeight: 1.8 }}>
      <div><i className="fas fa-calendar-day" style={{ color: colors.blue, width: 16, marginRight: 6 }} />{formatDateTime(event.startsAt)}</div>
      <div><i className="fas fa-location-dot" style={{ color: colors.blue, width: 16, marginRight: 6 }} />{event.venue}</div>
      <div>
        <i className="fas fa-user-tie" style={{ color: colors.blue, width: 16, marginRight: 6 }} />
        {event.organizer.fullName}{event.organizer.positionTitle ? ` · ${event.organizer.positionTitle}` : ''}
      </div>
    </div>
  );
}

/** Detail view; organisers and admins also see who registered and can mark attendance. */
function EventDetail({ eventId, onClose, onChanged }) {
  const { user } = useAuth();
  const toast = useToast();
  const detail = useApi(`/events/${eventId}`);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const event = detail.data?.event;
  const participants = detail.data?.participants;

  const act = async (action, message) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      if (message) toast(message, 'success');
      await detail.reload();
      onChanged();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={event?.title || 'Event'}>
      <ErrorNote error={error || detail.error} />
      {!event ? (
        !detail.error && <Loading />
      ) : (
        <>
          {event.posterUrl && (
            <img src={assetUrl(event.posterUrl)} alt={`Poster for ${event.title}`} style={{ width: '100%', maxHeight: 260, objectFit: 'cover', borderRadius: 14, marginBottom: 14 }} />
          )}
          <div className="row" style={{ marginBottom: 12, gap: 6, flexWrap: 'wrap' }}>
            <Badge tone="blue" icon="users">{seats(event)}</Badge>
            <Badge tone="gray" icon="bullhorn">{event.branchScope === 'own_branch' && event.unit ? `${event.unit.code} only` : 'All branches'}</Badge>
            {event.isPast && <Badge tone="gray">Finished</Badge>}
            {event.isFull && !event.isPast && <Badge tone="gold">Full</Badge>}
          </div>
          <p style={{ fontSize: '0.86rem', color: colors.charcoalSoft, lineHeight: 1.7, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', marginBottom: 12 }}>{event.description}</p>
          <EventMeta event={event} />

          {user.role === 'student' && !event.isPast && (
            <div className="row" style={{ marginTop: 16 }}>
              {event.isRegistered ? (
                <>
                  <Badge tone="green" icon="check">You are registered</Badge>
                  <Button variant="ghost" size="sm" disabled={busy} onClick={() => act(() => api.del(`/events/${event.id}/register`), 'Registration cancelled')}>
                    Cancel registration
                  </Button>
                </>
              ) : (
                <Button disabled={busy || event.isFull} onClick={() => act(() => api.post(`/events/${event.id}/register`), 'You are registered')}>
                  <i className="fas fa-user-check" /> {event.isFull ? 'Event is full' : 'Register'}
                </Button>
              )}
            </div>
          )}

          {participants && (
            <div style={{ marginTop: 18 }}>
              <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '1rem', marginBottom: 8 }}>
                Participants ({participants.length}{participants.length ? `, ${participants.filter((p) => p.attended).length} attended` : ''})
              </h3>
              {participants.length === 0 ? (
                <p className="faint" style={{ fontSize: '0.8rem' }}>Nobody has registered yet.</p>
              ) : (
                <Table head={['Student', 'Branch', 'Attended']} minWidth={320}>
                  {participants.map((p) => (
                    <tr key={p.id}>
                      <td>{p.fullName}</td>
                      <td>{[p.unitCode, p.year && `Year ${p.year}`].filter(Boolean).join(' · ')}</td>
                      <td>
                        <input
                          type="checkbox"
                          checked={p.attended}
                          disabled={busy}
                          aria-label={`${p.fullName} attended`}
                          onChange={(e) => act(() => api.patch(`/events/${event.id}/attendance`, { studentId: p.id, attended: e.target.checked }))}
                        />
                      </td>
                    </tr>
                  ))}
                </Table>
              )}
            </div>
          )}
        </>
      )}
    </Modal>
  );
}

export default function Events() {
  const { user } = useAuth();
  const [tab, setTab] = useState('upcoming');
  const [openId, setOpenId] = useState(null);
  const list = useApi(tab === 'past' ? '/events?when=past' : '/events');
  const all = list.data?.events || [];
  const events = tab === 'mine' ? all.filter((e) => e.isRegistered || e.organizer.id === user.id) : all;

  return (
    <div className="wrap">
      <div className="sec-head">
        <div className="schip"><span className="schip-ln" />Campus Operations<span className="schip-ln" /></div>
        <div className="spread">
          <h1 className="page-title">Campus <em>Events</em></h1>
          {user.canCreateEvents && (
            <Link to="/events/new" className="btn-prim"><i className="fas fa-plus" /> Create Event</Link>
          )}
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: '1.5rem' }}>
        {[['upcoming', 'calendar', 'Upcoming'], ['mine', 'user-check', user.role === 'student' ? 'My Registrations' : 'My Events'], ['past', 'clock-rotate-left', 'Past']].map(([key, icon, label]) => (
          <button key={key} className={`tab ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>
            <i className={`fas fa-${icon}`} style={{ marginRight: 6 }} /> {label}
          </button>
        ))}
      </div>

      <ErrorNote error={list.error} onRetry={list.reload} />
      {list.loading && !list.data ? (
        <Loading label="Loading events…" />
      ) : events.length === 0 && !list.error ? (
        <EmptyState
          icon="calendar-xmark"
          title={tab === 'mine' ? 'Nothing here yet' : tab === 'past' ? 'No past events' : 'No upcoming events'}
          desc={tab === 'mine' && user.role === 'student' ? 'Events you register for appear here.' : undefined}
        />
      ) : (
        <div className="grid-3">
          {events.map((e) => (
            <Card accent pad key={e.id} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div className="spread" style={{ alignItems: 'flex-start', gap: 8 }}>
                <Badge tone="gray" icon="bullhorn">{e.branchScope === 'own_branch' && e.unit ? `${e.unit.code} only` : 'All branches'}</Badge>
                {e.isRegistered && <Badge tone="green" icon="check">Registered</Badge>}
              </div>
              <div className="card-title" style={{ marginTop: 12 }}>{e.title}</div>
              <div style={{ flex: 1, margin: '6px 0 12px' }}><EventMeta event={e} /></div>
              <div className="spread">
                <Chip icon="users">{seats(e)}</Chip>
                <Button variant={e.canManage ? 'out' : 'prim'} size="sm" onClick={() => setOpenId(e.id)}>
                  {e.canManage ? 'Manage' : user.role === 'student' && !e.isPast && !e.isRegistered ? 'View & Register' : 'Details'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {openId && <EventDetail eventId={openId} onClose={() => setOpenId(null)} onChanged={list.reload} />}
    </div>
  );
}
