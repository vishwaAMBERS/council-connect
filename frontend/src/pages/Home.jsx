import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { StatBand, Reveal, Card, Badge, Chip } from '../components/ui.jsx';
import { colors } from '../theme/theme.js';

const modules = [
  { to: '/council', icon: 'users', title: 'Council Directory', desc: 'Find verified representatives, browse by branch & position.', tone: 'blue' },
  { to: '/events', icon: 'calendar-alt', title: 'Events', desc: 'Register for events, track attendance and updates.', tone: 'green' },
  { to: '/grievances', icon: 'clipboard-list', title: 'Grievances', desc: 'Submit hostel complaints with AI priority routing.', tone: 'gold' },
  { to: '/lost-found', icon: 'search', title: 'Lost & Found', desc: 'Post or claim items with AI semantic matching.', tone: 'red' },
  { to: '/campus-map', icon: 'map-marked-alt', title: 'Campus Map', desc: 'Navigate departments, hostels, venues & offices.', tone: 'blue' },
  { to: '/messages', icon: 'envelope', title: 'Messages', desc: 'Moderated, approved communication with reps.', tone: 'gray' },
];

export default function Home() {
  const { user } = useAuth();

  const heroTitle = user ? `Welcome, ${user.name.split(' ')[0]}` : 'Campus Governance,';
  const heroEm = user ? 'back online!' : 'Connected.';

  return (
    <div>
      {/* HERO */}
      <div style={{ position: 'relative', background: colors.heroDark, color: '#fff', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 70% at 70% 10%, rgba(34,102,237,.35) 0%, transparent 60%)', pointerEvents: 'none' }} />
        <div className="wrap" style={{ position: 'relative' }}>
          <div className="schip" style={{ color: '#90b7ff' }}>
            <span className="schip-ln" style={{ background: '#90b7ff' }} />
            AI-Augmented Campus Ecosystem
          </div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 900, fontSize: 'clamp(2.2rem, 4.5vw, 3.6rem)', lineHeight: 1.05, letterSpacing: '-.5px' }}>
            {heroTitle} <em style={{ color: '#90b7ff', fontStyle: 'italic' }}>{heroEm}</em>
          </h1>
          <p style={{ marginTop: 12, maxWidth: 560, fontSize: '0.9rem', color: 'rgba(255,255,255,.75)' }}>
            Verified student governance, structured communication, events, grievance handling,
            lost &amp; found, and smart campus navigation — unified in one place.
          </p>
          <div className="row" style={{ marginTop: 22 }}>
            {user ? (
              <Link to="/council" className="btn-prim">
                Explore Council <i className="fas fa-arrow-right" />
              </Link>
            ) : (
              <>
                <Link to="/register" className="btn-prim">
                  Get Started <i className="fas fa-arrow-right" />
                </Link>
                <Link to="/login" className="btn-out" style={{ borderColor: 'rgba(255,255,255,.5)', color: '#fff' }}>
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* STATS BAND */}
      <StatBand
        items={[
          { icon: 'users', num: '42', ac: '+', label: 'Active Representatives' },
          { icon: 'calendar-alt', num: '24', ac: '', label: 'Events Hosted' },
          { icon: 'clipboard-list', num: '45', ac: '+', label: 'Grievances Resolved' },
          { icon: 'search', num: '60', ac: '+', label: 'Items Recovered' },
          { icon: 'envelope', num: '186', ac: '', label: 'Comms Threads' },
        ]}
      />

      {/* MODULE GRID */}
      <div className="wrap-sm">
        <div className="sec-head">
          <div className="schip"><span className="schip-ln" />Platform Modules<span className="schip-ln" /></div>
          <h2 className="page-title">Everything, in one <em>ecosystem</em></h2>
        </div>
        <div className="grid-3">
          {modules.map((m, i) => (
            <Reveal key={m.to} delay={`sr-d${(i % 4) + 1}`}>
              <Link to={m.to} style={{ textDecoration: 'none', display: 'block' }}>
                <Card accent pad style={{ height: '100%' }}>
                  <div style={{ width: 54, height: 54, borderRadius: '50%', background: colors.blueLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', color: colors.blue, marginBottom: 14 }}>
                    <i className={`fas fa-${m.icon}`} />
                  </div>
                  <div className="card-title">{m.title}</div>
                  <p style={{ fontSize: '0.78rem', color: colors.charcoalMuted, lineHeight: 1.6 }}>{m.desc}</p>
                  <span className="rml" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: colors.blue, fontWeight: 700, fontSize: '0.75rem', marginTop: 12 }}>
                    Open <i className="fas fa-arrow-right" />
                  </span>
                </Card>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>

      {/* NOTICE STRIP */}
      <div className="wrap-sm">
        <Reveal>
          <div className="card" style={{ padding: '1.6rem 1.8rem', background: colors.blueSoft, borderColor: 'rgba(34,102,237,.15)', display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.blue, fontSize: '1.1rem', boxShadow: 'var(--sh-sm)', flexShrink: 0 }}>
              <i className="fas fa-shield-halved" />
            </div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 800, color: colors.charcoal }}>Verification-backed communication</div>
              <p style={{ fontSize: '0.78rem', color: colors.charcoalMuted }}>Students cannot directly DM representatives. Every conversation starts with an AI-categorized contact request that must be approved — keeping all campus communication accountable and traceable.</p>
            </div>
            <div className="row" style={{ gap: 6 }}>
              <Badge tone="blue"><i className="fas fa-check" /> Verified</Badge>
              <Badge tone="green"><i className="fas fa-layer-group" /> Audit Logged</Badge>
            </div>
          </div>
        </Reveal>
      </div>

      {/* QUICK ACTIONS FOR USER */}
      {user && (
        <div className="wrap-sm">
          <div className="sec-head">
            <div className="schip"><span className="schip-ln" />Quick Actions<span className="schip-ln" /></div>
            <h2 className="page-title">Where do you want to <em>go?</em></h2>
          </div>
          <div className="row" style={{ gap: 10 }}>
            <Link to="/grievances/new" className="btn-prim btn-sm"><i className="fas fa-plus" /> File a Complaint</Link>
            <Link to="/events" className="btn-out btn-sm"><i className="fas fa-calendar-plus" /> Find Events</Link>
            <Link to="/lost-found/new" className="btn-out btn-sm"><i className="fas fa-plus" /> Report Lost Item</Link>
            <Link to="/campus-map" className="btn-out btn-sm"><i className="fas fa-location-dot" /> Navigate Campus</Link>
          </div>
        </div>
      )}
    </div>
  );
}
