import React, { useEffect, useState } from 'react';
import { initials as toInitials, CATEGORY_META } from '../lib/format.js';
import { api, assetUrl } from '../api/client.js';

/* ---------- Buttons ---------- */
export function Button({ variant = 'prim', size, lg, sm, children, ...props }) {
  const cls = [
    variant === 'prim' ? 'btn-prim' : variant === 'out' ? 'btn-out' : variant === 'ghost' ? 'btn-ghost' : 'btn-danger',
    size === 'sm' || sm ? 'btn-sm' : size === 'lg' || lg ? 'btn-lg' : '',
  ].join(' ');
  return (
    <button className={cls} {...props}>
      {children}
    </button>
  );
}

/* ---------- Cards ---------- */
export function Card({ children, className = '', accent, pad, ...props }) {
  const cls = accent ? `card-accent ${className}` : `card ${className}`;
  return (
    <div className={cls} {...props}>
      {pad ? <div className="card-pad">{children}</div> : children}
    </div>
  );
}

/* ---------- Badges / chips ---------- */
const BADGE_TONES = {
  blue: 'badge-blue',
  green: 'badge-green',
  gold: 'badge-gold',
  red: 'badge-red',
  gray: 'badge-gray',
  dark: 'badge-dark',
};

export function Badge({ tone = 'blue', children, icon, ...props }) {
  return (
    <span className={`badge ${BADGE_TONES[tone]}`} {...props}>
      {icon && <i className={`fas fa-${icon}`} />}
      {children}
    </span>
  );
}

export function Chip({ children, blue, icon, ...props }) {
  return (
    <span className={`chip ${blue ? 'chip-blue' : ''}`} {...props}>
      {icon && <i className={`fas fa-${icon}`} />}
      {children}
    </span>
  );
}

export function SectionHeader({ chip, title, em, sub }) {
  return (
    <div className="sec-head">
      {chip && (
        <div className="schip">
          <span className="schip-ln" />
          <span>{chip}</span>
          <span className="schip-ln" />
        </div>
      )}
      <h2 className="page-title" style={{ marginBottom: sub ? '0.5rem' : 0 }}>
        {title} {em && <em>{em}</em>}
      </h2>
      {sub && <p className="muted" style={{ fontSize: '0.85rem' }}>{sub}</p>}
    </div>
  );
}

/* ---------- Inputs ---------- */
export function Field({ label, children, hint }) {
  return (
    <label className="field">
      {label && <span className="field-label">{label}</span>}
      {children}
      {hint && <span className="faint" style={{ fontSize: '11px' }}>{hint}</span>}
    </label>
  );
}

export function SearchInput({ placeholder = 'Search...', ...props }) {
  return (
    <div className="search-wrap">
      <input type="text" className="search-input" placeholder={placeholder} {...props} />
      <i className="fas fa-search search-ico" />
    </div>
  );
}

/* ---------- Avatar ---------- */
export function Avatar({ name, img, size = 'md', style }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  return (
    <div
      className={`avatar ${size === 'lg' ? 'avatar-lg' : size === 'sm' ? 'avatar-sm' : ''}`}
      style={style}
    >
      {img ? <img src={img} alt={name} /> : initials}
    </div>
  );
}

/* ---------- Stat band ---------- */
export function StatBlock({ icon, num, ac, label }) {
  return (
    <div className="sblk">
      <i className={`fas fa-${icon} sblk-ico`} />
      <div className="sblk-num">
        {num}
        {ac && <span className="ac">{ac}</span>}
      </div>
      <div className="sblk-lbl">{label}</div>
    </div>
  );
}

export function StatBand({ items }) {
  return (
    <div className="stats-band">
      {items.map((s, i) => (
        <React.Fragment key={i}>
          {i > 0 && <div className="stat-div" />}
          <StatBlock {...s} />
        </React.Fragment>
      ))}
    </div>
  );
}

/* ---------- Table ---------- */
export function Table({ head, children, minWidth = 520 }) {
  return (
    <div className="pt-wrap">
      <table className="ptbl" style={{ minWidth }}>
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={i}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

/* ---------- Modal ---------- */
export function Modal({ open, onClose, title, children, footer }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-head">
          <div className="modal-title">{title}</div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <i className="fas fa-times" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div style={{ padding: '0 24px 22px', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>{footer}</div>}
      </div>
    </div>
  );
}

/* ---------- Toasts ---------- */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = (msg, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  };
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toast-wrap">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

const ToastCtx = React.createContext(() => {});
export const useToast = () => React.useContext(ToastCtx);

/* ---------- Tabs ---------- */
export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="tabs">
      {tabs.map((t) => (
        <button key={t} className={`tab ${t === active ? 'active' : ''}`} onClick={() => onChange(t)}>
          {t}
        </button>
      ))}
    </div>
  );
}

/* ---------- Empty state ---------- */
export function EmptyState({ icon = 'inbox', title = 'Nothing here yet', desc }) {
  return (
    <div className="empty">
      <i className={`fas fa-${icon}`} />
      <h4>{title}</h4>
      {desc && <p>{desc}</p>}
    </div>
  );
}

/* ---------- Timeline ---------- */
export function Timeline({ items }) {
  return (
    <ul className="tl">
      {items.map((it, i) => (
        <li key={i} className={`tl-item ${it.done ? 'done' : ''}`}>
          <div className="tl-title">{it.title}</div>
          {it.sub && <div className="tl-sub">{it.sub}</div>}
        </li>
      ))}
    </ul>
  );
}

/* ---------- Scroll reveal ---------- */
export function Reveal({ children, delay = '' }) {
  const ref = React.useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            el.classList.add('in');
            obs.unobserve(el);
          }
        });
      },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className={`sr ${delay}`} style={{ width: '100%' }}>
      {children}
    </div>
  );
}

/* ---------- Status pill mapping helpers ---------- */
export const STATUS_TONE = {
  pending: 'gold',
  approved: 'green',
  declined: 'red',
  open: 'blue',
  submitted: 'blue',
  assigned: 'blue',
  matched: 'green',
  critical: 'red',
  in_progress: 'gold',
  resolved: 'green',
  escalated: 'red',
  verified: 'green',
  unverified: 'gray',
  low: 'green',
  medium: 'gold',
  high: 'red',
  urgent: 'red',
};

export function statusLabel(s) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ---------- Governance helpers ---------- */
/** Profile photo when `src` (an upload path) is set, otherwise the person's initials. */
export function InitialsAvatar({ name, src, size = 92, fontSize = '1.7rem', style }) {
  return (
    <div
      style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Fraunces', serif", fontWeight: 900, fontSize,
        color: 'var(--blue-dark)', background: 'var(--blue-light)',
        ...style,
      }}
    >
      {src ? <img src={assetUrl(src)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : toInitials(name)}
    </div>
  );
}

/**
 * Image picker that uploads as soon as a file is chosen.
 * `value` is the stored upload path (or null); `onChange` receives the new path or null.
 */
export function ImageInput({ value, onChange, onBusy }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    onBusy?.(true);
    setError(null);
    try {
      onChange(await api.upload(file));
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
      onBusy?.(false);
    }
  };

  return (
    <div>
      <div className="row" style={{ gap: 12, alignItems: 'center' }}>
        {value && (
          <img src={assetUrl(value)} alt="Selected upload" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 12, border: '1px solid var(--border)' }} />
        )}
        <input type="file" className="input" accept="image/png,image/jpeg,image/webp" onChange={pick} disabled={busy} />
        {value && !busy && (
          <button type="button" className="btn-ghost btn-sm" onClick={() => onChange(null)}>Remove</button>
        )}
      </div>
      {busy && <span className="faint" style={{ fontSize: '11px' }}><i className="fas fa-circle-notch fa-spin" style={{ marginRight: 6 }} />Uploading…</span>}
      {error && <span style={{ fontSize: '11px', color: '#c0392b', fontWeight: 600 }}>{error.message}</span>}
    </div>
  );
}

export function VerifiedBadge({ verified }) {
  return (
    <Badge tone={verified ? 'green' : 'gray'} icon={verified ? 'circle-check' : 'hourglass-half'}>
      {verified ? 'Verified' : 'Unverified'}
    </Badge>
  );
}

/** AI category tag on a contact request. `null` means it has not been categorised yet. */
export function CategoryBadge({ category }) {
  const meta = CATEGORY_META[category];
  if (!meta) return <Badge tone="gray" icon="robot">Categorising…</Badge>;
  return <Badge tone={meta.tone} icon={meta.icon} title="Category assigned by AI">{meta.label}</Badge>;
}

export function ErrorNote({ error, onRetry }) {
  if (!error) return null;
  return (
    <div style={{ background: '#fdeaea', color: '#c0392b', borderRadius: 12, padding: '10px 14px', fontSize: '12px', fontWeight: 600, marginBottom: 14, border: '1px solid #f0c4c4' }}>
      {error.message || String(error)}
      {onRetry && (
        <button onClick={onRetry} style={{ marginLeft: 10, background: 'none', border: 'none', color: '#c0392b', fontWeight: 800, textDecoration: 'underline', cursor: 'pointer' }}>
          Try again
        </button>
      )}
    </div>
  );
}

export function Loading({ label = 'Loading…' }) {
  return (
    <div className="muted" style={{ padding: '2rem 0', textAlign: 'center', fontSize: '0.85rem' }}>
      <i className="fas fa-circle-notch fa-spin" style={{ marginRight: 8 }} />{label}
    </div>
  );
}
