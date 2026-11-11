import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Field, useToast, ErrorNote, ImageInput } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { api } from '../api/client.js';

const today = () => new Date().toISOString().slice(0, 10);

export default function CreateEvent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const places = useApi('/locations');
  const [form, setForm] = useState({
    title: '', description: '', date: '', time: '', locationId: '', venue: '', capacity: '', branchScope: 'all_branches', posterUrl: null,
  });
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  if (!user.canCreateEvents) {
    return (
      <div className="wrap center">
        <h1 className="page-title">Access <em>restricted</em></h1>
        <p className="muted" style={{ marginTop: 8 }}>Only verified representatives can create events.</p>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      // The date and time fields are in the browser's local time zone.
      const startsAt = new Date(`${form.date}T${form.time}`);
      const place = (places.data?.locations || []).find((l) => l.id === form.locationId);
      await api.post('/events', {
        title: form.title.trim(),
        description: form.description.trim(),
        startsAt: Number.isNaN(startsAt.getTime()) ? null : startsAt.toISOString(),
        locationId: form.locationId || undefined,
        venue: [place?.name, form.venue.trim()].filter(Boolean).join(', ') || undefined,
        capacity: form.capacity === '' ? null : Number(form.capacity),
        branchScope: form.branchScope,
        posterUrl: form.posterUrl,
      });
      toast('Event published. Students can now register', 'success');
      navigate('/events');
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  };

  return (
    <div className="wrap" style={{ maxWidth: 760 }}>
      <div className="sec-head">
        <div className="schip"><span className="schip-ln" />Events<span className="schip-ln" /></div>
        <h1 className="page-title">Create an <em>Event</em></h1>
        <p className="muted" style={{ fontSize: '0.85rem' }}>Publishing as {user.name}</p>
      </div>

      <form className="form-card" onSubmit={submit}>
        <ErrorNote error={error || places.error} />
        <Field label="Event Title">
          <input className="input" placeholder="e.g. CodeGECA Hackathon" value={form.title} onChange={set('title')} maxLength={120} required />
        </Field>
        <div className="grid-2" style={{ gap: '0 14px' }}>
          <Field label="Date"><input type="date" className="input" value={form.date} onChange={set('date')} min={today()} required /></Field>
          <Field label="Time"><input type="time" className="input" value={form.time} onChange={set('time')} required /></Field>
        </div>
        <div className="grid-2" style={{ gap: '0 14px' }}>
          <Field label="Campus location" hint="Picking a place pins the event on the campus map.">
            <select className="select" value={form.locationId} onChange={set('locationId')}>
              <option value="">Somewhere else (type the venue)</option>
              {(places.data?.locations || []).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </Field>
          <Field label={form.locationId ? 'Room or detail (optional)' : 'Venue'}>
            <input className="input" placeholder={form.locationId ? 'e.g. Lab 3, first floor' : 'e.g. Room 204'} value={form.venue} onChange={set('venue')} maxLength={120} required={!form.locationId} />
          </Field>
        </div>
        <div className="grid-2" style={{ gap: '0 14px' }}>
          <Field label="Who can attend">
            <select className="select" value={form.branchScope} onChange={set('branchScope')}>
              <option value="all_branches">All branches</option>
              {user.unit && <option value="own_branch">{user.unit.name} only</option>}
            </select>
          </Field>
          <Field label="Capacity (optional)" hint="Leave empty for no limit.">
            <input type="number" className="input" value={form.capacity} onChange={set('capacity')} min={1} step={1} />
          </Field>
        </div>
        <Field label="Description">
          <textarea className="textarea" placeholder="What is happening, who it is for, what to bring…" value={form.description} onChange={set('description')} maxLength={2000} required />
        </Field>
        <Field label="Poster (optional)">
          <ImageInput value={form.posterUrl} onChange={(posterUrl) => setForm((f) => ({ ...f, posterUrl }))} onBusy={setUploading} />
        </Field>
        <div className="row">
          <Button type="submit" lg disabled={busy || uploading}><i className="fas fa-paper-plane" /> {busy ? 'Publishing…' : 'Publish Event'}</Button>
          <Button type="button" variant="ghost" onClick={() => navigate('/events')}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
