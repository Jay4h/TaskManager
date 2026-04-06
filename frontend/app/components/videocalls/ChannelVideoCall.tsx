'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { LiveKitRoom, VideoConference, useRemoteParticipants } from '@livekit/components-react';
import '@livekit/components-styles';
import { videocallsApi } from '../../../src/api/videocalls.api';
import { useSocket } from '../../providers/SocketProvider';
import axios from 'axios';

interface VideoCallProps {
    channelId: string;
    channelName: string;
    onCallEnd?: () => void;
    theme?: 'dark' | 'light';
    token: string;
    url: string;
    roomName: string;
    callId?: string;
}

export function ChannelVideoCall({ 
    channelId, 
    channelName, 
    onCallEnd, 
    theme = 'dark', 
    token: propsToken, 
    url: propsUrl, 
    roomName: propsRoomName, 
    callId: propsCallId 
}: VideoCallProps & { token?: string; url?: string; roomName?: string; callId?: string }) {
    const [token, setToken] = useState<string>(propsToken || '');
    const [url, setUrl] = useState<string>(propsUrl || '');
    const [roomName, setRoomName] = useState<string>(propsRoomName || '');
    const [callId, setCallId] = useState<string>(propsCallId || '');
    // Start as false — we already have the token/url from props, no blocking load needed.
    // LiveKit's own <VideoConference> UI handles its internal connection state.
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>('');
    const [callStarted, setCallStarted] = useState(false);
    const [showWarning, setShowWarning] = useState(false);
    const [minutesRemaining, setMinutesRemaining] = useState(0);
    const [hasRemoteParticipants, setHasRemoteParticipants] = useState(false);
    const [callDuration, setCallDuration] = useState(0);
    const durationInterval = useRef<NodeJS.Timeout | null>(null);
    const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    // Prevents the onDisconnected callback from double-calling handleLeaveRoom
    // when the user explicitly clicks Leave (which sets token to '' then unmounts)
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
            callType: 'video',
            timestamp: Date.now(),
        };
        localStorage.setItem('activeCall', JSON.stringify(callState));
        console.log('💾 Call state saved to localStorage');
    }, [token, url, roomName, callId, channelId, channelName]);

    // Restore call state from localStorage on mount
    useEffect(() => {
        if (token && url && roomName) {
            // Only restore if we don't already have call data from props
            const stored = localStorage.getItem('activeCall');
            if (!stored) {
                saveCallState();
            }
        }
    }, [token, url, roomName, saveCallState]);

    // Auto-save call state periodically
    useEffect(() => {
        if (callStarted && token) {
            const saveInterval = setInterval(() => {
                saveCallState();
            }, 5000); // Save every 5 seconds
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

    // Validate token/url/roomName and start the call UI
    useEffect(() => {
        if (!token || !url || !roomName) {
            console.log('⏳ Waiting for token:', { hasToken: !!token, hasUrl: !!url, hasRoomName: !!roomName });
            return;
        }

        // Guard: navigator.mediaDevices is only available in secure contexts (HTTPS or localhost).
        // When the app is accessed via plain HTTP from another device, the browser blocks it entirely,
        // resulting in the "undefined is not an object (evaluating 'navigator.mediaDevices.getUserMedia')" error.
        const isSecure =
            window.location.protocol === 'https:' ||
            window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1';

        if (!isSecure || !navigator.mediaDevices) {
            console.error('❌ Insecure context: navigator.mediaDevices is not available.');
            setError(
                'Video/audio calls require a secure connection (HTTPS). ' +
                'You are currently accessing this app over plain HTTP from a remote device. ' +
                'Please ask your administrator to enable HTTPS, or access the app via localhost on this machine.'
            );
            return;
        }

        // Validate token format
        if (typeof token !== 'string' || token.length < 50) {
            console.error('❌ Invalid token received:', { type: typeof token, length: token?.length });
            setError('Invalid authentication token received. Please try again.');
            return;
        }

        console.log('✅ Token received and validated, rendering LiveKit room');
        console.log('📍 LiveKit URL:', url);
        console.log('🎥 Room name:', roomName);

        // Validate room name format
        if (!/^[a-zA-Z0-9_-]+$/.test(roomName)) {
            console.error('❌ Invalid room name format:', roomName);
            setError('Invalid room name format. Please try again.');
            return;
        }

        // Validate URL format
        try {
            new URL(url);
        } catch (e) {
            console.error('❌ Invalid LiveKit URL:', url);
            setError('Invalid video server URL. Please try again.');
            return;
        }

        // Everything looks good — show the LiveKit room immediately.
        // LiveKit's own VideoConference component handles its internal loading state.
        setError('');
        setCallStarted(true);

        // Don't start timer immediately - wait for participants to join
        // Timer will start when participants are detected

        // Safety timeout: if LiveKit fires onError after 30s still no connection, show error
        connectionTimeoutRef.current = setTimeout(() => {
            // Only set error if we haven't already set one
            setError((prev) => {
                if (!prev) {
                    console.warn('⏱️ LiveKit connection timeout after 30 seconds');
                    return 'Video connection taking too long. Please check your internet connection and try again.';
                }
                return prev;
            });
        }, 30000);

        return () => {
            if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
        };
    }, [token, url, roomName]);

    // Listen for call warning events from server
    useEffect(() => {
        if (!socket) return;

        const handleCallWarning = (data: any) => {
            console.log('📢 Call warning received:', data);
            setMinutesRemaining(data.minutesRemaining);
            setShowWarning(true);

            // Auto-hide warning after 5 seconds
            setTimeout(() => {
                setShowWarning(false);
            }, 5000);
        };

        const handleCallEnded = (data: any) => {
            if (data.reason === 'max_duration_exceeded') {
                console.log('⏰ Call ended due to max duration');
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

    // Start/stop timer based on remote participants presence
    useEffect(() => {
        if (hasRemoteParticipants && !durationInterval.current) {
            console.log('⏱️ Remote participant detected - starting timer');
            durationInterval.current = setInterval(() => {
                setCallDuration((prev) => prev + 1);
            }, 1000);
        } else if (!hasRemoteParticipants && durationInterval.current) {
            console.log('⏱️ No remote participants - stopping timer');
            clearInterval(durationInterval.current);
            durationInterval.current = null;
        }

        return () => {
            if (durationInterval.current) {
                clearInterval(durationInterval.current);
            }
        };
    }, [hasRemoteParticipants]);

    const checkNetworkConnectivity = async () => {
        try {
            console.log('🌐 Checking network connectivity...');
            // Skip fetch for WebSocket URLs (wss://, ws://) since fetch API doesn't support them
            // LiveKit client will handle the connection directly
            if (url.startsWith('wss://') || url.startsWith('ws://')) {
                console.log('✅ WebSocket URL detected, skipping HTTP check (LiveKit will handle connection)');
                return true;
            }
            const response = await fetch(url, { method: 'HEAD', mode: 'no-cors' });
            console.log('✅ Network OK, server reachable');
            return true;
        } catch (err) {
            console.error('❌ Network error:', err);
            return false;
        }
    };

    // Diagnostic effect to check connectivity on component mount
    useEffect(() => {
        if (token && url && roomName) {
            checkNetworkConnectivity();
        }
    }, [token, url, roomName]);

    const handleLeaveRoom = useCallback(async () => {
        if (isLeavingRef.current) return; // prevent double-execution
        isLeavingRef.current = true;

        try {
            if (callId) {
                await videocallsApi.endCall(channelId, callId);
            } else {
                await videocallsApi.leaveCall(channelId);
            }
        } catch (err) {
            console.error('Error leaving call:', err);
        } finally {
            if (durationInterval.current) clearInterval(durationInterval.current);
            if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
            // Clear call state from localStorage ONLY when user explicitly leaves
            localStorage.removeItem('activeCall');
            console.log('🗑️ Call state cleared from localStorage');
            // Let the parent (page.tsx) handle unmounting by calling onCallEnd.
            // Do NOT clear token/roomName here — clearing them causes LiveKit to
            // report 'Client initiated disconnect' while it's mid-teardown.
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

    if (loading) {
        // loading is now always false on mount — this block is a safety fallback only
        return (
            <div className="w-full h-full flex items-center justify-center bg-[var(--bg-canvas)]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent)] mx-auto mb-4"></div>
                    <p className="text-[var(--text-secondary)]">Preparing video call...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-[var(--bg-canvas)]">
                <div className="text-center">
                    <p className="text-red-500 mb-4">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-[var(--accent)] text-white rounded-md hover:bg-opacity-90"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (!token || !url || !roomName) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-[var(--bg-canvas)]">
                <p className="text-[var(--text-secondary)]">Preparing video environment...</p>
            </div>
        );
    }

    return (
        <div className={`w-full h-full ${theme === 'dark' ? 'bg-[#0f0f11]' : 'bg-[#f5f5f5]'} overflow-hidden relative flex flex-col`} style={{ '--lk-primary-color': '#ffffff', '--lk-text-color': '#ffffff' } as any}>
            {/* LiveKit Theme Overrides */}
            <style>{`
                .lk-room { background: #0f0f11 !important; }
                .lk-control-bar { background: rgba(15, 15, 17, 0.9) !important; }
                .lk-button { color: #ffffff !important; fill: #ffffff !important; }
                .lk-button:hover { background: rgba(255, 255, 255, 0.1) !important; }
                .lk-button-group { background: transparent !important; }
                .lk-participant { background: #1a1b1e !important; }
                .lk-participant-name { color: #ffffff !important; }
                .lk {
                    --lk-button-color: #ffffff;
                    --lk-button-hover-color: #e0e0e0;
                    --lk-text-color: #ffffff;
                    --lk-bg-color: #0f0f11;
                    --lk-control-bar-background: rgba(15, 15, 17, 0.95);
                    --lk-primary-color: #ffffff;
                }
                .lk-focus-layout { background: #0f0f11 !important; }
                .lk-grid-layout { background: #0f0f11 !important; }
                svg { color: #ffffff !important; fill: #ffffff !important; }
                .lk-button svg { color: #ffffff !important; fill: #ffffff !important; }
                .lk-button-group button { color: #ffffff !important; }
                .lk-button-group button svg { color: #ffffff !important; fill: #ffffff !important; }
                button[aria-label*="Leave"], button[aria-label*="leave"] { color: #ffffff !important; }
                button[aria-label*="Leave"] svg, button[aria-label*="leave"] svg { color: #ffffff !important; fill: #ffffff !important; }
                .lk-disconnect-button { color: #ffffff !important; }
                .lk-disconnect-button svg { color: #ffffff !important; fill: #ffffff !important; }
                text { fill: #ffffff !important; }
            `}</style>

            {/* Call Duration Warning */}
            {showWarning && (
                <div className="absolute top-16 left-4 right-4 bg-yellow-500/90 text-white p-3 rounded-lg animate-pulse z-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">⏰</span>
                        <span className="font-semibold">
                            Call will end in {minutesRemaining} minute{minutesRemaining !== 1 ? 's' : ''}
                        </span>
                    </div>
                    <button
                        onClick={() => setShowWarning(false)}
                        className="text-white/70 hover:text-white"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Video Conference */}
            <div style={{ height: '100%', width: '100%' }} className="lk lk-theme-default">
                <LiveKitRoom
                    video={true}
                    audio={true}
                    token={token}
                    connect={true}
                    serverUrl={url}
                    data-lk-theme="dark"
                    style={{ height: '100%', width: '100%' }}
                    className="!bg-[#0f0f11]"
                    onConnected={() => {
                        console.log('✅ LiveKit connected successfully');
                        if (connectionTimeoutRef.current) {
                            clearTimeout(connectionTimeoutRef.current);
                            connectionTimeoutRef.current = null;
                        }
                    }}
                    onDisconnected={() => {
                        console.log('⚠️ LiveKit disconnected');
                        // Only auto-leave if the user didn't click Leave themselves.
                        // Don't call handleLeaveRoom on page unload (refresh/navigation)
                        // because isLeavingRef is set to true in beforeunload handler
                        if (!isLeavingRef.current) {
                            handleLeaveRoom();
                        }
                    }}
                    onError={(error) => {
                        const msg = error?.message || '';
                        // 'Client initiated disconnect' is a normal LiveKit lifecycle event
                        // that fires when the room is intentionally disconnected. It is NOT
                        // an error the user needs to see.
                        if (
                            msg.toLowerCase().includes('client initiated disconnect') ||
                            msg.toLowerCase().includes('client_initiated')
                        ) {
                            console.log('ℹ️ LiveKit disconnected (client initiated — normal)');
                            return;
                        }
                        console.error('❌ LiveKit error:', error);
                        if (connectionTimeoutRef.current) {
                            clearTimeout(connectionTimeoutRef.current);
                            connectionTimeoutRef.current = null;
                        }
                        setError(`Connection failed: ${msg || 'Unable to connect to video server. Please check that the LiveKit server URL is correctly configured.'}`);
                    }}
                >
                    <VideoConferenceWrapper onRemoteParticipantsChanged={setHasRemoteParticipants} />
                </LiveKitRoom>
            </div>

        </div>
    );
}

// Wrapper to track remote participants and notify parent component
function VideoConferenceWrapper({ onRemoteParticipantsChanged }: { onRemoteParticipantsChanged: (hasRemote: boolean) => void }) {
    const remoteParticipants = useRemoteParticipants();

    useEffect(() => {
        const hasRemote = remoteParticipants.length > 0;
        console.log(`👥 Remote participants: ${remoteParticipants.length}`);
        onRemoteParticipantsChanged(hasRemote);
    }, [remoteParticipants, onRemoteParticipantsChanged]);

    return <VideoConference />;
}
