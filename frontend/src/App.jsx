import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';
import { Navbar } from './components/Navbar';
import { AuthPage } from './pages/AuthPage';
import { PassengerDashboard } from './pages/PassengerDashboard';
import { DriverDashboard } from './pages/DriverDashboard';
import { FamilyMonitoringPage } from './pages/FamilyMonitoringPage';
import { TripHistoryPage } from './pages/TripHistoryPage';
import { AdminDashboard } from './pages/AdminDashboard';

function AppContent() {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (path === '/admin' || hash === '#admin' || hash === '#/admin') {
        return 'admin';
      }
    }
    return 'passenger';
  });

  useEffect(() => {
    const handleNavigation = () => {
      if (typeof window !== 'undefined') {
        const path = window.location.pathname.toLowerCase();
        const hash = window.location.hash.toLowerCase();
        if (path === '/admin' || hash === '#admin' || hash === '#/admin') {
          setActiveTab('admin');
        }
      }
    };
    window.addEventListener('popstate', handleNavigation);
    window.addEventListener('hashchange', handleNavigation);
    return () => {
      window.removeEventListener('popstate', handleNavigation);
      window.removeEventListener('hashchange', handleNavigation);
    };
  }, []);

  if (!isAuthenticated) {
    return (
      <div className="app-wrapper">
        <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className="main-content">
          <AuthPage />
        </main>
      </div>
    );
  }

  return (
    <div className="app-wrapper">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="main-content">
        {activeTab === 'passenger' && <PassengerDashboard />}
        {activeTab === 'driver' && <DriverDashboard />}
        {activeTab === 'family' && <FamilyMonitoringPage />}
        {activeTab === 'history' && <TripHistoryPage />}
        {activeTab === 'admin' && <AdminDashboard />}
      </main>
      <footer className="footer">
        <p>
          ChauffIQ Backend Connected · {import.meta.env.PROD ? 'Production (Asia-Southeast1)' : 'Local Emulator (Asia-Southeast1)'}
        </p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
