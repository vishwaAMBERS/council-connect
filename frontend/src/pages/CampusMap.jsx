import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import { mapPins } from '../data/mock.js';
import { Chip } from '../components/ui.jsx';
import { colors } from '../theme/theme.js';

const iconBlue = L.divIcon({ className: '', html: '<div style="width:18px;height:18px;background:#2266ED;border:3px solid #fff;border-radius:50%;box-shadow:0 3px 10px rgba(34,102,237,.5)"></div>', iconSize: [18, 18] });
const iconGold = L.divIcon({ className: '', html: '<div style="width:18px;height:18px;background:#c8963e;border:3px solid #fff;border-radius:50%;box-shadow:0 3px 10px rgba(200,150,62,.5)"></div>', iconSize: [18, 18] });
const iconGreen = L.divIcon({ className: '', html: '<div style="width:18px;height:18px;background:#1d7a46;border:3px solid #fff;border-radius:50%;box-shadow:0 3px 10px rgba(29,122,70,.5)"></div>', iconSize: [18, 18] });
const iconRed = L.divIcon({ className: '', html: '<div style="width:18px;height:18px;background:#c0392b;border:3px solid #fff;border-radius:50%;box-shadow:0 3px 10px rgba(192,57,43,.5)"></div>', iconSize: [18, 18] });

const pinIcon = (type) => {
  if (type === 'venue') return iconGold;
  if (type === 'hostel') return iconGreen;
  if (type === 'office') return iconRed;
  return iconBlue;
};

const TYPE_LABEL = { department: 'Department', hostel: 'Hostel', venue: 'Venue', office: 'Office' };

export default function CampusMap() {
  const [filter, setFilter] = useState('all');
  const pins = filter === 'all' ? mapPins : mapPins.filter((p) => p.type === filter);

  return (
    <div className="wrap">
      <div className="sec-head">
        <div className="schip"><span className="schip-ln" />Smart Campus Navigation<span className="schip-ln" /></div>
        <h1 className="page-title">Campus <em>Map</em></h1>
        <p className="muted" style={{ fontSize: '0.85rem' }}>
          Navigate departments, hostels, event venues, administrative offices &amp; lost-item locations.
          Powered by OpenStreetMap.
        </p>
      </div>

      <div className="row" style={{ marginBottom: 16, gap: 8 }}>
        {['all', 'department', 'hostel', 'venue', 'office'].map((f) => (
          <Chip key={f} blue={filter === f} onClick={() => setFilter(f)} style={{ cursor: 'pointer' }}>
            {f === 'all' ? 'All' : TYPE_LABEL[f]}
          </Chip>
        ))}
      </div>

      <div style={{ borderRadius: 'var(--r-xl)', overflow: 'hidden', boxShadow: 'var(--sh-lg)', border: '1px solid var(--border)' }}>
        <MapContainer
          center={[19.8753, 75.3435]}
          zoom={16}
          style={{ height: 560, width: '100%' }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {pins.map((p) => (
            <Marker key={p.id} position={[p.lat, p.lng]} icon={pinIcon(p.type)}>
              <Popup>
                <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 800, color: colors.charcoal }}>{p.name}</div>
                <div style={{ fontSize: '11px', color: colors.charcoalMuted }}>
                  <i className="fas fa-tag" style={{ color: colors.blue, marginRight: 4 }} />
                  {TYPE_LABEL[p.type]}
                </div>
              </Popup>
            </Marker>
          ))}
          <CircleMarker center={[19.8753, 75.3435]} radius={120} pathOptions={{ color: colors.blue, opacity: 0.25, fillColor: colors.blue, fillOpacity: 0.06 }} />
        </MapContainer>
      </div>

      <div className="row" style={{ marginTop: 16, gap: 14, fontSize: '0.72rem', color: colors.charcoalMuted }}>
        {Object.entries({ department: 'blue', hostel: 'green', venue: 'gold', office: 'red' }).map(([t, c]) => (
          <span key={t}>
            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: c, marginRight: 5 }} />
            {TYPE_LABEL[t]}
          </span>
        ))}
      </div>
    </div>
  );
}
