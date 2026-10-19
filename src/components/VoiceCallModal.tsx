import React, { useEffect, useState, useRef } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, Sparkles } from 'lucide-react';
import { UserProfile } from '../types';
import { soundEffects } from '../utils/soundEffects';
import { VerifiedBadge } from './VerifiedBadge';

interface VoiceCallModalProps {
  partner: UserProfile;
  isOpen: boolean;
  onClose: () => void;
}

export const VoiceCallModal: React.FC<VoiceCallModalProps> = ({
  partner,
  isOpen,
  onClose,
}) => {
  const [callState, setCallState] = useState<'calling' | 'connected'>('calling');
  const [callSeconds, setCallSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);

  const connectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCallState('calling');
      setCallSeconds(0);
      soundEffects.startCallingRingtone();

      // Simulate connection after 3.2 seconds
      connectTimeoutRef.current = setTimeout(() => {
        soundEffects.stopCallingRingtone();
        setCallState('connected');
        soundEffects.playSeen(); // chime on connect

        timerIntervalRef.current = setInterval(() => {
          setCallSeconds((prev) => prev + 1);
        }, 1000);
      }, 3200);
    } else {
      soundEffects.stopCallingRingtone();
      if (connectTimeoutRef.current) clearTimeout(connectTimeoutRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }

    return () => {
      soundEffects.stopCallingRingtone();
      if (connectTimeoutRef.current) clearTimeout(connectTimeoutRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleEndCall = () => {
    soundEffects.playCallEnded();
    onClose();
  };

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="relative w-full max-w-sm rounded-3xl p-8 flex flex-col items-center text-center overflow-hidden liquid-glass-card border border-white/20 text-white shadow-2xl">
        {/* Ambient glow in background */}
        <div className="absolute -top-24 -left-24 w-60 h-60 bg-indigo-500/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-purple-500/30 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col items-center">
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-200/90 mb-1 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Study Mods Voice Call
          </span>

          <div className="flex items-center gap-1.5 mt-2">
            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
              {partner.displayName || partner.username || 'Partner'}
            </h3>
            {partner.isVerified && <VerifiedBadge size="md" />}
          </div>
          <p className="text-xs text-slate-500 font-mono mt-0.5">Study ID: {partner.studyId}</p>

          {/* Status Label / Live Call Timer */}
          <div className="mt-2 text-xs font-semibold">
            {callState === 'calling' ? (
              <span className="text-indigo-600 animate-pulse">Ringing...</span>
            ) : (
              <span className="text-emerald-600 font-mono tracking-wider">
                Connected • {formatTimer(callSeconds)}
              </span>
            )}
          </div>

          {/* Pulsing Avatar Frame */}
          <div className="relative my-10 flex items-center justify-center">
            {callState === 'calling' && (
              <>
                <div className="absolute w-36 h-36 rounded-full bg-indigo-500/20 animate-ping" />
                <div className="absolute w-44 h-44 rounded-full bg-indigo-500/10 animate-pulse" />
              </>
            )}
            <div className="relative w-28 h-28 rounded-full ring-4 ring-white shadow-2xl overflow-hidden bg-slate-900 flex items-center justify-center">
              {partner.photoURL ? (
                <img
                  src={partner.photoURL}
                  alt={partner.displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-indigo-500 to-violet-600 text-white font-extrabold text-3xl flex items-center justify-center">
                  {(partner.displayName || partner.username || 'M').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>

          {/* Call Controls Bar */}
          <div className="flex items-center gap-5 mt-2">
            {/* Mic Toggle */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`p-3.5 rounded-full transition-all duration-200 ${
                isMuted
                  ? 'bg-rose-500 text-white ring-2 ring-rose-300'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* End Call Button (Big Red) */}
            <button
              onClick={handleEndCall}
              className="p-4 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/40 active:scale-95 transition-all"
              title="End Call"
            >
              <PhoneOff className="w-6 h-6" />
            </button>

            {/* Speaker Toggle */}
            <button
              onClick={() => setIsSpeaker(!isSpeaker)}
              className={`p-3.5 rounded-full transition-all duration-200 ${
                isSpeaker
                  ? 'bg-indigo-50 text-indigo-600 ring-2 ring-indigo-200'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
              title={isSpeaker ? 'Speaker On' : 'Speaker Off'}
            >
              {isSpeaker ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
