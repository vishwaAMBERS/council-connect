import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Field, useToast } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { createEvent } from '../data/store.js';

export default function CreateEvent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({ title: '', tag: 'Workshop', date: '', time: '', venue: '', capacity: 100, desc: '', poster: null });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    createEvent(form, user);
    toast('Event published! Students can now register.', 'success');
    setTimeout(() => navigate('/events'), 600);
  };

  if (user?.role === 'student') {
    return (
      <div className="wrap center">
        <h1 className="page-title">Access <em>restricted</em></h1>
        <p className="muted" style={{ marginTop: 8 }}>Only verified representatives can create events.</p>
      </div>
    );
  }

  return (
    <div className="wrap" style={{ maxWidth: 760 }}>
      <div className="sec-head">
        <div className="schip"><span className="schip-ln" />Events<span className="schip-ln" /></div>
        <h1 className="page-title">Create an <em>Event</em></h1>
        <p className="muted" style={{ fontSize: '0.85rem' }}>Publishing as {user?.name} · {user?.position || 'Representative'}</p>
      </div>

      <form className="form-card" onSubmit={submit}>
        <Field label="Event Title">
          <input className="input" placeholder="e.g. Tech Fest 2026" value={form.title} onChange={set('title')} required />
        </Field>
        <div className="grid-2" style={{ gap: '0 14px' }}>
          <Field label="Category">
            <select className="select" value={form.tag} onChange={set('tag')}>
              {['Workshop', 'Annual Fest', 'Competition', 'Cultural', 'Seminar', 'Placement Drive'].map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Capacity">
            <input type="number" className="input" value={form.capacity} onChange={set('capacity')} min={10} />
          </Field>
        </div>
        <div className="grid-3" style={{ gap: '0 14px' }}>
          <Field label="Date"><input type="date" className="input" value={form.date} onChange={set('date')} required /></Field>
          <Field label="Time"><input type="time" className="input" value={form.time} onChange={set('time')} required /></Field>
          <Field label="Venue"><input className="input" placeholder="e.g. Main Auditorium" value={form.venue} onChange={set('venue')} required /></Field>
        </div>
        <Field label="Poster (optional)">
          <input type="file" className="input" accept="image/*" onChange={(e) => setForm({ ...form, poster: e.target.files?.[0] || null })} />
        </Field>
        <Field label="Description">
          <textarea className="textarea" placeholder="Describe the event, agenda, eligibility..." value={form.desc} onChange={set('desc')} required />
        </Field>
        <div className="row">
          <Button type="submit" lg><i className="fas fa-paper-plane" /> Publish Event</Button>
          <Button type="button" variant="ghost" onClick={() => navigate('/events')}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
