'use client';

import React, { useEffect, useMemo } from 'react';
import { 
    useMediaDeviceSelect, 
    useLocalParticipant,
    useTrackVolume,
    useTracks,
    TrackReference
} from '@livekit/components-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Track } from 'livekit-client';
import { 
    MicrophoneIcon, 
    SpeakerWaveIcon, 
    XMarkIcon,
    CheckIcon,
    ChevronDownIcon
} from '@heroicons/react/24/outline';

interface CallSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CallSettingsModal({ isOpen, onClose }: CallSettingsModalProps) {
    const { 
        devices: microphones, 
        activeDeviceId: activeMicId, 
        setActiveMediaDevice: setActiveMic 
    } = useMediaDeviceSelect({ kind: 'audioinput' });

    const { 
        devices: speakers, 
        activeDeviceId: activeSpeakerId, 
        setActiveMediaDevice: setActiveSpeaker 
    } = useMediaDeviceSelect({ kind: 'audiooutput' });

    const { localParticipant } = useLocalParticipant();
    
    // Get the local audio track for the test meter using useTracks for reliability
    const tracks = useTracks([Track.Source.Microphone]);
    const localTrack = useMemo(() => 
        tracks.find(t => t.participant.identity === localParticipant.identity),
    [tracks, localParticipant.identity]);

    // Use the actual volume from the local track for the meter
    const volume = useTrackVolume(localTrack);

    // Close on Escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                {/* Backdrop */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                {/* Modal Content */}
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-md bg-[#1e1f26]/95 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="px-8 pt-8 pb-4 flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-tight">Call Settings</h2>
                            <p className="text-[11px] font-medium text-indigo-400 uppercase tracking-widest mt-1">Audio Configuration</p>
                        </div>
                        <button 
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                        >
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="px-8 pb-8 space-y-8">
                        {/* Microphone Selection */}
                        <section className="space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 text-sm font-semibold text-gray-200">
                                    <MicrophoneIcon className="w-4 h-4 text-indigo-400" />
                                    Microphone
                                </label>
                                <span className="text-[10px] text-gray-500 font-mono uppercase tracking-tighter">Input Device</span>
                            </div>
                            
                            <div className="relative group">
                                <select 
                                    value={activeMicId || ''}
                                    onChange={(e) => setActiveMic(e.target.value)}
                                    className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-sm text-white appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all hover:bg-black/30"
                                >
                                    {microphones.length > 0 ? microphones.map((device) => (
                                        <option key={device.deviceId} value={device.deviceId} className="bg-[#1e1f26] text-white">
                                            {device.label || `Microphone ${device.deviceId.slice(0, 5)}`}
                                        </option>
                                    )) : (
                                        <option value="" className="bg-[#1e1f26] text-white">Searching for Microphones...</option>
                                    )}
                                </select>
                                <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none group-hover:text-white transition-colors" />
                            </div>

                            {/* Mic Test Visualizer - Now uses actual volume! */}
                            <div className="flex items-center gap-3 bg-black/20 rounded-xl p-3 border border-white/5">
                                <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                     <motion.div 
                                        animate={{ width: `${Math.max(2, volume * 100)}%` }} 
                                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" 
                                    />
                                </div>
                                <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest whitespace-nowrap">Input Level</span>
                            </div>
                        </section>

                        {/* Speaker Selection */}
                        <section className="space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 text-sm font-semibold text-gray-200">
                                    <SpeakerWaveIcon className="w-4 h-4 text-emerald-400" />
                                    Speaker
                                </label>
                                <span className="text-[10px] text-gray-500 font-mono uppercase tracking-tighter">Output Device</span>
                            </div>

                            <div className="relative group">
                                <select 
                                    value={activeSpeakerId || ''}
                                    onChange={(e) => setActiveSpeaker(e.target.value)}
                                    className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-sm text-white appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all hover:bg-black/30"
                                >
                                    {speakers.length > 0 ? speakers.map((device) => (
                                        <option key={device.deviceId} value={device.deviceId} className="bg-[#1e1f26] text-white">
                                            {device.label || `Speaker ${device.deviceId.slice(0, 5)}`}
                                        </option>
                                    )) : (
                                        <option value="" className="bg-[#1e1f26] text-white">System Default</option>
                                    )}
                                </select>
                                <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none group-hover:text-white transition-colors" />
                            </div>

                            <button 
                                onClick={() => {
                                    // Using a more reliable way to play sound that doesn't rely on local assets
                                    const context = new (window.AudioContext || (window as any).webkitAudioContext)();
                                    const oscillator = context.createOscillator();
                                    const gainNode = context.createGain();
                                    oscillator.connect(gainNode);
                                    gainNode.connect(context.destination);
                                    oscillator.type = 'sine';
                                    oscillator.frequency.setValueAtTime(440, context.currentTime); // A4
                                    gainNode.gain.setValueAtTime(0.1, context.currentTime);
                                    oscillator.start();
                                    oscillator.stop(context.currentTime + 0.3);
                                }}
                                className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-emerald-400 text-[11px] font-bold uppercase tracking-widest rounded-lg border border-white/5 transition-all active:scale-[0.98]"
                            >
                                Test Sound
                            </button>
                        </section>

                        {/* Footer / Done */}
                        <div className="pt-4">
                            <button 
                                onClick={onClose}
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                <CheckIcon className="w-5 h-5" />
                                Done
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

