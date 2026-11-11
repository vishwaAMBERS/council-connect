import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Chip, ErrorNote, Loading } from '../components/ui.jsx';
import { useApi } from '../hooks/useApi.js';
import { formatDateTime } from '../lib/format.js';
import { colors } from '../theme/theme.js';

const TYPES = {
  department: { label: 'Departments', color: '#2266ED' },
  hostel: { label: 'Hostels', color: '#1d7a46' },
  office: { label: 'Offices', color: '#c0392b' },
  venue: { label: 'Venues', color: '#c8963e' },
  facility: { label: 'Facilities', color: '#6b4fbb' },
};

// A dot per place; a ring is added when something is happening there (event or lost/found report).
const icon = (color, busy) =>
  L.divIcon({
    className: '',
    html: `<div style="width:18px;height:18px;background:${color};border:3px solid #fff;border-radius:50%;box-shadow:0 0 0 ${busy ? 4 : 0}px ${color}55, 0 3px 10px rgba(0,0,0,.3)"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
  });

const CENTER = [19.8750, 75.3438];

export default function CampusMap() {
  const [filter, setFilter] = useState('all');
  const map = useApi('/map');
  const locations = map.data?.locations || [];
  const eventsAt = (id) => (map.data?.events || []).filter((e) => e.locationId === id);
  const itemsAt = (id) => (map.data?.items || []).filter((i) => i.locationId === id);

  const shown = locations.filter((l) => {
    if (filter === 'all') return true;
    if (filter === 'events') return eventsAt(l.id).length > 0;
    if (filter === 'lost_found') return itemsAt(l.id).length > 0;
    return l.type === filter;
  });

  const filters = [
    ['all', 'All'],
    ...Object.entries(TYPES).map(([key, t]) => [key, t.label]),
    ['events', 'Event venues'],
    ['lost_found', 'Lost & found'],
  ];

  return (
    <div className="wrap">
      <div className="sec-head">
        <div className="schip"><span className="schip-ln" />Smart Campus Navigation<span className="schip-ln" /></div>
        <h1 className="page-title">Campus <em>Map</em></h1>
        <p className="muted" style={{ fontSize: '0.85rem' }}>
          Departments, hostels, offices and venues, with upcoming events and lost-and-found reports pinned where they are. Map data from OpenStreetMap.
        </p>
      </div>

      <ErrorNote error={map.error} onRetry={map.reload} />

      <div className="row" style={{ marginBottom: 16, gap: 8, flexWrap: 'wrap' }}>
        {filters.map(([key, label]) => (
          <button key={key} type="button" onClick={() => setFilter(key)} aria-pressed={filter === key} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
            <Chip blue={filter === key}>{label}</Chip>
          </button>
        ))}
      </div>

      {map.loading && !map.data ? (
        <Loading label="Loading map…" />
      ) : (
        <div style={{ borderRadius: 'var(--r-xl)', overflow: 'hidden', boxShadow: 'var(--sh-lg)', border: '1px solid var(--border)' }}>
          <MapContainer center={CENTER} zoom={17} style={{ height: 560, width: '100%' }} scrollWheelZoom>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {shown.map((l) => {
              const events = eventsAt(l.id);
              const items = itemsAt(l.id);
              return (
                <Marker key={l.id} position={[l.lat, l.lng]} icon={icon(TYPES[l.type].color, events.length + items.length > 0)} title={l.name}>
                  <Popup>
                    <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 800, color: colors.charcoal }}>{l.name}</div>
                    {l.description && <div style={{ fontSize: '11px', color: colors.charcoalMuted, margin: '2px 0 4px' }}>{l.description}</div>}
                    {events.map((e) => (
                      <div key={e.id} style={{ fontSize: '11px', marginTop: 4 }}>
                        <i className="fas fa-calendar-day" style={{ color: colors.blue, marginRight: 4 }} />
                        <Link to="/events">{e.title}</Link> · {formatDateTime(e.startsAt)}
                      </div>
                    ))}
                    {items.map((i) => (
                      <div key={i.id} style={{ fontSize: '11px', marginTop: 4 }}>
                        <i className={`fas fa-${i.type === 'lost' ? 'circle-question' : 'circle-check'}`} style={{ color: colors.blue, marginRight: 4 }} />
                        <Link to="/lost-found">{i.type === 'lost' ? 'Lost' : 'Found'}: {i.title}</Link>
                      </div>
                    ))}
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      )}

      <div className="row" style={{ marginTop: 16, gap: 14, fontSize: '0.74rem', color: colors.charcoalMuted, flexWrap: 'wrap' }}>
        {Object.entries(TYPES).map(([key, t]) => (
          <span key={key}>
            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: t.color, marginRight: 5 }} />
            {t.label}
          </span>
        ))}
        <span>
          <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#999', boxShadow: '0 0 0 3px #9995', marginRight: 7 }} />
          Ring: an event or lost/found report here
        </span>
      </div>

      {shown.length > 0 && (
        <details style={{ marginTop: 18 }}>
          <summary className="muted" style={{ fontSize: '0.8rem', cursor: 'pointer' }}>List of places shown ({shown.length})</summary>
          <ul style={{ fontSize: '0.8rem', color: colors.charcoalSoft, marginTop: 8, paddingLeft: 18, lineHeight: 1.8 }}>
            {shown.map((l) => (
              <li key={l.id}>
                <strong>{l.name}</strong>{l.description ? `: ${l.description}` : ''}
                {eventsAt(l.id).map((e) => ` · Event: ${e.title}`).join('')}
                {itemsAt(l.id).map((i) => ` · ${i.type === 'lost' ? 'Lost' : 'Found'}: ${i.title}`).join('')}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
