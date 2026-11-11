import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Chip, SearchInput, EmptyState, Card, InitialsAvatar, VerifiedBadge, ErrorNote, Loading } from '../components/ui.jsx';
import { useApi } from '../hooks/useApi.js';
import { formatTerm } from '../lib/format.js';

export default function CouncilDirectory() {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [unit, setUnit] = useState('');
  const [position, setPosition] = useState('');

  // Search as the user types, without a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const meta = useApi('/meta');
  const params = new URLSearchParams();
  if (debounced) params.set('search', debounced);
  if (unit) params.set('unit', unit);
  if (position) params.set('position', position);
  const directory = useApi(`/directory?${params}`);
  const members = directory.data?.members || [];

  return (
    <div className="wrap">
      <div className="sec-head">
        <div className="schip"><span className="schip-ln" />Governance<span className="schip-ln" /></div>
        <h1 className="page-title">Council <em>Directory</em></h1>
        <p className="muted" style={{ fontSize: '0.85rem', maxWidth: 620 }}>
          Every active council member across GECA. A green badge means the appointment has been
          verified through the institutional hierarchy.
        </p>
      </div>

      <div className="card" style={{ padding: '1.3rem 1.5rem', marginBottom: '2rem', boxShadow: 'var(--sh-md)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          <SearchInput placeholder="Search by name or position…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search council members" />
          <select className="select" value={unit} onChange={(e) => setUnit(e.target.value)} aria-label="Filter by branch">
            <option value="">All branches</option>
            <option value="MAIN">Main Student Council</option>
            {(meta.data?.units || []).map((u) => <option key={u.code} value={u.code}>{u.name}</option>)}
          </select>
          <select className="select" value={position} onChange={(e) => setPosition(e.target.value)} aria-label="Filter by position">
            <option value="">All positions</option>
            {(meta.data?.positionGroups || []).map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}
          </select>
        </div>
      </div>

      <ErrorNote error={directory.error} onRetry={directory.reload} />

      {directory.loading && !directory.data ? (
        <Loading label="Loading council members…" />
      ) : members.length === 0 && !directory.error ? (
        <>
          <EmptyState icon="users-slash" title="No council members found" desc="Try a different search or clear the filters. Past councils are in the archive." />
          <div className="center"><Link to="/archive" className="btn-out btn-sm">Open the Council Archive</Link></div>
        </>
      ) : (
        <>
          <div className="faint" style={{ fontSize: '0.75rem', marginBottom: 12 }}>
            {members.length} member{members.length === 1 ? '' : 's'}
          </div>
          <div className="grid-3">
            {members.map((m) => (
              <Link key={m.profileId} to={`/council/${m.userId}`} style={{ textDecoration: 'none' }}>
                <Card accent pad style={{ height: '100%', textAlign: 'center' }}>
                  <InitialsAvatar
                    name={m.fullName}
                    src={m.avatarUrl}
                    style={{ margin: '0 auto 14px', border: '4px solid #fff', boxShadow: '0 8px 28px rgba(0,0,0,.1), 0 0 0 6px rgba(34,102,237,.06)' }}
                  />
                  <div className="card-title">{m.fullName}</div>
                  <div className="row" style={{ justifyContent: 'center', margin: '6px 0 10px' }}>
                    <VerifiedBadge verified={m.isVerified} />
                  </div>
                  <Chip blue>{m.positionTitle}</Chip>
                  <div className="muted" style={{ fontSize: '0.74rem', marginTop: 8 }}>
                    {m.unit ? m.unit.name : m.council.name}
                  </div>
                  <div className="faint" style={{ fontSize: '0.7rem', marginTop: 4 }}>{formatTerm(m.termStart, m.termEnd)}</div>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
