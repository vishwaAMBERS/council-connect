import React, { useState, useSyncExternalStore } from 'react';
import { Badge, Chip, Button, useToast, Reveal } from '../components/ui.jsx';
import { lostFoundList, subscribe, postItem } from '../data/store.js';
import { colors } from '../theme/theme.js';

export default function LostFound() {
  const toast = useToast();
  const lostFoundItems = useSyncExternalStore(subscribe, () => lostFoundList);
  const [tab, setTab] = useState('all');
  const [form, setForm] = useState({ type: 'lost', title: '', desc: '', location: '', img: null });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const list = tab === 'all' ? lostFoundItems : lostFoundItems.filter((x) => x.type === tab);

  const post = (e) => {
    e.preventDefault();
    postItem(form);
    toast(form.type === 'lost' ? 'Lost item posted — AI matching enabled' : 'Found item posted — matching against lost reports', 'success');
    setForm({ type: 'lost', title: '', desc: '', location: '', img: null });
  };

  return (
    <div className="wrap">
      <div className="sec-head">
        <div className="schip"><span className="schip-ln" />Campus Operations<span className="schip-ln" /></div>
        <h1 className="page-title">Lost &amp; <em>Found</em></h1>
        <p className="muted" style={{ fontSize: '0.85rem', maxWidth: 640 }}>
          Post lost or found items. AI performs semantic matching to pair reports automatically.
        </p>
      </div>

      <div className="tabs" style={{ marginBottom: '1.5rem' }}>
        <button className={`tab ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}><i className="fas fa-layer-group" style={{ marginRight: 6 }} /> All</button>
        <button className={`tab ${tab === 'lost' ? 'active' : ''}`} onClick={() => setTab('lost')}><i className="fas fa-circle-question" style={{ marginRight: 6 }} /> Lost Items</button>
        <button className={`tab ${tab === 'found' ? 'active' : ''}`} onClick={() => setTab('found')}><i className="fas fa-circle-check" style={{ marginRight: 6 }} /> Found Items</button>
      </div>

      <div className="grid-2" style={{ gap: '2rem', alignItems: 'start' }}>
        {/* List */}
        <div className="grid-2" style={{ gap: '1.2rem' }}>
          {list.map((item, i) => (
            <Reveal key={item.id} delay={`sr-d${(i % 3) + 1}`}>
              <div className="card-accent" style={{ height: '100%' }}>
                <div className="spread">
                  <Badge tone={item.type === 'lost' ? 'gold' : 'green'} icon={item.type === 'lost' ? 'circle-question' : 'circle-check'}>
                    {item.type === 'lost' ? 'LOST' : 'FOUND'}
                  </Badge>
                  {item.matched && <Badge tone="blue" icon="robot">AI Match Found</Badge>}
                </div>
                <div style={{ marginTop: 14, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ width: 64, height: 64, borderRadius: 14, background: colors.blueLight, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.blue, fontSize: '1.2rem', flexShrink: 0 }}>
                    <i className="fas fa-bottle-water" />
                  </div>
                  <div>
                    <div className="card-title" style={{ fontSize: '1rem' }}>{item.title}</div>
                    <p style={{ fontSize: '0.76rem', color: colors.charcoalMuted, lineHeight: 1.6 }}>{item.desc}</p>
                    <div className="row" style={{ marginTop: 8 }}>
                      <Chip icon="location-dot">{item.location}</Chip>
                      <Button size="sm" variant={item.type === 'found' ? 'prim' : 'out'} onClick={() => toast('Claim request sent to poster', 'success')}>
                        {item.type === 'found' ? 'Claim' : 'I found this'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Post form */}
        <div className="card" style={{ padding: '1.8rem', position: 'sticky', top: 'calc(var(--total-sticky) + 1rem)' }}>
          <div className="sec-head" style={{ marginBottom: 16 }}>
            <div className="schip"><span className="schip-ln" />Report an item<span className="schip-ln" /></div>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '1.1rem' }}>Post an item</h3>
          </div>
          <form onSubmit={post}>
            <div className="field">
              <label className="field-label">Type</label>
              <select className="select" value={form.type} onChange={set('type')}>
                <option value="lost">I lost an item</option>
                <option value="found">I found an item</option>
              </select>
            </div>
            <div className="field">
              <label className="field-label">Item Title</label>
              <input className="input" placeholder="e.g. Blue water bottle" value={form.title} onChange={set('title')} required />
            </div>
            <div className="field">
              <label className="field-label">Description</label>
              <textarea className="textarea" placeholder="Color, brand, identifying marks..." value={form.desc} onChange={set('desc')} required />
            </div>
            <div className="field">
              <label className="field-label">Last seen / found location</label>
              <input className="input" placeholder="e.g. CS Dept Canteen" value={form.location} onChange={set('location')} required />
            </div>
            <div className="field">
              <label className="field-label">Image (optional)</label>
              <input type="file" className="input" accept="image/*" onChange={(e) => setForm({ ...form, img: e.target.files?.[0] || null })} />
            </div>
            <Button type="submit" lg style={{ width: '100%' }}>
              <i className="fas fa-robot" /> Post with AI Matching
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
