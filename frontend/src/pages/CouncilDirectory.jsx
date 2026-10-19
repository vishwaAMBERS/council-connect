import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Chip, SearchInput, EmptyState, Reveal, Card } from '../components/ui.jsx';
import { councilMembers, branches, positions } from '../data/mock.js';
import { colors } from '../theme/theme.js';

export default function CouncilDirectory() {
  const [q, setQ] = useState('');
  const [branch, setBranch] = useState('All');
  const [position, setPosition] = useState('All');

  const filtered = councilMembers.filter((m) => {
    const matchQ =
      !q ||
      m.name.toLowerCase().includes(q.toLowerCase()) ||
      (m.branch || '').toLowerCase().includes(q.toLowerCase()) ||
      m.position.toLowerCase().includes(q.toLowerCase());
    const matchB = branch === 'All' || m.branch === branch;
    const matchP = position === 'All' || m.position === position;
    return matchQ && matchB && matchP;
  });

  return (
    <div className="wrap">
      <div className="sec-head">
        <div className="schip"><span className="schip-ln" />Governance<span className="schip-ln" /></div>
        <h1 className="page-title">Council <em>Directory</em></h1>
        <p className="muted" style={{ fontSize: '0.85rem', maxWidth: 620 }}>
          Searchable database of verified student representatives. Every member is verified
          through the institutional hierarchy.
        </p>
      </div>

      <div
        className="card"
        style={{
          padding: '14px 18px',
          marginBottom: '1.5rem',
          background: colors.blueSoft,
          borderColor: 'rgba(34,102,237,.15)',
          fontSize: '12px',
          color: colors.charcoalSoft,
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start',
        }}
      >
        <i className="fas fa-envelope-circle-check" style={{ color: colors.blue, marginTop: 2 }} />
        <span>
          Every post has a <strong style={{ color: colors.blueDark }}>permanent forwarding address</strong> —{' '}
          <code>{'{dept}_{post}'}@geca.ac.in</code> (e.g. <code>it_gs@geca.ac.in</code>,{' '}
          <code>cse_hod@geca.ac.in</code>). Emails are forwarded to whoever currently holds the position,
          so the address never changes when people are re-elected or moved.
        </span>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '1.3rem 1.5rem', marginBottom: '2rem', boxShadow: 'var(--sh-md)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px 220px', gap: 14 }}>
          <SearchInput placeholder="Search name, branch, position..." value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="select" value={branch} onChange={(e) => setBranch(e.target.value)}>
            <option>All</option>
            {branches.map((b) => <option key={b}>{b}</option>)}
          </select>
          <select className="select" value={position} onChange={(e) => setPosition(e.target.value)}>
            <option>All</option>
            {positions.map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="users-slash" title="No representatives found" desc="Try adjusting your search or filters." />
      ) : (
        <div className="grid-3">
          {filtered.map((m, i) => (
            <Reveal key={m.id} delay={`sr-d${(i % 4) + 1}`}>
              <Link to={`/council/${m.id}`} style={{ textDecoration: 'none' }}>
                <Card accent pad style={{ height: '100%', textAlign: 'center' }}>
                  <div
                    style={{
                      width: 92,
                      height: 92,
                      borderRadius: '50%',
                      margin: '0 auto 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: "'Fraunces', serif",
                      fontWeight: 900,
                      fontSize: '1.7rem',
                      color: colors.blueDark,
                      background: colors.blueLight,
                      border: '4px solid #fff',
                      boxShadow: '0 8px 28px rgba(0,0,0,.1), 0 0 0 6px rgba(34,102,237,.06)',
                    }}
                  >
                    {m.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                  </div>
                  <div className="card-title">{m.name}</div>
                  <div className="row" style={{ justifyContent: 'center', margin: '6px 0 10px' }}>
                    <Badge tone={m.verified ? 'green' : 'gray'} icon={m.verified ? 'badge-check' : 'hourglass-half'}>
                      {m.verified ? 'Verified' : 'Pending'}
                    </Badge>
                  </div>
                  <Chip blue>{m.position}</Chip>
                  <div className="muted" style={{ fontSize: '0.74rem', marginTop: 8 }}>{m.branch || 'GECA'} · {m.year ? `Year ${m.year}` : 'College Administration'}</div>
                  <div className="faint" style={{ fontSize: '0.7rem', marginTop: 4 }}>Term {m.term}</div>
                </Card>
              </Link>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
