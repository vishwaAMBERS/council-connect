import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Field, useToast, ErrorNote, ImageInput } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';

export default function GrievanceNew() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({ title: '', roomNumber: '', description: '', imageUrl: null });
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  if (user.role !== 'student') {
    return (
      <div className="wrap center">
        <h1 className="page-title">Students <em>only</em></h1>
        <p className="muted" style={{ marginTop: 8 }}>Complaints are submitted from a student account.</p>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { grievance } = await api.post('/grievances', {
        title: form.title.trim(),
        description: form.description.trim(),
        roomNumber: form.roomNumber.trim(),
        imageUrl: form.imageUrl,
      });
      toast('Complaint submitted', 'success');
      navigate(`/grievances/${grievance.id}`);
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  };

  return (
    <div className="wrap" style={{ maxWidth: 760 }}>
      <div className="sec-head">
        <div className="schip"><span className="schip-ln" />Hostel Grievance<span className="schip-ln" /></div>
        <h1 className="page-title">Submit a <em>Complaint</em></h1>
        <p className="muted" style={{ fontSize: '0.85rem' }}>
          Describe the problem. It is categorised and prioritised automatically, and you can track every step.
        </p>
      </div>

      <form className="form-card" onSubmit={submit}>
        <ErrorNote error={error} />
        <div className="grid-2" style={{ gap: '0 14px' }}>
          <Field label="Title">
            <input className="input" placeholder="e.g. Water leakage in room 214" value={form.title} onChange={set('title')} maxLength={120} required />
          </Field>
          <Field label="Room / Location (optional)">
            <input className="input" placeholder="e.g. Hostel C-214" value={form.roomNumber} onChange={set('roomNumber')} maxLength={40} />
          </Field>
        </div>
        <Field label="Description" hint={`${form.description.length}/1000`}>
          <textarea className="textarea" placeholder="What is wrong, since when, and how many people it affects." value={form.description} onChange={set('description')} maxLength={1000} required />
        </Field>
        <Field label="Photo evidence (optional)">
          <ImageInput value={form.imageUrl} onChange={(imageUrl) => setForm((f) => ({ ...f, imageUrl }))} onBusy={setUploading} />
        </Field>
        <div className="row" style={{ marginTop: 4 }}>
          <Button type="submit" lg disabled={busy || uploading}><i className="fas fa-paper-plane" /> {busy ? 'Submitting…' : 'Submit Complaint'}</Button>
          <Button type="button" variant="ghost" onClick={() => navigate('/grievances')}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
