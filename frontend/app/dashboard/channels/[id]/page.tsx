"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { 
  PhoneIcon, 
  VideoCameraIcon,
  PlusIcon,
  DocumentIcon,
  UserPlusIcon,
  PaperClipIcon,
  FaceSmileIcon
} from "@heroicons/react/24/outline";
import { io, Socket } from "socket.io-client";
import axios from "axios";
import { useRef } from "react";

export default function ChannelPage() {
  const params = useParams();
  const id = params.id as string;
  const channelName = id.charAt(0).toUpperCase() + id.slice(1).replace(/-/g, ' ');

  const [workspaceName, setWorkspaceName] = useState("Jay thakkar's Workspace");

  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [socket, setSocket] = useState<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  useEffect(() => { scrollToBottom(); }, [messages]);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const parsed = JSON.parse(userStr);
        if (parsed.firstName) setWorkspaceName(`${parsed.firstName}'s Workspace`);
        userRef.current = parsed;
      } catch (e) {}
    }

    const fetchHistory = async () => {
      try {
         const token = localStorage.getItem("token");
         const res = await axios.get(`http://localhost:5000/api/channels/${id}/messages`, {
            headers: { Authorization: `Bearer ${token}` }
         });
         setMessages(res.data);
      } catch (err) { console.error("Failed to load history", err); }
    };
    fetchHistory();

    const newSocket = io("http://localhost:5000");
    setSocket(newSocket);

    newSocket.emit("join_channel", id);

    newSocket.on("receive_message", (msg: any) => {
       setMessages(prev => [...prev, msg]);
    });

    return () => {
       newSocket.emit("leave_channel", id);
       newSocket.disconnect();
    };
  }, [id]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !socket || !userRef.current) return;
    socket.emit("send_message", {
       channelId: id,
       text: newMessage.trim(),
       senderId: userRef.current._id || userRef.current.id
    });
    setNewMessage("");
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[var(--bg-canvas)]">
      {/* Top Navigation Header */}
      <div className="flex-none border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
        <div className="flex items-center justify-between px-6 py-4">
          <h1 className="text-[18px] font-bold text-[var(--text-primary)]">{workspaceName}</h1>
          <div className="flex items-center gap-4">
            <button className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
              <PhoneIcon className="w-4 h-4" />
            </button>
            <button className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
              <VideoCameraIcon className="w-5 h-5" />
            </button>
            <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex flex-shrink-0 items-center justify-center border border-blue-200 dark:border-blue-800 overflow-hidden text-blue-600 dark:text-blue-400 font-bold text-[10px]">
              1
            </div>
            <button className="px-3 py-1.5 rounded-md bg-[var(--bg-surface-2)] text-[12px] text-[var(--text-secondary)] font-medium hover:bg-[var(--bg-surface)] transition-colors flex items-center gap-1.5">
              <span className="text-purple-500">✨</span> Ask AI
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-5 flex items-center gap-1 font-medium text-[13px] overflow-x-auto ck-scrollbar">
          <button className="flex items-center gap-1.5 px-3 py-2 text-[var(--ck-blue)] border-b-2 border-[var(--ck-blue)] transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 9h16 M4 15h16 M10 3L8 21 M16 3l-2 18"/></svg>
            Channel
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] rounded-t-md transition-colors border-b-2 border-transparent">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            List
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] rounded-t-md transition-colors border-b-2 border-transparent">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
            Board
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] rounded-t-md transition-colors border-b-2 border-transparent">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Calendar
          </button>
          <div className="w-px h-4 bg-[var(--border-subtle)] mx-1" />
          <button className="flex items-center gap-1.5 px-3 py-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] rounded-t-md transition-colors border-b-2 border-transparent">
            <PlusIcon className="w-4 h-4" />
            View
          </button>
        </div>
      </div>

      {/* Main Channels Content Area (Chat) */}
      <div className="flex-1 flex flex-col min-h-0 bg-transparent">
        <div className="flex-1 overflow-y-auto w-full flex justify-center pt-24 pb-12 ck-scrollbar relative">
          <div className="w-full max-w-[560px] px-6">
            <h2 className="text-[20px] font-bold text-[var(--text-primary)] mb-2.5 tracking-tight">Chat in #{channelName}</h2>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)] mb-8 max-w-[500px]">
              Collaborate seamlessly across tasks and conversations. Start chat
              ting with your team or connect tasks to stay on top of your work.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 mb-10 w-[420px] max-w-full relative left-[30px]">
              <button className="w-full bg-[var(--bg-canvas)] hover:bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] text-[13px] font-medium text-[var(--text-secondary)] rounded-lg py-2.5 flex items-center justify-center gap-2 transition-colors shadow-sm">
                <PlusIcon className="w-4 h-4" /> Add People
              </button>
              <button className="w-full bg-[var(--bg-canvas)] hover:bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] text-[13px] font-medium text-[var(--text-secondary)] rounded-lg py-2.5 flex items-center justify-center gap-2.5 transition-colors shadow-sm">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1 2.521-2.52A2.528 2.528 0 0 1 13.876 5.042a2.527 2.527 0 0 1-2.521 2.52H8.834v-2.52zM8.834 6.313a2.527 2.527 0 0 1 2.521 2.521 2.527 2.527 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.835a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.835a2.527 2.527 0 0 1-2.522 2.52h-2.522v-2.52zM17.688 8.835a2.527 2.527 0 0 1-2.523 2.52 2.527 2.527 0 0 1-2.52-2.52V2.522A2.528 2.528 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.313zM15.165 18.958a2.528 2.528 0 0 1-2.523 2.522A2.528 2.528 0 0 1 10.12 18.958a2.527 2.527 0 0 1 2.521-2.52h2.522v2.52zM15.165 17.687a2.527 2.527 0 0 1-2.523-2.521 2.527 2.527 0 0 1 2.523-2.521h6.313A2.528 2.528 0 0 1 24 15.166a2.528 2.528 0 0 1-2.522 2.521h-6.313z"/></svg> Import from Slack
              </button>
            </div>

            {/* Feature Cards block positioned identically to screenshot */}
            <div className="flex flex-col gap-3.5 w-full max-w-[420px] relative left-[30px]">
              {/* Track Tasks */}
              <div className="flex items-center gap-4 py-3 px-4 rounded-[14px] bg-[#fbf5fb] dark:bg-[#322332] hover:shadow-sm border border-transparent transition-all cursor-pointer">
                <div className="w-8 h-8 rounded-[10px] bg-[#f0daf0] dark:bg-[#4d334d] flex items-center justify-center flex-shrink-0 text-[#c251c2] dark:text-[#eb8feb]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                </div>
                <div>
                  <h3 className="text-[13px] font-bold text-[var(--text-primary)] leading-tight mb-0.5">Track Tasks</h3>
                  <p className="text-[12px] text-[var(--text-muted)] tracking-wide">Manage tasks, bugs, people, and more</p>
                </div>
              </div>

              {/* Add Doc */}
              <div className="flex items-center gap-4 py-3 px-4 rounded-[14px] bg-[#f5f9fb] dark:bg-[#1a2f3a] hover:shadow-sm border border-transparent transition-all cursor-pointer">
                <div className="w-8 h-8 rounded-[10px] bg-[#dcedf6] dark:bg-[#20455a] flex items-center justify-center flex-shrink-0 text-[#2582b7] dark:text-[#4cb5f5]">
                  <DocumentIcon className="w-[18px] h-[18px]" strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-[13px] font-bold text-[var(--text-primary)] leading-tight mb-0.5">Add Doc</h3>
                  <p className="text-[12px] text-[var(--text-muted)] tracking-wide">Take notes or create detailed documents</p>
                </div>
              </div>

              {/* Start SyncUp */}
              <div className="flex items-center gap-4 py-3 px-4 rounded-[14px] bg-[#f4fbf7] dark:bg-[#1b3425] hover:shadow-sm border border-transparent transition-all cursor-pointer">
                <div className="w-8 h-8 rounded-[10px] bg-[#d7f1df] dark:bg-[#215135] flex items-center justify-center flex-shrink-0 text-[#17964b] dark:text-[#38c973]">
                  <VideoCameraIcon className="w-[18px] h-[18px]" strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-[13px] font-bold text-[var(--text-primary)] leading-tight mb-0.5">Start SyncUp</h3>
                  <p className="text-[12px] text-[var(--text-muted)] tracking-wide">Jump on a voice call or video call</p>
                </div>
              </div>
            </div>

            {/* Messages Feed */}
            <div className="w-full mt-10 space-y-5">
              {messages.map((msg, i) => {
                 const isMe = msg.sender?._id === userRef.current?._id || msg.sender?._id === userRef.current?.id;
                 const senderName = msg.sender?.fullName || msg.sender?.firstName || 'Unknown';
                 const initial = senderName.charAt(0).toUpperCase();
                 const timeString = new Date(msg.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

                 return (
                    <div key={msg._id || i} className={`w-full flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                       <div className={`w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0 text-[12px] font-bold text-white shadow-sm border border-[var(--border-subtle)] ${isMe ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-[var(--bg-surface-2)] text-[var(--text-secondary)]'}`}>
                          {initial}
                       </div>
                       <div className={`flex flex-col max-w-[85%] ${isMe ? 'items-end' : 'items-start'}`}>
                          <div className="flex items-baseline gap-2 mb-1">
                             <span className="text-[12.5px] font-bold text-[var(--text-primary)] tracking-tight">{isMe ? 'Me' : senderName}</span>
                             <span className="text-[10px] font-medium text-[var(--text-muted)]">{timeString}</span>
                          </div>
                          <div className={`px-3.5 py-2.5 rounded-[14px] text-[13.5px] leading-relaxed text-[var(--text-primary)] shadow-sm ${isMe ? 'bg-[#e3f0ff] dark:bg-[#1e3a5f] rounded-tr-sm border-transparent' : 'bg-[var(--bg-surface-2)] rounded-tl-sm border border-[var(--border-subtle)]'}`}>
                             {msg.text}
                          </div>
                       </div>
                    </div>
                 );
              })}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>

        {/* Bottom Input Fixed Area */}
        <div className="flex-none px-6 pb-6 pt-2 mx-auto w-full max-w-[850px] flex justify-center sticky bottom-0 z-20">
            <div className="relative w-full rounded-[14px] border-[1.5px] border-[var(--border-subtle)] bg-[var(--bg-canvas)] flex flex-col pt-0 group focus-within:ring-1 focus-within:border-[var(--ck-blue)] focus-within:ring-[var(--ck-blue)] transition-all min-h-[90px] shadow-sm">
               
               {/* Floating Warning Banner */}
               <div className="absolute -top-[48px] left-0 right-0 h-[40px] bg-[#2a2b2f] dark:bg-[#18191c] border border-transparent dark:border-[var(--border-subtle)] rounded-[10px] shadow-md flex items-center justify-between px-3 z-10">
                 <div className="flex items-center gap-2">
                   <span className="text-[16px] leading-none mb-0.5">👋</span>
                   <span className="text-[13px] font-medium text-white tracking-wide">
                      Send a message <span className="text-gray-400 font-normal">to #{channelName} to get the conversation started!</span>
                   </span>
                 </div>
                 <button className="text-[11.5px] font-semibold text-gray-400 hover:text-white px-2.5 py-1.5 rounded-md hover:bg-[#3f4045] transition-colors">Dismiss</button>
               </div>

               {/* Editor area */}
               <div className="px-4 py-3 pb-2 flex-1 relative">
                 <textarea 
                   value={newMessage}
                   onChange={e => setNewMessage(e.target.value)}
                   onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                         e.preventDefault();
                         handleSendMessage();
                      }
                   }}
                   autoFocus
                   placeholder={`Write to ${channelName}, press 'space' for AI, '/' for commands`}
                   className="w-full bg-transparent border-none outline-none text-[14px] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] resize-none min-h-[22px] overflow-hidden"
                   rows={1}
                 />
                 <div className="absolute top-2 right-4 flex gap-1 invisible group-hover:visible transition-opacity opacity-0 group-hover:opacity-100"></div>
               </div>

               {/* Formatting Bar */}
               <div className="flex items-center justify-between px-2.5 pb-2 border-t border-transparent transition-colors">
                  <div className="flex items-center gap-0.5">
                     <button className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[var(--bg-surface-2)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
                       <PlusIcon className="w-4 h-4" strokeWidth={2.5} />
                     </button>
                     <button className="h-7 px-2.5 flex items-center gap-1.5 rounded-[5px] hover:bg-[#e4e4e7] dark:hover:bg-[#343438] text-[12.5px] font-medium text-[var(--text-primary)] transition-colors border border-[var(--border-subtle)] bg-[#f4f4f5] dark:bg-[#27272a] shadow-sm mx-1">
                       Message <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                     </button>
                     
                     <div className="w-px h-4 bg-[var(--border-subtle)] mx-1"></div>

                     {/* Formatting tools */}
                     <button className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[var(--bg-surface-2)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"><span className="text-pink-500 font-bold text-[14px]">#</span></button>
                     <button className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[var(--bg-surface-2)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"><span className="text-purple-500 font-bold text-[15px]">@</span></button>
                     <button className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[var(--bg-surface-2)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"><PaperClipIcon className="w-4 h-4" strokeWidth={2.5} /></button>
                     <button className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[var(--bg-surface-2)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"><FaceSmileIcon className="w-[18px] h-[18px]" strokeWidth={2} /></button>
                     <button className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[var(--bg-surface-2)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors text-[16px] font-bold">@</button>
                  </div>

                  <button onClick={handleSendMessage} className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[var(--bg-surface-2)] text-[var(--text-muted)] transition-colors" title="Send message">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                  </button>
               </div>
            </div>
        </div>
      </div>
    </div>
  );
}
