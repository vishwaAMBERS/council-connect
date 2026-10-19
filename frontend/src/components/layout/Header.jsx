import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Header() {
  const { user, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`geca-header ${scrolled ? 'scrolled' : ''}`}>
      <div className="header-inner">
        <div className="h-left">
          <div className="logo-wrap" onClick={() => navigate('/')}>
            <div className="logo-mark">CC</div>
          </div>
        </div>
        <div className="h-center">
          <div className="h-college-text">
            <div className="h-cname1">CouncilConnect</div>
            <div className="h-cname2">Government College of Engineering, Chhatrapati Sambhajinagar</div>
            <div className="h-badge">
              <i className="fas fa-university" />
              <span>AI-Augmented Campus Governance Ecosystem</span>
            </div>
          </div>
        </div>
        <div className="h-right">
          {user ? (
            <>
              <button
                className="h-avatar"
                title={user.name}
                onClick={() => navigate('/profile')}
              >
                {user.name.slice(0, 1)}
              </button>
              <button
                className="btn-out btn-sm"
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
              >
                <i className="fas fa-sign-out-alt" /> Logout
              </button>
            </>
          ) : (
            <Link className="btn-prim btn-sm" to="/login">
              <i className="fas fa-user-circle" /> Login
            </Link>
          )}
        </div>
      </div>

      {/* Mobile header */}
      <div className="mob-header" style={{ display: 'none' }}>
        <div className="h-college-text">
          <div className="h-cname1" style={{ fontSize: '16px' }}>CouncilConnect</div>
          <div className="h-cname2" style={{ fontSize: '11px' }}>GECA Chhatrapati Sambhajinagar</div>
        </div>
        <div className="row" style={{ justifyContent: 'center' }}>
          {user ? (
            <>
              <button className="h-avatar" title={user.name} onClick={() => navigate('/profile')}>
                {user.name.slice(0, 1)}
              </button>
              <button
                className="btn-out btn-sm"
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
              >
                <i className="fas fa-sign-out-alt" /> Logout
              </button>
            </>
          ) : (
            <Link className="btn-prim btn-sm" to="/login">
              <i className="fas fa-user-circle" /> Login
            </Link>
          )}
        </div>
      </div>
      <style>{`@media(max-width:900px){.mob-header{display:flex !important}.mob-header{flex-direction:column;gap:10px;padding:14px var(--wrap-px);background:rgba(255,255,255,.96);border-bottom:1px solid rgba(34,102,237,.12);align-items:center}}`}</style>
    </header>
  );
}
