'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, PaperAirplaneIcon, ChatBubbleLeftEllipsisIcon } from '@heroicons/react/24/outline';
import { useSocket } from '../../providers/SocketProvider';
import { channelsApi, type ChannelMessage } from '../../../src/api/channels.api';

interface InCallChatPanelProps {
    isOpen: boolean;
    onClose: () => void;
    channelId: string;
    currentUser: { _id: string; firstName: string; lastName: string } | null;
    onUnreadCount?: (count: number) => void;
}

export function InCallChatPanel({ isOpen, onClose, channelId, currentUser, onUnreadCount }: InCallChatPanelProps) {
    const { socket, isConnected } = useSocket();
    const [messages, setMessages] = useState<ChannelMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const unreadRef = useRef(0);

    // Make sure we're in the socket room for this channel
    useEffect(() => {
        if (socket && isConnected) {
            socket.emit('join_channel', channelId);
        }
    }, [socket, isConnected, channelId]);

    // Load initial messages
    useEffect(() => {
        setLoading(true);
        channelsApi.getMessages(channelId)
            .then(msgs => setMessages(msgs))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [channelId]);

    // Stable message handler using useCallback so it has a fixed reference.
    // This prevents page.tsx's socket.off("receive_message") [which removes ALL listeners]
    // from being re-added after each re-render.
    const handleNewMessage = useCallback((msg: ChannelMessage) => {
        setMessages(prev => {
            const alreadyExists = prev.some(
                m => (m as any).local && m.text === msg.text && m.sender?._id === msg.sender?._id
            );
            if (alreadyExists) {
                return prev.map(m =>
                    (m as any).local && m.text === msg.text && m.sender?._id === msg.sender?._id
                        ? msg : m
                );
            }
            return [...prev, msg];
        });

        if (!isOpen) {
            unreadRef.current += 1;
            onUnreadCount?.(unreadRef.current);
        }
    }, [isOpen, onUnreadCount]);

    // Re-register the listener whenever socket changes.
    // We use a named function so we can remove exactly this one listener.
    useEffect(() => {
        if (!socket) return;
        socket.on('receive_message', handleNewMessage);
        return () => {
            socket.off('receive_message', handleNewMessage);
        };
    }, [socket, handleNewMessage]);

    // Reset unread count when panel opens
    useEffect(() => {
        if (isOpen) {
            unreadRef.current = 0;
            onUnreadCount?.(0);
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen, onUnreadCount]);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isOpen]);

    const sendMessage = useCallback(() => {
        const text = newMessage.trim();
        if (!text || !socket || !isConnected || !currentUser) return;

        // Optimistic update
        const optimistic = {
            _id: `local-${Date.now()}`,
            channelId,
            text,
            sender: currentUser,
            mentions: [],
            attachments: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            local: true,
        } as ChannelMessage & { local: boolean };

        setMessages(prev => [...prev, optimistic]);
        setNewMessage('');

        socket.emit('send_message', {
            channelId,
            text,
            senderId: currentUser._id,
            mentions: [],
            attachments: [],
        });
    }, [newMessage, socket, isConnected, currentUser, channelId]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const formatTime = (d: string) =>
        new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ x: '100%', opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: '100%', opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="absolute top-0 right-0 bottom-0 w-80 bg-[#16171e]/95 backdrop-blur-2xl border-l border-white/5 flex flex-col z-30 shadow-2xl"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0">
                        <div className="flex items-center gap-2.5">
                            <ChatBubbleLeftEllipsisIcon className="w-4.5 h-4.5 text-indigo-400" />
                            <h3 className="text-sm font-bold text-white tracking-tight">In-Call Chat</h3>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                        >
                            <XMarkIcon className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 ck-scrollbar">
                        {loading ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="w-5 h-5 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
                                    <ChatBubbleLeftEllipsisIcon className="w-6 h-6 text-gray-500" />
                                </div>
                                <p className="text-xs font-medium text-gray-500">No messages yet.<br />Say hello! 👋</p>
                            </div>
                        ) : (
                            messages.map((msg, i) => {
                                const isMe = msg.sender?._id === currentUser?._id;
                                const senderName = msg.sender ? `${msg.sender.firstName} ${msg.sender.lastName}` : 'Unknown';
                                const showSender = i === 0 || messages[i - 1]?.sender?._id !== msg.sender?._id;

                                return (
                                    <div key={msg._id || i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                        {showSender && !isMe && (
                                            <span className="text-[10px] font-semibold text-indigo-400 mb-1 ml-1 uppercase tracking-wide">
                                                {senderName}
                                            </span>
                                        )}
                                        <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                                            isMe
                                                ? 'bg-indigo-600 text-white rounded-br-sm'
                                                : 'bg-white/8 text-gray-100 rounded-bl-sm border border-white/5'
                                        }`}>
                                            {msg.text}
                                        </div>
                                        <span className="text-[9px] text-gray-600 mt-1 mx-1">
                                            {formatTime(msg.createdAt)}
                                        </span>
                                    </div>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="px-4 py-4 border-t border-white/5 shrink-0">
                        <div className="flex items-center gap-2 bg-white/5 border border-white/8 rounded-2xl px-4 py-2.5 focus-within:border-indigo-500/50 transition-colors">
                            <input
                                ref={inputRef}
                                type="text"
                                value={newMessage}
                                onChange={e => setNewMessage(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Message..."
                                className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none min-w-0"
                            />
                            <button
                                onClick={sendMessage}
                                disabled={!newMessage.trim()}
                                className="p-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-90 shrink-0"
                            >
                                <PaperAirplaneIcon className="w-3.5 h-3.5 text-white" />
                            </button>
                        </div>
                        <p className="text-[9px] text-gray-600 text-center mt-2">Enter to send · Messages visible to channel</p>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
