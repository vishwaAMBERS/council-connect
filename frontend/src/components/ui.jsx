import React, { useEffect, useState } from 'react';

/* ---------- Buttons ---------- */
export function Button({ variant = 'prim', size, children, ...props }) {
  const cls = [
    variant === 'prim' ? 'btn-prim' : variant === 'out' ? 'btn-out' : variant === 'ghost' ? 'btn-ghost' : 'btn-danger',
    size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '',
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
    <div className="field">
      {label && <label className="field-label">{label}</label>}
      {children}
      {hint && <span className="faint" style={{ fontSize: '11px' }}>{hint}</span>}
    </div>
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
