import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Badge, Chip, Button, useToast, Modal, Field, EmptyState, ErrorNote, Loading, ImageInput, STATUS_TONE, statusLabel } from '../components/ui.jsx';
import { useApi } from '../hooks/useApi.js';
import { api, assetUrl } from '../api/client.js';
import { formatDateTime, timeAgo } from '../lib/format.js';
import { colors } from '../theme/theme.js';

const EMPTY_FORM = { type: 'lost', title: '', description: '', locationId: '', location: '', occurredOn: '', imageUrl: null };
const today = () => new Date().toISOString().slice(0, 10);

function ItemThumb({ item, size = 64 }) {
  return item.imageUrl ? (
    <img src={assetUrl(item.imageUrl)} alt="" style={{ width: size, height: size, objectFit: 'cover', borderRadius: 14, flexShrink: 0 }} />
  ) : (
    <div style={{ width: size, height: size, borderRadius: 14, background: colors.blueLight, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.blue, fontSize: '1.2rem', flexShrink: 0 }}>
      <i className={`fas fa-${item.type === 'found' ? 'box-open' : 'magnifying-glass'}`} />
    </div>
  );
}

const TypeBadge = ({ type }) => (
  <Badge tone={type === 'lost' ? 'gold' : 'green'} icon={type === 'lost' ? 'circle-question' : 'circle-check'}>{type === 'lost' ? 'Lost' : 'Found'}</Badge>
);

/** Private conversation between the two people whose reports were matched. */
function MatchThread({ matchId, onClose }) {
  const { user } = useAuth();
  const thread = useApi(`/lost-found/matches/${matchId}/messages`, { pollMs: 10000 });
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const endRef = useRef(null);
  const match = thread.data?.match;
  const messages = thread.data?.messages || [];

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' });
  }, [messages.length]);

  const send = async (e) => {
    e.preventDefault();
    const content = reply.trim();
    if (!content || busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/lost-found/matches/${matchId}/messages`, { content });
      setReply('');
      await thread.reload();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={match ? `Possible match with ${match.otherPartyName}` : 'Possible match'}>
      <ErrorNote error={error || thread.error} />
      {!match ? (
        !thread.error && <Loading />
      ) : (
        <>
          <div className="grid-2" style={{ gap: 10 }}>
            {[match.lost, match.found].map((item, i) => (
              <div key={item.id} style={{ background: colors.whiteTint, borderRadius: 12, padding: '10px 12px' }}>
                <div className="row" style={{ gap: 6, marginBottom: 6 }}>
                  <TypeBadge type={i === 0 ? 'lost' : 'found'} />
                  {item.isMine && <Badge tone="blue">Yours</Badge>}
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.84rem' }}>{item.title}</div>
                <p style={{ fontSize: '0.76rem', color: colors.charcoalMuted, margin: '4px 0', overflowWrap: 'anywhere' }}>{item.description}</p>
                <div className="faint" style={{ fontSize: '0.72rem' }}><i className="fas fa-location-dot" style={{ marginRight: 4 }} />{item.location}</div>
              </div>
            ))}
          </div>
          <p className="faint" style={{ fontSize: '11px', margin: '10px 0' }}>
            Suggested automatically from the two descriptions ({Math.round(match.score * 100)}% similar). Confirm the details here before meeting; no contact details are shared.
          </p>

          <div role="log" aria-label="Messages" style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, padding: '6px 0' }}>
            {messages.length === 0 && <p className="faint center" style={{ fontSize: '0.8rem' }}>No messages yet. Ask something only the owner would know.</p>}
            {messages.map((m) => {
              const mine = m.senderId === user.id;
              return (
                <div key={m.id} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                  <div style={{ background: mine ? 'linear-gradient(135deg,#2266ED,#3b7af8)' : colors.whiteTint, color: mine ? '#fff' : colors.charcoal, padding: '8px 13px', borderRadius: mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px', fontSize: '0.82rem', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                    {m.content}
                  </div>
                  <div className="faint" style={{ fontSize: '10px', marginTop: 2, textAlign: mine ? 'right' : 'left' }}>{formatDateTime(m.sentAt)}</div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>
          <form className="row" onSubmit={send} style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <input className="input" placeholder="Type a message…" aria-label="Message" value={reply} onChange={(e) => setReply(e.target.value)} maxLength={1000} />
            <Button type="submit" disabled={busy || !reply.trim()} aria-label="Send message"><i className="fas fa-paper-plane" /></Button>
          </form>
        </>
      )}
    </Modal>
  );
}

export default function LostFound() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const openMatch = searchParams.get('match');
  const [tab, setTab] = useState('all');
  const items = useApi('/lost-found', { pollMs: 30000 });
  const matches = useApi('/lost-found/matches', { pollMs: 30000 });
  const places = useApi('/locations');
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const all = items.data?.items || [];
  const myMatches = matches.data?.matches || [];
  const list = tab === 'mine' ? all.filter((i) => i.isMine) : tab === 'all' ? all.filter((i) => i.status !== 'resolved') : all.filter((i) => i.type === tab && i.status !== 'resolved');
  const matchesFor = (item) => myMatches.filter((m) => m.lost.id === item.id || m.found.id === item.id);
  const showMatch = (id) => setSearchParams(id ? { match: id } : {});

  const post = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await api.post('/lost-found', {
        type: form.type,
        title: form.title.trim(),
        description: form.description.trim(),
        locationId: form.locationId || undefined,
        location: form.location.trim() || undefined,
        occurredOn: form.occurredOn || undefined,
        imageUrl: form.imageUrl,
      });
      toast(result.matchCount > 0 ? `Posted. ${result.matchCount} possible match${result.matchCount > 1 ? 'es' : ''} found` : 'Posted. You will be notified if a matching report comes in', 'success');
      setForm(EMPTY_FORM);
      setTab('mine');
      await Promise.all([items.reload(), matches.reload()]);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const resolve = async (item) => {
    try {
      await api.post(`/lost-found/${item.id}/resolve`);
      toast('Marked as resolved', 'success');
      await items.reload();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <div className="wrap">
      <div className="sec-head">
        <div className="schip"><span className="schip-ln" />Campus Operations<span className="schip-ln" /></div>
        <h1 className="page-title">Lost &amp; <em>Found</em></h1>
        <p className="muted" style={{ fontSize: '0.85rem', maxWidth: 640 }}>
          Report something you lost or found. New reports are compared with existing ones, and both people are notified when two look alike.
        </p>
      </div>

      <div className="tabs" style={{ marginBottom: '1.5rem' }}>
        {[['all', 'layer-group', 'All'], ['lost', 'circle-question', 'Lost'], ['found', 'circle-check', 'Found'], ['mine', 'user', `My Reports${myMatches.length ? ` (${myMatches.length} match${myMatches.length > 1 ? 'es' : ''})` : ''}`]].map(([key, icon, label]) => (
          <button key={key} className={`tab ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>
            <i className={`fas fa-${icon}`} style={{ marginRight: 6 }} /> {label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 380px)', gap: '2rem', alignItems: 'start' }}>
        <div>
          <ErrorNote error={items.error} onRetry={items.reload} />
          {items.loading && !items.data ? (
            <Loading />
          ) : list.length === 0 && !items.error ? (
            <EmptyState icon="box-open" title={tab === 'mine' ? 'You have not posted anything' : 'No open reports'} desc="Use the form to report a lost or found item." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {list.map((item) => (
                <div key={item.id} className="card-accent">
                  <div className="spread" style={{ gap: 8 }}>
                    <div className="row" style={{ gap: 6 }}>
                      <TypeBadge type={item.type} />
                      {item.status !== 'open' && <Badge tone={STATUS_TONE[item.status] || 'gray'}>{statusLabel(item.status)}</Badge>}
                      {item.isMine && <Badge tone="blue">Yours</Badge>}
                    </div>
                    <span className="faint" style={{ fontSize: '0.72rem' }}>{timeAgo(item.createdAt)}</span>
                  </div>
                  <div style={{ marginTop: 12, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <ItemThumb item={item} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="card-title" style={{ fontSize: '1rem' }}>{item.title}</div>
                      <p style={{ fontSize: '0.78rem', color: colors.charcoalMuted, lineHeight: 1.6, overflowWrap: 'anywhere' }}>{item.description}</p>
                      <div className="row" style={{ marginTop: 8, gap: 6, flexWrap: 'wrap' }}>
                        <Chip icon="location-dot">{item.location}</Chip>
                        {!item.isMine && <Chip icon="user">{item.postedByName}</Chip>}
                      </div>
                      {item.isMine && (
                        <div className="row" style={{ marginTop: 10, gap: 8, flexWrap: 'wrap' }}>
                          {matchesFor(item).map((m) => (
                            <Button key={m.id} size="sm" onClick={() => showMatch(m.id)}>
                              <i className="fas fa-link" /> Possible match: {m.otherPartyName}{m.messageCount ? ` (${m.messageCount})` : ''}
                            </Button>
                          ))}
                          {item.status !== 'resolved' && (
                            <Button size="sm" variant="ghost" onClick={() => resolve(item)}><i className="fas fa-check" /> Mark resolved</Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card" style={{ padding: '1.6rem', position: 'sticky', top: 'calc(var(--total-sticky) + 1rem)' }}>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '1.1rem', marginBottom: 14 }}>Report an item</h3>
          <form onSubmit={post}>
            <ErrorNote error={error} />
            <Field label="Type">
              <select className="select" value={form.type} onChange={set('type')}>
                <option value="lost">I lost an item</option>
                <option value="found">I found an item</option>
              </select>
            </Field>
            <Field label="Item">
              <input className="input" placeholder="e.g. Blue water bottle" value={form.title} onChange={set('title')} maxLength={100} required />
            </Field>
            <Field label="Description" hint="Colour, brand, marks. These details are what reports are matched on.">
              <textarea className="textarea" value={form.description} onChange={set('description')} maxLength={500} required />
            </Field>
            <Field label={form.type === 'lost' ? 'Last seen at' : 'Found at'}>
              <select className="select" value={form.locationId} onChange={set('locationId')}>
                <option value="">Somewhere else (type below)</option>
                {(places.data?.locations || []).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </Field>
            {!form.locationId && (
              <Field label="Place">
                <input className="input" placeholder="e.g. Bus stop near gate 2" value={form.location} onChange={set('location')} maxLength={120} required />
              </Field>
            )}
            <Field label="Date (optional)">
              <input type="date" className="input" value={form.occurredOn} onChange={set('occurredOn')} max={today()} />
            </Field>
            <Field label="Photo (optional)">
              <ImageInput value={form.imageUrl} onChange={(imageUrl) => setForm((f) => ({ ...f, imageUrl }))} onBusy={setUploading} />
            </Field>
            <Button type="submit" lg style={{ width: '100%' }} disabled={busy || uploading}>
              <i className="fas fa-paper-plane" /> {busy ? 'Posting…' : 'Post Report'}
            </Button>
          </form>
        </div>
      </div>

      {openMatch && <MatchThread matchId={openMatch} onClose={() => showMatch(null)} />}
    </div>
  );
}
