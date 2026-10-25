import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext.tsx';
import { CallProvider } from './context/CallContext.tsx';
import { FilterProvider } from './context/FilterContext.tsx';
import { Navbar, ActiveTab } from './components/Navbar.tsx';
import { CommandCenter } from './components/CommandCenter.tsx';
import { AgentsStudio } from './components/AgentsStudio.tsx';
import { PBXManagement } from './components/PBXManagement.tsx';
import { CRMLeadsView } from './components/CRMLeadsView.tsx';
import { CalendarView } from './components/CalendarView.tsx';
import { CampaignsView } from './components/CampaignsView.tsx';
import { AuditLogsView } from './components/AuditLogsView.tsx';
import { SoftphoneModal } from './components/SoftphoneModal.tsx';
import { AuthModal } from './components/AuthModal.tsx';

function MainApp() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('command_center');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Handle URL query parameters (e.g. ?autostart=1 or ?tab=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam && ['command_center', 'agents', 'telephony', 'crm', 'calendar', 'campaigns', 'audit'].includes(tabParam)) {
      setActiveTab(tabParam as ActiveTab);
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Telephony Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAuth={() => setIsAuthModalOpen(true)}
      />

      {/* Main View Port */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'command_center' && (
          <CommandCenter onNavigateToTab={(tab) => setActiveTab(tab)} />
        )}
        {activeTab === 'agents' && <AgentsStudio />}
        {activeTab === 'telephony' && <PBXManagement />}
        {activeTab === 'crm' && <CRMLeadsView />}
        {activeTab === 'calendar' && <CalendarView />}
        {activeTab === 'campaigns' && <CampaignsView />}
        {activeTab === 'audit' && <AuditLogsView />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>DialWise Enterprise PBX Core v2.4</span>
            <span>•</span>
            <span>WebRTC Audio Engine</span>
          </div>
          <div>Autonomous Agentic SDR Telephony Architecture</div>
        </div>
      </footer>

      {/* Floating / Interactive Softphone Modal */}
      <SoftphoneModal />

      {/* Authentication & RBAC Modal */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CallProvider>
        <FilterProvider>
          <MainApp />
        </FilterProvider>
      </CallProvider>
    </AuthProvider>
  );
}
