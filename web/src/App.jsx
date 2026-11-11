import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth, homePathFor } from './context/AuthContext.jsx';
import { ToastProvider } from './components/ui.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import AppShell from './components/layout/AppShell.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import CouncilDirectory from './pages/CouncilDirectory.jsx';
import RepProfile from './pages/RepProfile.jsx';
import Messages from './pages/Messages.jsx';
import Events from './pages/Events.jsx';
import CreateEvent from './pages/CreateEvent.jsx';
import Grievances from './pages/Grievances.jsx';
import GrievanceDetail from './pages/GrievanceDetail.jsx';
import GrievanceNew from './pages/GrievanceNew.jsx';
import LostFound from './pages/LostFound.jsx';
import CampusMap from './pages/CampusMap.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import Profile from './pages/Profile.jsx';
import Archive from './pages/Archive.jsx';

function Splash() {
  return (
    <div className="wrap center" style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="muted"><i className="fas fa-circle-notch fa-spin" style={{ marginRight: 8 }} />Loading…</span>
    </div>
  );
}

/** Everything except login and register needs a signed-in user. */
function Protected({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Splash />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

/** Login and register are only for signed-out visitors. */
function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Splash />;
  if (user) return <Navigate to={homePathFor(user)} replace />;
  return children;
}

const guarded = (element) => <Protected>{element}</Protected>;

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <AppShell>
            <Routes>
              <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
              <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
              <Route path="/" element={guarded(<Home />)} />
              <Route path="/council" element={guarded(<CouncilDirectory />)} />
              <Route path="/council/:id" element={guarded(<RepProfile />)} />
              <Route path="/messages" element={guarded(<Messages />)} />
              <Route path="/events" element={guarded(<Events />)} />
              <Route path="/events/new" element={guarded(<CreateEvent />)} />
              <Route path="/grievances" element={guarded(<Grievances />)} />
              <Route path="/grievances/new" element={guarded(<GrievanceNew />)} />
              <Route path="/grievances/:id" element={guarded(<GrievanceDetail />)} />
              <Route path="/lost-found" element={guarded(<LostFound />)} />
              <Route path="/campus-map" element={guarded(<CampusMap />)} />
              <Route path="/admin" element={guarded(<AdminDashboard />)} />
              <Route path="/profile" element={guarded(<Profile />)} />
              <Route path="/archive" element={guarded(<Archive />)} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppShell>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
