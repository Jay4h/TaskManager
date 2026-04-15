'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSocket } from '../../providers/SocketProvider';
import { videocallsApi } from '../../../src/api/videocalls.api';

interface IncomingCall {
  callId: string;
  channelId: string;
  channelName: string;
  roomName: string;
  initiator: {
    id: string;
    name: string;
  };
  startedAt: string;
  type: 'voice' | 'video';
  recordingEnabled?: boolean;
}

/**
 * GlobalIncomingCallBanner
 *
 * Mounts once in the layout (outside any channel page) and listens on the
 * shared Socket for `channel:call-started` events.  When a call starts in
 * ANY channel the current user is a member of, this banner floats in the
 * bottom-right and lets them join or dismiss without navigating first.
 *
 * Navigating to the channel page is still required to JOIN the LiveKit room,
 * so clicking "Join" redirects to `/dashboard/channels/<channelId>?openCall=1`.
 * The channel page reads that query param and auto-opens the call UI.
 */
export function GlobalIncomingCallBanner() {
  const { socket, isConnected } = useSocket();
  const router = useRouter();
  const pathname = usePathname();
  const [calls, setCalls] = useState<IncomingCall[]>([]);
  const dismissTimers = useRef<Record<string, NodeJS.Timeout>>({});

  const dismiss = useCallback((channelId: string) => {
    setCalls((prev) => prev.filter((c) => c.channelId !== channelId));
    if (dismissTimers.current[channelId]) {
      clearTimeout(dismissTimers.current[channelId]);
      delete dismissTimers.current[channelId];
    }
  }, []);

  const handleJoin = useCallback(
    (call: IncomingCall) => {
      dismiss(call.channelId);
      // Navigate to the channel page with openCall=1 and type
      router.push(`/dashboard/channels/${call.channelId}?openCall=1&type=${call.type}`);
    },
    [dismiss, router]
  );

  // Fetch all active calls on mount for persistence across refreshes
  useEffect(() => {
    if (!isConnected) return;

    const fetchActiveCalls = async () => {
      try {
        const activeCalls = await videocallsApi.getActiveCalls();

        // Get current user ID to avoid showing banner for own calls
        let currentUserId = null;
        try {
          const userJson = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
          if (userJson) {
            currentUserId = JSON.parse(userJson).userId;
          }
        } catch (e) {}

        const formatted = activeCalls
          .filter(ac => !currentUserId || ac.initiator.id !== currentUserId)
          .map(ac => ({
            callId: '', // Placeholder as we join by channel/room mainly
            channelId: ac.channelId,
            channelName: ac.channelName,
            roomName: ac.roomName,
            initiator: ac.initiator,
            startedAt: ac.startedAt,
            type: ac.type || 'video',
          }));

        setCalls(prev => {
          // Merge with existing calls from socket events, avoiding duplicates
          const existingIds = new Set(prev.map(c => c.channelId));
          const newCalls = formatted.filter(ac => !existingIds.has(ac.channelId));
          return [...prev, ...newCalls];
        });
      } catch (err) {
        console.error('❌ Failed to fetch active calls on mount:', err);
      }
    };

    fetchActiveCalls();
  }, [isConnected]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleCallStarted = (data: {
      callId: string;
      channelId: string;
      roomName: string;
      initiator: { id: string; name: string };
      startedAt: string;
      type: 'voice' | 'video';
      recordingEnabled?: boolean;
    }) => {
      // Don't show banner if the current user initiated the call
      let currentUserId = null;
      try {
        const userJson = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
        if (userJson) {
           currentUserId = JSON.parse(userJson).userId;
        }
      } catch (e) {
        // Ignore parse errors
      }

      if (currentUserId && data.initiator.id === currentUserId) {
        return;
      }

      // Don't add a duplicate banner for the same channel
      setCalls((prev) => {
        if (prev.some((c) => c.channelId === data.channelId)) return prev;

        const channelName =
          data.channelId
            .replace(/-/g, ' ')
            .replace(/\b\w/g, (l) => l.toUpperCase());

        const newCall: IncomingCall = {
          callId: data.callId,
          channelId: data.channelId,
          channelName,
          roomName: data.roomName,
          initiator: data.initiator,
          startedAt: data.startedAt,
          type: data.type || 'video',
          recordingEnabled: data.recordingEnabled,
        };

        /* 
        // Auto-dismiss after 30 seconds - disabled for persistence
        dismissTimers.current[data.channelId] = setTimeout(() => {
          setCalls((p) => p.filter((c) => c.channelId !== data.channelId));
          delete dismissTimers.current[data.channelId];
        }, 30000); 
        */

        return [...prev, newCall];
      });
    };

    const handleCallEnded = (data: { channelId: string }) => {
      dismiss(data.channelId);
    };

    socket.on('channel:call-started', handleCallStarted);
    socket.on('channel:call-ended', handleCallEnded);

    return () => {
      socket.off('channel:call-started', handleCallStarted);
      socket.off('channel:call-ended', handleCallEnded);
    };
  }, [socket, isConnected, dismiss]);

  // Cleanup all timers on unmount
  useEffect(() => {
    const timers = dismissTimers.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  // Extract current channel from pathname (e.g., /dashboard/channels/general -> general)
  const currentChannelId = pathname?.split('/').pop()?.toLowerCase() || '';

  // Filter calls to only show the one for the current channel
  const filteredCalls = calls.filter((c) => c.channelId.toLowerCase() === currentChannelId);

  if (filteredCalls.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      {filteredCalls.map((call) => (
        <CallNotification
          key={call.channelId}
          call={call}
          onJoin={() => handleJoin(call)}
          onDismiss={() => dismiss(call.channelId)}
        />
      ))}
    </div>
  );
}

function CallNotification({
  call,
  onJoin,
  onDismiss,
}: {
  call: IncomingCall;
  onJoin: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      className="pointer-events-auto flex flex-col gap-3 px-4 py-4 rounded-2xl shadow-2xl border backdrop-blur-md animate-toast-in"
      style={{
        background: 'rgba(15, 23, 42, 0.95)',
        borderColor: 'rgba(99, 102, 241, 0.5)',
        minWidth: '300px',
        maxWidth: '360px',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Animated ring icon */}
          <div className="relative flex-shrink-0">
            <div className={`w-10 h-10 rounded-full ${call.type === 'voice' ? 'bg-indigo-500/20' : 'bg-rose-500/20'} flex items-center justify-center`}>
              <span className="text-xl">{call.type === 'voice' ? '📞' : '📹'}</span>
            </div>
            <span className={`absolute -top-1 -right-1 w-3 h-3 ${call.type === 'voice' ? 'bg-green-400' : 'bg-red-400'} rounded-full border-2 border-slate-900 animate-pulse`} />
          </div>
          {/* Info */}
          <div>
            <p className="text-[13px] font-semibold text-white leading-tight">
              Incoming {call.type === 'voice' ? 'voice' : 'video'} call
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              <span className="text-indigo-300 font-medium">{call.initiator.name}</span> started a {call.type} call
            </p>
          </div>
        </div>

        {/* Dismiss ✕ */}
        <button
          onClick={onDismiss}
          className="text-slate-500 hover:text-white transition-colors mt-0.5 flex-shrink-0"
          title="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={onJoin}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-[12px] font-semibold text-white transition-all"
          style={{ background: 'rgba(99, 102, 241, 0.9)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(99, 102, 241, 1)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(99, 102, 241, 0.9)')}
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M15.5 6.5A5.5 5.5 0 0 1 21 12a5.5 5.5 0 0 1-5.5 5.5c-.34 0-.67-.03-1-.09V15.1c.32.06.66.1 1 .1a3.5 3.5 0 0 0 0-7c-.34 0-.68.04-1 .1V6.59c.33-.06.66-.09 1-.09M3 7l9 9-9 9V7z" />
          </svg>
          Join Call
        </button>
        <button
          onClick={onDismiss}
          className="flex-1 flex items-center justify-center py-2 px-3 rounded-lg text-[12px] font-semibold text-slate-400 hover:text-white transition-colors"
          style={{ background: 'rgba(255,255,255,0.05)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
