import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { CallSession, TranscriptMessage, AIAgent } from '../types/index.ts';
import { playDTMFTone, playRingtone, playBeep } from '../utils/audio.ts';

interface CallContextType {
  activeCall: CallSession | null;
  isCallModalOpen: boolean;
  isDialpadOpen: boolean;
  isMuted: boolean;
  isOnHold: boolean;
  isAgentSpeaking: boolean;
  isListening: boolean;
  speechInputText: string;
  setSpeechInputText: (text: string) => void;
  openDialpad: () => void;
  closeDialpad: () => void;
  openCallModal: () => void;
  closeCallModal: () => void;
  initiateInboundCall: (params?: { didNumber?: string; callerName?: string; callerNumber?: string; callerCompany?: string }) => Promise<void>;
  initiateOutboundCall: (targetNumber: string, agentId?: string) => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  toggleMute: () => void;
  toggleHold: () => Promise<void>;
  transferCall: (targetExtension: string) => Promise<void>;
  pressDTMF: (digit: string) => Promise<void>;
  endCall: () => Promise<void>;
  startVoiceRecognition: () => void;
  stopVoiceRecognition: () => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  const [isCallModalOpen, setIsCallModalOpen] = useState<boolean>(false);
  const [isDialpadOpen, setIsDialpadOpen] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isOnHold, setIsOnHold] = useState<boolean>(false);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechInputText, setSpeechInputText] = useState<string>('');

  const speechRecognitionRef = useRef<any>(null);
  const activeCallRef = useRef<CallSession | null>(null);
  activeCallRef.current = activeCall;

  // Speak agent message using Web Speech API synthesis
  const speakText = (text: string, voiceGender: 'female' | 'male' = 'female', rate = 1.0, pitch = 1.0) => {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      utterance.pitch = pitch;

      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        // Try to pick matching voice
        const preferred = voices.find(v =>
          voiceGender === 'female'
            ? v.name.includes('Samantha') || v.name.includes('Zira') || v.name.includes('Female') || v.name.includes('Google US English')
            : v.name.includes('David') || v.name.includes('Alex') || v.name.includes('Male') || v.name.includes('Daniel')
        );
        if (preferred) {
          utterance.voice = preferred;
        }
      }

      utterance.onstart = () => setIsAgentSpeaking(true);
      utterance.onend = () => setIsAgentSpeaking(false);
      utterance.onerror = () => setIsAgentSpeaking(false);

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('[Speech] Synthesis error:', e);
      setIsAgentSpeaking(false);
    }
  };

  // Setup Web Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          if (item.isFinal) {
            const finalPhrase = item[0].transcript.trim();
            if (finalPhrase && activeCallRef.current && activeCallRef.current.status === 'connected') {
              sendMessage(finalPhrase);
              setSpeechInputText('');
            }
          } else {
            currentTranscript += item[0].transcript;
          }
        }
        if (currentTranscript) {
          setSpeechInputText(currentTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('[SpeechRecognition] error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      speechRecognitionRef.current = recognition;
    }
  }, []);

  const startVoiceRecognition = () => {
    if (speechRecognitionRef.current && !isListening) {
      try {
        speechRecognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.warn('Recognition start error:', err);
      }
    }
  };

  const stopVoiceRecognition = () => {
    if (speechRecognitionRef.current && isListening) {
      try {
        speechRecognitionRef.current.stop();
        setIsListening(false);
      } catch (err) {}
    }
  };

  const openDialpad = () => setIsDialpadOpen(true);
  const closeDialpad = () => setIsDialpadOpen(false);
  const openCallModal = () => setIsCallModalOpen(true);
  const closeCallModal = () => setIsCallModalOpen(false);

  const initiateInboundCall = async (params?: {
    didNumber?: string;
    callerName?: string;
    callerNumber?: string;
    callerCompany?: string;
  }) => {
    try {
      const stopRing = playRingtone();
      setIsCallModalOpen(true);

      const res = await fetch('/api/calls/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          direction: 'inbound',
          didNumber: params?.didNumber || '+1 (555) 019-4820',
          callerName: params?.callerName || 'Inbound Enterprise Prospect',
          callerNumber: params?.callerNumber || '+1 (555) 839-2041',
          callerCompany: params?.callerCompany || 'Global Logistics Corp',
        }),
      });

      stopRing();
      if (!res.ok) throw new Error('Failed to start call');

      const callData: CallSession = await res.json();
      setActiveCall(callData);
      setIsOnHold(false);
      setIsMuted(false);

      // Play initial agent greeting
      const initialAgentMsg = callData.transcript.find(t => t.sender === 'agent');
      if (initialAgentMsg) {
        speakText(initialAgentMsg.text, callData.agentId.includes('marcus') ? 'male' : 'female');
      }
    } catch (err) {
      // Handled silently
    }
  };

  const initiateOutboundCall = async (targetNumber: string, agentId = 'agent-sdr-marcus') => {
    try {
      playBeep(440, 300);
      setIsCallModalOpen(true);

      const res = await fetch('/api/calls/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          direction: 'outbound',
          calleeNumber: targetNumber,
          callerNumber: '+1 (555) 019-4821',
          didNumber: '+1 (555) 019-4821',
          callerName: 'DialWise AI SDR',
          targetExtension: '102',
        }),
      });

      if (!res.ok) throw new Error('Failed to start call');
      const callData: CallSession = await res.json();
      setActiveCall(callData);
      setIsOnHold(false);
      setIsMuted(false);

      const initialAgentMsg = callData.transcript.find(t => t.sender === 'agent');
      if (initialAgentMsg) {
        speakText(initialAgentMsg.text, 'male');
      }
    } catch (err) {
      // Handled silently
    }
  };

  const sendMessage = async (text: string) => {
    if (!activeCall || activeCall.status === 'completed' || !text.trim()) return;

    try {
      playBeep(600, 60);
      const res = await fetch(`/api/calls/${activeCall.id}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (res.ok) {
        const data = await res.json();
        setActiveCall(data.call);

        const isMale = data.call.agentId.includes('marcus') || data.call.agentId.includes('david');
        speakText(data.agentReply, isMale ? 'male' : 'female');
      }
    } catch (err) {
      // Handled silently
    }
  };

  const toggleMute = () => {
    setIsMuted(prev => !prev);
    if (!isMuted) {
      stopVoiceRecognition();
    }
  };

  const toggleHold = async () => {
    if (!activeCall) return;
    const newHold = !isOnHold;
    setIsOnHold(newHold);

    try {
      const res = await fetch(`/api/calls/${activeCall.id}/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventType: newHold ? 'hold' : 'resume' }),
      });
      if (res.ok) {
        const updated = await res.json();
        setActiveCall(updated);
      }
    } catch (err) {
      // Handled silently
    }
  };

  const transferCall = async (targetExtension: string) => {
    if (!activeCall) return;
    try {
      playDTMFTone('1');
      const res = await fetch(`/api/calls/${activeCall.id}/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventType: 'transfer', payload: { targetExtension } }),
      });
      if (res.ok) {
        const updated = await res.json();
        setActiveCall(updated);
        speakText(`Connecting you to extension ${targetExtension}. Please hold.`, 'female');
      }
    } catch (err) {
      // Handled silently
    }
  };

  const pressDTMF = async (digit: string) => {
    playDTMFTone(digit);
    if (activeCall) {
      try {
        const res = await fetch(`/api/calls/${activeCall.id}/event`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventType: 'dtmf', payload: { digit } }),
        });
        if (res.ok) {
          const updated = await res.json();
          setActiveCall(updated);
        }
      } catch (e) {}
    }
  };

  const endCall = async () => {
    if (!activeCall) return;
    try {
      stopVoiceRecognition();
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      playBeep(300, 300);

      const res = await fetch(`/api/calls/${activeCall.id}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const updated = await res.json();
        setActiveCall(updated);
      }
    } catch (err) {
      // Handled silently
    }
  };

  return (
    <CallContext.Provider
      value={{
        activeCall,
        isCallModalOpen,
        isDialpadOpen,
        isMuted,
        isOnHold,
        isAgentSpeaking,
        isListening,
        speechInputText,
        setSpeechInputText,
        openDialpad,
        closeDialpad,
        openCallModal,
        closeCallModal,
        initiateInboundCall,
        initiateOutboundCall,
        sendMessage,
        toggleMute,
        toggleHold,
        transferCall,
        pressDTMF,
        endCall,
        startVoiceRecognition,
        stopVoiceRecognition,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};
