import React from 'react';
import {
  Phone,
  Bot,
  Users,
  Calendar,
  Layers,
  Radio,
  ShieldCheck,
  PhoneCall,
  LogOut,
  User as UserIcon,
  Activity,
  Megaphone,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useCall } from '../context/CallContext.tsx';

export type ActiveTab = 'command_center' | 'agents' | 'telephony' | 'crm' | 'calendar' | 'campaigns' | 'audit';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenAuth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, onOpenAuth }) => {
  const { user, logout } = useAuth();
  const { activeCall, openCallModal, openDialpad } = useCall();

  const isCallInProgress = activeCall && activeCall.status !== 'completed';

  const navItems = [
    { id: 'command_center', label: 'Command Center', icon: Activity },
    { id: 'agents', label: 'AI SDR Workforce', icon: Bot },
    { id: 'telephony', label: 'PBX & Numbers', icon: Phone },
    { id: 'crm', label: 'CRM & BANT Leads', icon: Users },
    { id: 'calendar', label: 'Booked Demos', icon: Calendar },
    { id: 'campaigns', label: 'Outbound Dialing', icon: Megaphone },
    { id: 'audit', label: 'Security & Audit', icon: ShieldCheck },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and PBX status */}
          <div className="flex items-center space-x-4">
            <div
              onClick={() => setActiveTab('command_center')}
              className="flex items-center space-x-2.5 cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
                <Radio className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                    DialWise AI
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    PBX + SDR
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-slate-400">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  <span className="text-[11px] text-emerald-400 font-medium">SIP Engine Online</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-[11px]">3 Trunks</span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as ActiveTab)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 shadow-sm shadow-indigo-500/10'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Action Center: Softphone Launcher + User Profile */}
          <div className="flex items-center space-x-3">
            {/* Live Call / Softphone Trigger */}
            <button
              onClick={() => (isCallInProgress ? openCallModal() : openDialpad())}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-md transition-all ${
                isCallInProgress
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white animate-pulse ring-2 ring-emerald-400/50'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
              }`}
            >
              <PhoneCall className="w-4 h-4" />
              <span>{isCallInProgress ? 'Active Call In Progress' : 'Open Softphone'}</span>
            </button>

            {/* Auth / Account Profile */}
            {user ? (
              <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-slate-700 to-slate-600 flex items-center justify-center text-xs font-bold text-white uppercase">
                  {user.name.charAt(0)}
                </div>
                <div className="hidden sm:block text-left text-xs">
                  <div className="font-medium text-slate-200 truncate max-w-[110px]">{user.name}</div>
                  <div className="text-[10px] text-indigo-400 capitalize">{user.role.replace('_', ' ')}</div>
                </div>
                <button
                  onClick={logout}
                  title="Sign Out"
                  className="p-1 text-slate-400 hover:text-rose-400 transition-colors ml-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 text-xs font-medium text-slate-200 hover:bg-slate-700"
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="lg:hidden flex items-center space-x-1 py-2 overflow-x-auto no-scrollbar border-t border-slate-800/80">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as ActiveTab)}
                className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs whitespace-nowrap font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
