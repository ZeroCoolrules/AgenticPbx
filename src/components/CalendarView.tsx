import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Video,
  CheckCircle2,
  Building,
  User,
  Plus,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import { CalendarAppointment } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { safeFetchJson } from '../utils/api.ts';

export const CalendarView: React.FC = () => {
  const { token } = useAuth();
  const [appointments, setAppointments] = useState<CalendarAppointment[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [leadName, setLeadName] = useState('');
  const [leadCompany, setLeadCompany] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [title, setTitle] = useState('Enterprise PBX Architecture Demo');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeSlot, setTimeSlot] = useState('14:00 EST');

  const fetchAppointments = async () => {
    const res = await safeFetchJson<CalendarAppointment[]>('/api/crm/appointments');
    if (res.ok && res.data) {
      setAppointments(res.data);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/crm/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          leadName,
          leadCompany,
          leadEmail,
          title,
          date,
          timeSlot,
        }),
      });

      if (res.ok) {
        setIsAddModalOpen(false);
        fetchAppointments();
      }
    } catch (e) {}
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <CalendarIcon className="w-5 h-5 text-indigo-400" />
            <span>AI SDR Booked Demos &amp; Appointments</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Confirmed calendar slots closed autonomously during live phone calls by Marcus &amp; Sophia.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center space-x-2 shadow-md shadow-indigo-600/30 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Manual Slot Entry</span>
        </button>
      </div>

      {/* Appointments List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {appointments.map((apt) => (
          <div
            key={apt.id}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3.5 hover:border-slate-700 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex items-center space-x-1.5 text-[10px] font-semibold text-emerald-300 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-500/30 mb-2">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span className="uppercase">{apt.status}</span>
                </span>
                <h4 className="font-bold text-sm text-white">{apt.title}</h4>
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
              <div className="flex items-center space-x-2">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span className="font-semibold text-white">{apt.leadName}</span>
              </div>
              <div className="flex items-center space-x-2 text-indigo-400">
                <Building className="w-3.5 h-3.5 text-slate-500" />
                <span>{apt.leadCompany}</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-400">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>
                  {apt.date} • {apt.timeSlot}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 italic leading-relaxed">"{apt.notes}"</p>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <a
                href={apt.meetingLink}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
              >
                <Video className="w-3.5 h-3.5" />
                <span>Launch Meeting Link</span>
                <ArrowUpRight className="w-3 h-3" />
              </a>

              <span className="text-[10px] text-slate-500 font-mono">Synced to Cal</span>
            </div>
          </div>
        ))}
      </div>

      {/* Manual Slot Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Add Demo Appointment</h3>
            <p className="text-xs text-slate-400 mb-4">Manually register a confirmed customer presentation</p>

            <form onSubmit={handleCreate} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Prospect Name</label>
                <input
                  type="text"
                  required
                  value={leadName}
                  onChange={(e) => setLeadName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Company</label>
                <input
                  type="text"
                  required
                  value={leadCompany}
                  onChange={(e) => setLeadCompany(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={leadEmail}
                  onChange={(e) => setLeadEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Time Slot</label>
                  <input
                    type="text"
                    required
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-400 hover:text-white text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md"
                >
                  Schedule Demo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
