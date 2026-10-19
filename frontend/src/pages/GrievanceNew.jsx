import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Field, useToast, Chip } from '../components/ui.jsx';
import { complaintCategories } from '../data/mock.js';
import { colors } from '../theme/theme.js';

export default function GrievanceNew() {
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({ title: '', category: '', room: '', desc: '', image: null });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const [aiResult, setAiResult] = useState(null);

  const analyze = (e) => {
    e.preventDefault();
    setAiResult({
      category: form.category || 'Infrastructure issues',
      priority: 'high',
      note: 'Keywords matched (water/leakage) — assigned High priority. Will route to Warden Office.',
    });
    toast('AI categorization complete', 'success');
  };

  const submit = () => {
    toast('Complaint submitted with high priority', 'success');
    setTimeout(() => navigate('/grievances'), 700);
  };

  return (
    <div className="wrap" style={{ maxWidth: 760 }}>
      <div className="sec-head">
        <div className="schip"><span className="schip-ln" />Hostel Grievance<span className="schip-ln" /></div>
        <h1 className="page-title">Submit a <em>Complaint</em></h1>
        <p className="muted" style={{ fontSize: '0.85rem' }}>
          Your complaint is AI-categorized, prioritized, and routed to the assigned authority.
        </p>
      </div>

      <form className="form-card" onSubmit={analyze}>
        <div className="grid-2" style={{ gap: '0 14px' }}>
          <Field label="Title">
            <input className="input" placeholder="e.g. Water leakage in room 214" value={form.title} onChange={set('title')} required />
          </Field>
          <Field label="Room / Location">
            <input className="input" placeholder="e.g. Hostel C-214" value={form.room} onChange={set('room')} required />
          </Field>
        </div>
        <Field label="Category">
          <select className="select" value={form.category} onChange={set('category')} required>
            <option value="">Select complaint category</option>
            {complaintCategories.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Description">
          <textarea className="textarea" placeholder="Describe the issue in detail..." value={form.desc} onChange={set('desc')} required />
        </Field>
        <Field label="Photo Evidence (optional)">
          <input type="file" className="input" accept="image/*" onChange={(e) => setForm({ ...form, image: e.target.files?.[0] || null })} />
        </Field>

        <div className="row" style={{ marginTop: 4 }}>
          <Button type="submit" lg><i className="fas fa-robot" /> Analyze with AI</Button>
          <Button variant="ghost" onClick={() => navigate('/grievances')}>Cancel</Button>
        </div>
      </form>

      {aiResult && (
        <div className="card" style={{ marginTop: '1.5rem', padding: '1.6rem 1.8rem', background: colors.blueSoft, borderColor: 'rgba(34,102,237,.18)' }}>
          <div className="schip"><span className="schip-ln" />AI Analysis Result<span className="schip-ln" /></div>
          <div className="row" style={{ gap: 8, margin: '10px 0' }}>
            <Chip icon="robot">Category: {aiResult.category}</Chip>
            <Chip icon="gauge-high">{aiResult.priority.toUpperCase()} priority</Chip>
          </div>
          <p style={{ fontSize: '0.8rem', color: colors.charcoalMuted }}>{aiResult.note}</p>
          <Button onClick={submit} style={{ marginTop: 14 }}>
            <i className="fas fa-paper-plane" /> Confirm & Submit
          </Button>
        </div>
      )}
    </div>
  );
}
