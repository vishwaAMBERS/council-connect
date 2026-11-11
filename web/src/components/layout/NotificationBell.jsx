import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi.js';
import { api } from '../../api/client.js';
import { timeAgo } from '../../lib/format.js';

const POLL_MS = 30000;
const ICONS = { contact_request: 'envelope', message: 'comment', grievance: 'clipboard-list', lost_found: 'link', verification: 'circle-check' };

/** Header bell: unread count, latest notifications, click to open the related page. */
export default function NotificationBell() {
  const navigate = useNavigate();
  const feed = useApi('/notifications', { pollMs: POLL_MS });
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  const unread = feed.data?.unreadCount || 0;
  const items = feed.data?.notifications || [];

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => !boxRef.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      // Opening the list counts as reading it; the list keeps its "new" dots until it is closed.
      await api.post('/notifications/read').catch(() => {});
    }
    if (!next) feed.reload();
  };

  const go = (link) => {
    setOpen(false);
    feed.reload();
    if (link) navigate(link);
  };

  return (
    <div ref={boxRef} style={{ position: 'relative' }}>
      <button
        type="button"
        className="h-avatar"
        onClick={toggle}
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
        style={{ position: 'relative' }}
      >
        <i className="fas fa-bell" />
        {unread > 0 && (
          <span style={{ position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, padding: '0 4px', borderRadius: 9, background: '#c0392b', color: '#fff', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          style={{ position: 'absolute', right: 0, top: 'calc(100% + 10px)', width: 'min(340px, 90vw)', maxHeight: 420, overflowY: 'auto', background: '#fff', border: '1px solid var(--border)', borderRadius: 16, boxShadow: 'var(--sh-lg)', zIndex: 2000, textAlign: 'left' }}
        >
          <div style={{ padding: '12px 16px', fontWeight: 800, fontSize: '0.85rem', borderBottom: '1px solid var(--border)' }}>Notifications</div>
          {items.length === 0 ? (
            <div className="faint" style={{ padding: '20px 16px', fontSize: '0.8rem' }}>Nothing yet.</div>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => go(n.link)}
                style={{ display: 'flex', gap: 10, width: '100%', textAlign: 'left', padding: '11px 16px', background: n.read ? '#fff' : 'var(--blue-soft, #f2f6ff)', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', font: 'inherit' }}
              >
                <i className={`fas fa-${ICONS[n.type] || 'bell'}`} style={{ color: 'var(--blue)', marginTop: 3, width: 16 }} />
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ display: 'block', fontSize: '0.8rem', fontWeight: n.read ? 600 : 800, color: 'var(--charcoal)' }}>{n.title}</span>
                  {n.body && <span style={{ display: 'block', fontSize: '0.74rem', color: 'var(--charcoal-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.body}</span>}
                  <span className="faint" style={{ fontSize: '0.68rem' }}>{timeAgo(n.createdAt)}</span>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
