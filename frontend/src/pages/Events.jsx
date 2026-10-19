import React, { useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Badge, Chip, Button, Modal, Field, useToast, Reveal, Card } from '../components/ui.jsx';
import { eventList, subscribe } from '../data/store.js';
import { colors } from '../theme/theme.js';

export default function Events() {
  const { user } = useAuth();
  const toast = useToast();
  const events = useSyncExternalStore(subscribe, () => eventList);
  const [tab, setTab] = useState('upcoming');
  const [sel, setSel] = useState(null);
  const [regs, setRegs] = useState(events.map((e) => e.registered));

  const isRep = user?.role === 'rep' || user?.role === 'admin';

  const toggleSave = (id) => toast('Saved to your events', 'success');
  const register = (i) => {
    setRegs((r) => r.map((x, idx) => (idx === i ? true : x)));
    toast('Registered for event!', 'success');
  };

  const list = tab === 'saved' ? events.filter((e) => e.saved) : events;

  return (
    <div className="wrap">
      <div className="sec-head">
        <div className="schip"><span className="schip-ln" />Campus Operations<span className="schip-ln" /></div>
        <div className="spread">
          <h1 className="page-title">Event <em>Management</em></h1>
          {isRep && (
            <Link to="/events/new" className="btn-prim">
              <i className="fas fa-plus" /> Create Event
            </Link>
          )}
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: '1.5rem' }}>
        <button className={`tab ${tab === 'upcoming' ? 'active' : ''}`} onClick={() => setTab('upcoming')}>
          <i className="fas fa-calendar" style={{ marginRight: 6 }} /> All Events
        </button>
        <button className={`tab ${tab === 'saved' ? 'active' : ''}`} onClick={() => setTab('saved')}>
          <i className="fas fa-bookmark" style={{ marginRight: 6 }} /> Saved
        </button>
      </div>

      <div className="grid-3">
        {list.map((e, i) => (
          <Reveal key={e.id} delay={`sr-d${(i % 4) + 1}`}>
            <Card accent pad style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Badge tone="blue" icon="star">{e.tag}</Badge>
                <button
                  onClick={() => toggleSave(e.id)}
                  style={{ background: 'none', border: 'none', fontSize: '1.05rem', cursor: 'pointer', color: e.saved ? colors.gold : colors.charcoalFaint }}
                  aria-label="Save"
                >
                  <i className={e.saved ? 'fas fa-bookmark' : 'far fa-bookmark'} />
                </button>
              </div>
              <div className="card-title" style={{ marginTop: 12 }}>{e.title}</div>
              <div className="muted" style={{ fontSize: '0.76rem', lineHeight: 1.7, flex: 1 }}>
                <div><i className="fas fa-calendar-day" style={{ color: colors.blue, width: 16, marginRight: 6 }} />{e.date}</div>
                <div><i className="fas fa-location-dot" style={{ color: colors.blue, width: 16, marginRight: 6 }} />{e.venue}</div>
                <div><i className="fas fa-user-tie" style={{ color: colors.blue, width: 16, marginRight: 6 }} />{e.organizer}</div>
              </div>
              <div className="row" style={{ justifyContent: 'space-between', marginTop: 12 }}>
                <Chip icon="users">{e.registrations}/{e.capacity}</Chip>
                <div className="row">
                  <Button variant="out" size="sm" onClick={() => setSel(e)}>Details</Button>
                  {regs[i] ? (
                    <Badge tone="green"><i className="fas fa-check" /> Registered</Badge>
                  ) : (
                    <Button size="sm" onClick={() => register(i)}>Register</Button>
                  )}
                </div>
              </div>
            </Card>
          </Reveal>
        ))}
      </div>

      {/* Detail modal */}
      <Modal open={!!sel} onClose={() => setSel(null)} title={sel?.title}>
        {sel && (
          <>
            <div className="row" style={{ marginBottom: 12 }}>
              <Badge tone="blue" icon="star">{sel.tag}</Badge>
              <Chip icon="users">{sel.registrations} registered</Chip>
            </div>
            <p style={{ fontSize: '0.84rem', color: colors.charcoalSoft, lineHeight: 1.7 }}>{sel.desc}</p>
            <div className="muted" style={{ fontSize: '0.78rem', marginTop: 12 }}>
              <div><i className="fas fa-calendar-day" style={{ color: colors.blue, width: 16, marginRight: 6 }} />{sel.date}</div>
              <div><i className="fas fa-location-dot" style={{ color: colors.blue, width: 16, marginRight: 6 }} />{sel.venue}</div>
              <div><i className="fas fa-user-tie" style={{ color: colors.blue, width: 16, marginRight: 6 }} />Organized by {sel.organizer}</div>
            </div>
            <div className="row" style={{ marginTop: 16 }}>
              <Button onClick={() => { setSel(null); toast('Registered!', 'success'); }}><i className="fas fa-user-check" /> Register Now</Button>
              <Button variant="ghost" onClick={() => setSel(null)}><i className="fas fa-bookmark" /> Save Event</Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
