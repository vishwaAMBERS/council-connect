import React from 'react';
import { ErrorNote, Loading, EmptyState } from '../components/ui.jsx';
import { useApi } from '../hooks/useApi.js';
import { formatDateTime } from '../lib/format.js';
import { colors } from '../theme/theme.js';

const CATEGORY_LABEL = {
  academic: 'Academic', personal: 'Personal', event: 'Event', urgent: 'Urgent', uncategorised: 'Not categorised yet',
  electrical: 'Electrical', water: 'Water', wifi: 'Wi-Fi', mess: 'Mess', infrastructure: 'Infrastructure',
  low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical',
};

/** A duration given in hours, shown in the unit that reads best. */
const hours = (value) => {
  if (value === null) return '—';
  if (value < 1) return value * 60 < 1 ? 'under 1 min' : `${Math.round(value * 60)} min`;
  if (value < 48) return `${Math.round(value * 10) / 10} h`;
  return `${Math.round((value / 24) * 10) / 10} days`;
};
const percent = (value) => (value === null ? '—' : `${value}%`);

/** A headline number. `note` explains what it measures when the label alone is ambiguous. */
function Tile({ label, value, note }) {
  return (
    <div className="card" style={{ padding: '1.1rem 1.2rem' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: colors.charcoalMuted, textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}</div>
      <div style={{ fontFamily: "'Fraunces', serif", fontSize: '1.9rem', fontWeight: 900, color: colors.charcoal, lineHeight: 1.2, marginTop: 4 }}>{value}</div>
      {note && <div className="faint" style={{ fontSize: '11px', marginTop: 2 }}>{note}</div>}
    </div>
  );
}

const Tiles = ({ children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem' }}>{children}</div>
);

/**
 * Horizontal bars for comparing magnitudes: one hue, value printed beside each bar,
 * so the list reads as a table as well as a chart.
 */
function BarList({ rows, valueLabel = (v) => v, empty = 'No data yet.' }) {
  if (rows.length === 0) return <p className="faint" style={{ fontSize: '0.8rem' }}>{empty}</p>;
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div role="table" style={{ display: 'grid', gridTemplateColumns: 'minmax(90px, max-content) 1fr max-content', gap: '8px 12px', alignItems: 'center', fontSize: '0.8rem' }}>
      {rows.map((r) => (
        <div role="row" key={r.label} title={`${r.label}: ${valueLabel(r.value)}${r.detail ? ` (${r.detail})` : ''}`} style={{ display: 'contents' }}>
          <span role="cell" style={{ color: colors.charcoalSoft, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>{r.label}</span>
          <span role="cell" style={{ height: 10, background: colors.whiteTint, borderRadius: 4 }}>
            <span style={{ display: 'block', height: '100%', width: `${(r.value / max) * 100}%`, minWidth: r.value > 0 ? 3 : 0, background: colors.blue, borderRadius: 4 }} />
          </span>
          <span role="cell" style={{ fontWeight: 700, color: colors.charcoal, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
            {valueLabel(r.value)}{r.detail && <span className="faint" style={{ fontWeight: 500 }}> · {r.detail}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

function Panel({ title, subtitle, children }) {
  return (
    <div className="card-accent">
      <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '1.05rem' }}>{title}</h3>
      {subtitle && <p className="faint" style={{ fontSize: '0.74rem', margin: '2px 0 12px' }}>{subtitle}</p>}
      <div style={{ marginTop: subtitle ? 0 : 12 }}>{children}</div>
    </div>
  );
}

const Section = ({ title, children }) => (
  <section style={{ marginBottom: '2.2rem' }}>
    <h2 className="page-title" style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>{title}</h2>
    {children}
  </section>
);

export default function AdminAnalytics() {
  const analytics = useApi('/analytics', { pollMs: 60000 });
  const d = analytics.data;

  if (analytics.loading && !d) return <Loading label="Loading analytics…" />;
  if (!d) return <ErrorNote error={analytics.error} onRetry={analytics.reload} />;

  const { governance: g, events: e, grievances: c, lostFound: lf, engagement } = d;
  const nothingYet = g.requests.total + e.total + c.total + lf.total === 0;

  return (
    <>
      <ErrorNote error={analytics.error} onRetry={analytics.reload} />
      <p className="faint" style={{ fontSize: '0.74rem', marginBottom: '1.2rem' }}>
        Live figures from the platform, as of {formatDateTime(d.generatedAt)}.
      </p>
      {nothingYet && <EmptyState icon="chart-simple" title="No activity yet" desc="Numbers appear here as people use the platform." />}

      <Section title="Governance">
        <Tiles>
          <Tile label="Active council members" value={g.activeMembers} />
          <Tile label="Verified" value={g.verifiedMembers} note={g.activeMembers ? `${Math.round((g.verifiedMembers / g.activeMembers) * 100)}% of members` : undefined} />
          <Tile label="Awaiting verification" value={g.unverifiedMembers} />
          <Tile label="Contact requests" value={g.requests.total} note={`${g.requests.pending} pending`} />
          <Tile label="Avg response time" value={hours(g.requests.avgResponseHours)} note="request sent to approve / decline" />
        </Tiles>
        <div className="grid-2" style={{ marginTop: '1.2rem' }}>
          <Panel title="Members by council" subtitle="Bar length is the number of members; verified count beside it.">
            <BarList rows={g.byCouncil.map((x) => ({ label: x.code === 'MAIN' ? 'Main council' : x.code, value: x.total, detail: `${x.verified} verified` }))} />
          </Panel>
          <Panel title="Requests by category" subtitle="Category assigned automatically when a request is sent.">
            <BarList rows={g.requestsByCategory.map((x) => ({ label: CATEGORY_LABEL[x.category] || x.category, value: x.count }))} empty="No contact requests yet." />
          </Panel>
        </div>
        <div style={{ marginTop: '1.2rem' }}>
          <Panel title="Requests per representative" subtitle="Who is contacted most, and how quickly they respond.">
            <BarList
              rows={g.requestsByRepresentative.map((x) => ({
                label: x.fullName,
                value: x.total,
                detail: [x.pending ? `${x.pending} pending` : null, x.avgResponseHours !== null ? `avg ${hours(x.avgResponseHours)}` : null].filter(Boolean).join(', ') || undefined,
              }))}
              empty="No contact requests yet."
            />
          </Panel>
        </div>
      </Section>

      <Section title="Events">
        <Tiles>
          <Tile label="Events" value={e.total} note={`${e.upcoming} upcoming`} />
          <Tile label="Registrations" value={e.registrations} />
          <Tile label="Attendance rate" value={percent(e.attendanceRate)} note="of registrations for past events" />
          <Tile label="Student engagement" value={percent(e.engagementRate)} note="students registered for at least one event" />
        </Tiles>
        <div className="grid-2" style={{ marginTop: '1.2rem' }}>
          <Panel title="Most registered events">
            <BarList rows={e.top.map((x) => ({ label: x.title, value: x.registrations, detail: x.capacity ? `of ${x.capacity}` : undefined }))} empty="No events yet." />
          </Panel>
          <Panel title="Events by organising branch">
            <BarList rows={e.byUnit.map((x) => ({ label: x.code, value: x.count }))} empty="No events yet." />
          </Panel>
        </div>
      </Section>

      <Section title="Hostel complaints">
        <Tiles>
          <Tile label="Complaints" value={c.total} note={`${c.open} open`} />
          <Tile label="Resolved" value={c.resolved} />
          <Tile label="Escalated" value={c.escalated} note={`${c.escalatedOpen} still open`} />
          <Tile label="Avg resolution time" value={hours(c.avgResolutionHours)} note="submitted to resolved" />
        </Tiles>
        <div className="grid-2" style={{ marginTop: '1.2rem' }}>
          <Panel title="Complaints by category">
            <BarList rows={c.byCategory.map((x) => ({ label: CATEGORY_LABEL[x.category] || x.category, value: x.count, detail: x.open ? `${x.open} open` : undefined }))} empty="No complaints yet." />
          </Panel>
          <Panel title="Complaints by priority">
            <BarList rows={c.byPriority.map((x) => ({ label: CATEGORY_LABEL[x.priority] || x.priority, value: x.count }))} empty="No complaints yet." />
          </Panel>
        </div>
      </Section>

      <Section title="Engagement and lost & found">
        <Tiles>
          <Tile label="Students" value={engagement.students} />
          <Tile label="Active in the last 7 days" value={engagement.activeLast7Days} note="people who sent, registered or posted something" />
          <Tile label="Lost & found reports" value={lf.total} note={`${lf.open} open`} />
          <Tile label="Matched" value={lf.matched} note={`${lf.resolved} resolved`} />
        </Tiles>
      </Section>
    </>
  );
}
