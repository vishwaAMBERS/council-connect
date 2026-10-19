import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  const base = [
    { to: '/', label: 'Home', icon: 'home' },
    { to: '/council', label: 'Council', icon: 'users' },
    { to: '/events', label: 'Events', icon: 'calendar-alt' },
    { to: '/grievances', label: 'Grievances', icon: 'clipboard-list' },
    { to: '/lost-found', label: 'Lost & Found', icon: 'search' },
    { to: '/campus-map', label: 'Campus Map', icon: 'map-marked-alt' },
  ];

  if (user?.role === 'rep' || user?.role === 'admin') {
    base.push({ to: '/messages', label: 'Inbox', icon: 'envelope' });
  }
  if (user?.role === 'admin') {
    base.push({ to: '/admin', label: 'Admin', icon: 'shield-alt' });
  }

  return (
    <nav className="site-nav">
      <button className={`ham ${open ? 'open' : ''}`} onClick={() => setOpen(!open)} aria-label="Menu">
        <span />
        <span />
        <span />
      </button>
      <div className={`nav-inner ${open ? 'open' : ''}`}>
        {base.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) => `nav-a ${isActive ? 'active' : ''}`}
            onClick={() => setOpen(false)}
          >
            <i className={`fas fa-${l.icon}`} />
            {l.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
