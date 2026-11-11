import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Chip, Card, EmptyState, ErrorNote, Loading, InitialsAvatar } from '../components/ui.jsx';
import { useApi } from '../hooks/useApi.js';
import { formatTerm, formatDate } from '../lib/format.js';
import { colors } from '../theme/theme.js';

/** Past council members, browsable by academic year and branch. Records are read-only. */
export default function Archive() {
  const [year, setYear] = useState('');
  const [unit, setUnit] = useState('');
  const meta = useApi('/meta');
  const params = new URLSearchParams();
  if (year) params.set('year', year);
  if (unit) params.set('unit', unit);
  const archive = useApi(`/archive?${params}`);
  const years = archive.data?.years || [];
  const shownYear = archive.data?.year || year;
  const records = archive.data?.records || [];

  // Group by council so each year reads like the directory did at the time.
  const groups = [];
  for (const record of records) {
    const last = groups[groups.length - 1];
    if (last && last.name === record.councilName) last.records.push(record);
    else groups.push({ name: record.councilName, records: [record] });
  }

  return (
    <div className="wrap">
      <div className="sec-head">
        <div className="schip"><span className="schip-ln" />Institutional Memory<span className="schip-ln" /></div>
        <h1 className="page-title">Council <em>Archive</em></h1>
        <p className="muted" style={{ fontSize: '0.85rem', maxWidth: 640 }}>
          Who served on the student council in past academic years, in which position, and what they did during their term.
        </p>
      </div>

      <ErrorNote error={archive.error} onRetry={archive.reload} />

      {archive.loading && !archive.data ? (
        <Loading label="Loading archive…" />
      ) : years.length === 0 && !archive.error ? (
        <EmptyState icon="box-archive" title="The archive is empty" desc="Records appear here when an administrator closes an academic year." />
      ) : (
        <>
          <div className="card" style={{ padding: '1.2rem 1.5rem', marginBottom: '2rem', boxShadow: 'var(--sh-md)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
              <select className="select" value={shownYear} onChange={(e) => setYear(e.target.value)} aria-label="Academic year">
                {years.map((y) => <option key={y} value={y}>Academic year {y}</option>)}
              </select>
              <select className="select" value={unit} onChange={(e) => setUnit(e.target.value)} aria-label="Filter by branch">
                <option value="">All councils</option>
                <option value="MAIN">Main Student Council</option>
                {(meta.data?.units || []).map((u) => <option key={u.code} value={u.code}>{u.name}</option>)}
              </select>
            </div>
          </div>

          {records.length === 0 ? (
            <EmptyState icon="users-slash" title="No records for this selection" desc="Try another branch or year." />
          ) : (
            groups.map((group) => (
              <section key={group.name} style={{ marginBottom: '2rem' }}>
                <h2 className="page-title" style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>
                  {group.name} <span className="faint" style={{ fontSize: '0.8rem', fontFamily: 'inherit', fontWeight: 500 }}>· {shownYear}</span>
                </h2>
                <div className="grid-3">
                  {group.records.map((r) => (
                    <Card accent pad key={r.id} style={{ height: '100%' }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <InitialsAvatar name={r.fullName} size={52} fontSize="1.05rem" />
                        <div style={{ minWidth: 0 }}>
                          <div className="card-title" style={{ fontSize: '1rem' }}>
                            {r.userId ? <Link to={`/council/${r.userId}`} style={{ color: 'inherit', textDecoration: 'none' }}>{r.fullName}</Link> : r.fullName}
                          </div>
                          <Chip blue>{r.positionTitle}</Chip>
                        </div>
                      </div>
                      <div className="muted" style={{ fontSize: '0.76rem', lineHeight: 1.8, marginTop: 12 }}>
                        <div><i className="fas fa-calendar" style={{ color: colors.blue, width: 16, marginRight: 6 }} />{formatTerm(r.termStart, r.termEnd)}</div>
                        <div>
                          <i className="fas fa-shield-halved" style={{ color: colors.blue, width: 16, marginRight: 6 }} />
                          {r.wasVerified ? `Verified by ${r.verifiedByName} on ${formatDate(r.verifiedAt)}` : 'Was not verified'}
                        </div>
                      </div>
                      <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                        <Badge tone="gray" icon="calendar-check">{r.eventsCount} event{r.eventsCount === 1 ? '' : 's'}</Badge>
                        <Badge tone="gray" icon="envelope">{r.requestsHandled} request{r.requestsHandled === 1 ? '' : 's'}</Badge>
                        <Badge tone="gray" icon="clipboard-check">{r.grievancesResolved} complaint{r.grievancesResolved === 1 ? '' : 's'} resolved</Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            ))
          )}
        </>
      )}
    </div>
  );
}
