import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
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

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <AppShell>
            <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/council" element={<CouncilDirectory />} />
            <Route path="/council/:id" element={<RepProfile />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/events" element={<Events />} />
            <Route path="/events/new" element={<CreateEvent />} />
            <Route path="/grievances" element={<Grievances />} />
            <Route path="/grievances/new" element={<GrievanceNew />} />
            <Route path="/grievances/:id" element={<GrievanceDetail />} />
            <Route path="/lost-found" element={<LostFound />} />
            <Route path="/campus-map" element={<CampusMap />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </AppShell>
      </ToastProvider>
    </AuthProvider>
    </ErrorBoundary>
  );
}
