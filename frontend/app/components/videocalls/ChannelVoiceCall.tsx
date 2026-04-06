'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { LiveKitRoom, useRemoteParticipants, useLocalParticipant } from '@livekit/components-react';
import '@livekit/components-styles';
import { videocallsApi } from '../../../src/api/videocalls.api';
import { useSocket } from '../../providers/SocketProvider';

interface VoiceCallProps {
    channelId: string;
    channelName: string;
    onCallEnd?: () => void;
    token: string;
    url: string;
    roomName: string;
    callId?: string;
}

export function ChannelVoiceCall({
    channelId,
    channelName,
    onCallEnd,
    token: propsToken,
    url: propsUrl,
    roomName: propsRoomName,
    callId: propsCallId,
}: VoiceCallProps & { token?: string; url?: string; roomName?: string; callId?: string }) {
    const [token, setToken] = useState<string>(propsToken || '');
    const [url, setUrl] = useState<string>(propsUrl || '');
    const [roomName, setRoomName] = useState<string>(propsRoomName || '');
    const [callId, setCallId] = useState<string>(propsCallId || '');
    const [error, setError] = useState<string>('');
    const [callStarted, setCallStarted] = useState(false);
    const [callDuration, setCallDuration] = useState(0);
    const [hasParticipants, setHasParticipants] = useState(false);
    const [showWarning, setShowWarning] = useState(false);
    const [minutesRemaining, setMinutesRemaining] = useState(0);
    const durationInterval = useRef<NodeJS.Timeout | null>(null);
    const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isLeavingRef = useRef(false);
    const { socket } = useSocket();

    // Persist call state to localStorage
    const saveCallState = useCallback(() => {
        const callState = {
            token,
            url,
            roomName,
            callId,
            channelId,
            channelName,
            callType: 'voice',
            callDuration,
            timestamp: Date.now(),
        };
        localStorage.setItem('activeCall', JSON.stringify(callState));
        console.log('💾 Voice call state saved to localStorage');
    }, [token, url, roomName, callId, channelId, channelName, callDuration]);

    // Restore and auto-save call state
    useEffect(() => {
        if (token && url && roomName) {
            const stored = localStorage.getItem('activeCall');
            if (!stored) {
                saveCallState();
            }
        }
    }, [token, url, roomName, saveCallState]);

    useEffect(() => {
        if (callStarted && token) {
            const saveInterval = setInterval(saveCallState, 5000);
            return () => clearInterval(saveInterval);
        }
    }, [callStarted, token, saveCallState]);

    // Update state when props change
    useEffect(() => {
        if (propsToken) setToken(propsToken);
        if (propsUrl) setUrl(propsUrl);
        if (propsRoomName) setRoomName(propsRoomName);
        if (propsCallId) setCallId(propsCallId);
    }, [propsToken, propsUrl, propsRoomName, propsCallId]);

    // Validate and initialize call
    useEffect(() => {
        if (!token || !url || !roomName) {
            console.log('⏳ Waiting for voice call token:', { hasToken: !!token, hasUrl: !!url, hasRoomName: !!roomName });
            return;
        }

        const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (!isSecure || !navigator.mediaDevices) {
            console.error('❌ Insecure context');
            setError('Voice calls require HTTPS or localhost access');
            return;
        }

        if (typeof token !== 'string' || token.length < 50) {
            console.error('❌ Invalid token');
            setError('Invalid authentication token');
            return;
        }

        console.log('✅ Voice call token validated');
        console.log('📍 LiveKit URL:', url);
        console.log('🎤 Room name:', roomName);

        setError('');
        setCallStarted(true);

        connectionTimeoutRef.current = setTimeout(() => {
            setError((prev) => {
                if (!prev) {
                    console.warn('⏱️ Voice connection timeout');
                    return 'Connection taking too long. Please check your internet.';
                }
                return prev;
            });
        }, 30000);

        return () => {
            if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
        };
    }, [token, url, roomName]);

    // Listen for call warning events
    useEffect(() => {
        if (!socket) return;

        const handleCallWarning = (data: any) => {
            console.log('📢 Voice call warning:', data);
            setMinutesRemaining(data.minutesRemaining);
            setShowWarning(true);
            setTimeout(() => setShowWarning(false), 5000);
        };

        const handleCallEnded = (data: any) => {
            if (data.reason === 'max_duration_exceeded') {
                console.log('⏰ Voice call ended - max duration');
                handleLeaveRoom();
            }
        };

        socket.on('channel:call-warning', handleCallWarning);
        socket.on('channel:call-ended', handleCallEnded);

        return () => {
            socket.off('channel:call-warning', handleCallWarning);
            socket.off('channel:call-ended', handleCallEnded);
        };
    }, [socket]);

    // Start/stop timer based on participants presence
    useEffect(() => {
        if (hasParticipants && !durationInterval.current) {
            console.log('⏱️ Voice call participants detected - starting timer');
            durationInterval.current = setInterval(() => {
                setCallDuration((prev) => prev + 1);
            }, 1000);
        } else if (!hasParticipants && durationInterval.current) {
            console.log('⏱️ Voice call participants gone - stopping timer');
            clearInterval(durationInterval.current);
            durationInterval.current = null;
        }

        return () => {
            if (durationInterval.current) {
                clearInterval(durationInterval.current);
            }
        };
    }, [hasParticipants]);

    const handleLeaveRoom = useCallback(async () => {
        if (isLeavingRef.current) return;
        isLeavingRef.current = true;

        try {
            if (callId) {
                await videocallsApi.endCall(channelId, callId);
            } else {
                await videocallsApi.leaveCall(channelId);
            }
        } catch (err) {
            console.error('Error leaving voice call:', err);
        } finally {
            if (durationInterval.current) clearInterval(durationInterval.current);
            if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
            localStorage.removeItem('activeCall');
            console.log('🗑️ Voice call state cleared');
            onCallEnd?.();
        }
    }, [channelId, callId, onCallEnd]);

    // Track if page is unloading (user navigating away or refreshing)
    useEffect(() => {
        const handleBeforeUnload = () => {
            // Page is unloading, don't call handleLeaveRoom during disconnect
            isLeavingRef.current = true;
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, []);

    if (error) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#0f0f11] to-[#1a1b1e]">
                <div className="text-center">
                    <p className="text-red-500 mb-4">{error}</p>
                    <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-500 text-white rounded">
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (!token || !url || !roomName) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#0f0f11] to-[#1a1b1e]">
                <p className="text-gray-400">Preparing voice environment...</p>
            </div>
        );
    }

    return (
        <div style={{ height: '100%', width: '100%' }} className="lk lk-theme-default">
            <LiveKitRoom
                video={false}
                audio={true}
                token={token}
                connect={true}
                serverUrl={url}
                data-lk-theme="dark"
                style={{ height: '100%', width: '100%' }}
                onConnected={() => {
                    console.log('✅ Voice call connected');
                    if (connectionTimeoutRef.current) {
                        clearTimeout(connectionTimeoutRef.current);
                        connectionTimeoutRef.current = null;
                    }
                }}
                onDisconnected={() => {
                    console.log('⚠️ Voice call disconnected');
                    if (!isLeavingRef.current) {
                        handleLeaveRoom();
                    }
                }}
                onError={(error) => {
                    const msg = error?.message || '';
                    if (msg.toLowerCase().includes('client initiated disconnect')) {
                        console.log('ℹ️ Voice call ended (client initiated)');
                        return;
                    }
                    console.error('❌ Voice call error:', error);
                    if (connectionTimeoutRef.current) {
                        clearTimeout(connectionTimeoutRef.current);
                        connectionTimeoutRef.current = null;
                    }
                    setError(`Voice connection failed: ${msg}`);
                }}
            >
                <VoiceCallUIWrapper
                    callDuration={callDuration}
                    onLeave={handleLeaveRoom}
                    channelName={channelName}
                    onParticipantsChanged={setHasParticipants}
                    showWarning={showWarning}
                    minutesRemaining={minutesRemaining}
                    onHideWarning={() => setShowWarning(false)}
                />
            </LiveKitRoom>
        </div>
    );
}

// Voice Call UI Component
function VoiceCallUI({
    callDuration,
    onLeave,
    channelName,
    showWarning,
    minutesRemaining,
    onHideWarning,
}: {
    callDuration: number;
    onLeave: () => void;
    channelName: string;
    showWarning: boolean;
    minutesRemaining: number;
    onHideWarning: () => void;
}) {
    const remoteParticipants = useRemoteParticipants();
    const { localParticipant } = useLocalParticipant();
    const [isMuted, setIsMuted] = useState(false);

    const formatDuration = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="w-full h-full bg-gradient-to-br from-[#0f0f11] to-[#1a1b1e] flex flex-col items-center justify-center p-6">
            {/* Warning Banner */}
            {showWarning && (
                <div className="absolute top-4 left-4 right-4 bg-yellow-500/90 text-white p-3 rounded-lg flex items-center justify-between z-50">
                    <span className="font-semibold">⏰ Call will end in {minutesRemaining} minutes</span>
                    <button onClick={onHideWarning} className="text-white/70 hover:text-white">✕</button>
                </div>
            )}

            {/* Header */}
            <div className="mb-12 text-center">
                <h2 className="text-3xl font-bold text-white mb-2">🎤 {channelName}</h2>
                <p className="text-gray-400">Voice Call in Progress</p>
            </div>

            {/* Call Duration */}
            <div className="text-5xl font-bold text-white mb-12 font-mono">
                {formatDuration(callDuration)}
            </div>

            {/* Participants */}
            <div className="bg-[#1a1b1e] rounded-lg p-8 mb-12 w-full max-w-md">
                <h3 className="text-lg font-semibold text-white mb-6 text-center">👥 Participants</h3>

                {/* Local Participant */}
                <div className="bg-[#0f0f11] rounded-lg p-4 mb-4 border-2 border-green-500">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                            <span className="text-white text-xl">🎤</span>
                        </div>
                        <div>
                            <p className="text-white font-semibold">{localParticipant?.name || 'You'}</p>
                            <p className="text-green-400 text-sm">Connected</p>
                        </div>
                    </div>
                </div>

                {/* Remote Participants */}
                {remoteParticipants.map((participant) => (
                    <div key={participant.identity} className="bg-[#0f0f11] rounded-lg p-4 mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center">
                                <span className="text-white text-xl">👤</span>
                            </div>
                            <div>
                                <p className="text-white font-semibold">{participant.name || 'Participant'}</p>
                                <p className="text-blue-400 text-sm">In Call</p>
                            </div>
                        </div>
                    </div>
                ))}

                {remoteParticipants.length === 0 && (
                    <p className="text-gray-400 text-center text-sm">Waiting for participants...</p>
                )}
            </div>

            {/* Controls */}
            <div className="flex gap-6 items-center">
                {/* Mute Button */}
                <button
                    onClick={() => setIsMuted(!isMuted)}
                    className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                        isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
                    }`}
                    title={isMuted ? 'Unmute' : 'Mute'}
                >
                    <span className="text-2xl">{isMuted ? '🔇' : '🔊'}</span>
                </button>

                {/* Leave Button */}
                <button
                    onClick={onLeave}
                    className="w-16 h-16 rounded-full flex items-center justify-center bg-red-600 hover:bg-red-700 transition-all"
                    title="End Call"
                >
                    <span className="text-2xl">📞</span>
                </button>
            </div>

            {/* Instructions */}
            <p className="text-gray-400 text-sm mt-12">Click the phone button to end the call</p>
        </div>
    );
}

// Wrapper to track participants
function VoiceCallUIWrapper({
    callDuration,
    onLeave,
    channelName,
    onParticipantsChanged,
    showWarning,
    minutesRemaining,
    onHideWarning,
}: {
    callDuration: number;
    onLeave: () => void;
    channelName: string;
    onParticipantsChanged: (hasParticipants: boolean) => void;
    showWarning: boolean;
    minutesRemaining: number;
    onHideWarning: () => void;
}) {
    const remoteParticipants = useRemoteParticipants();
    const { localParticipant } = useLocalParticipant();

    // Notify parent about participant changes - only count REMOTE participants
    useEffect(() => {
        const hasRemoteParticipants = remoteParticipants.length > 0;
        console.log(`👥 Remote participants in voice call: ${remoteParticipants.length}`);
        onParticipantsChanged(hasRemoteParticipants);
    }, [remoteParticipants, onParticipantsChanged]);

    return (
        <VoiceCallUI
            callDuration={callDuration}
            onLeave={onLeave}
            channelName={channelName}
            showWarning={showWarning}
            minutesRemaining={minutesRemaining}
            onHideWarning={onHideWarning}
        />
    );
}
