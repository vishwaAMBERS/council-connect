import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header.jsx';
import Navbar from './Navbar.jsx';
import Footer from './Footer.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export default function AppShell({ children }) {
  const { pathname } = useLocation();
  const { user } = useAuth();

  // progress bar + scroll to top
  useEffect(() => {
    window.scrollTo({ top: 0 });
    const onScroll = () => {
      const pb = document.getElementById('pb');
      if (!pb) return;
      const s = document.documentElement.scrollTop;
      const h = document.documentElement.scrollHeight - window.innerHeight;
      pb.style.width = (h > 0 ? (s / h) * 100 : 0) + '%';
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, [pathname]);

  const isAuthPage = pathname === '/login' || pathname === '/register';

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div>
      <div id="pb" />
      <Header />
      <Navbar />
      <main style={{ minHeight: '60vh' }}>{children}</main>
      <Footer />
    </div>
  );
}
