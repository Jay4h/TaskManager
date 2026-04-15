'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { LocalAudioTrack, RemoteAudioTrack } from 'livekit-client';

interface CallContextType {
    activeCall: {
        token: string;
        url: string;
        roomName: string;
        type: 'voice' | 'video';
        channelId: string;
        callId?: string;
    } | null;
    startCall: (data: { token: string; url: string; roomName: string; type: 'voice' | 'video'; channelId: string; callId?: string }) => void;
    endCall: () => void;
    currentAudioTrack: LocalAudioTrack | RemoteAudioTrack | null;
    setCurrentAudioTrack: (track: LocalAudioTrack | RemoteAudioTrack | null) => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

const STORAGE_KEY = 'task_manager_active_call';

export function CallProvider({ children }: { children: ReactNode }) {
    const [activeCall, setActiveCall] = useState<CallContextType['activeCall']>(null);
    const [currentAudioTrack, setCurrentAudioTrack] = useState<LocalAudioTrack | RemoteAudioTrack | null>(null);

    // Initial load from localStorage
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                setActiveCall(JSON.parse(stored));
            } catch (e) {
                console.error('Failed to parse stored call state:', e);
                localStorage.removeItem(STORAGE_KEY);
            }
        }
    }, []);

    // Sync to localStorage
    useEffect(() => {
        if (activeCall) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(activeCall));
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
    }, [activeCall]);

    const startCall = (data: CallContextType['activeCall']) => setActiveCall(data);
    const endCall = () => {
        setActiveCall(null);
        setCurrentAudioTrack(null);
        localStorage.removeItem(STORAGE_KEY);
    };

    return (
        <CallContext.Provider value={{ activeCall, startCall, endCall, currentAudioTrack, setCurrentAudioTrack }}>
            {children}
        </CallContext.Provider>
    );
}

export function useCall() {
    const context = useContext(CallContext);
    if (context === undefined) {
        throw new Error('useCall must be used within a CallProvider');
    }
    return context;
}
