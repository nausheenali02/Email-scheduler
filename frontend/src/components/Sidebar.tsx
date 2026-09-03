"use client";

import React, { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { Clock, Send, Plus, ChevronDown, LogOut, CheckCircle2 } from "lucide-react";

interface SidebarProps {
  activeTab: "scheduled" | "sent";
  setActiveTab: (tab: "scheduled" | "sent") => void;
  scheduledCount?: number;
  sentCount?: number;
  onOpenCompose: () => void;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  scheduledCount = 0,
  sentCount = 0,
  onOpenCompose,
}: SidebarProps) {
  const { data: session } = useSession();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const userName = session?.user?.name || "User Profile";
  const userEmail = session?.user?.email || "your.email@reachinbox.com";
  const userAvatar = session?.user?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=059669&color=fff`;

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen select-none sticky top-0">
      {/* Brand Logo Header */}
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shadow-md shadow-emerald-600/20">
            ONB
          </div>
          <div>
            <span className="font-bold text-slate-900 text-base tracking-tight">ReachInbox</span>
            <span className="text-[10px] block font-semibold text-emerald-600 uppercase tracking-widest">Email Scheduler</span>
          </div>
        </div>
      </div>

      {/* User Profile Box */}
      <div className="p-4 border-b border-slate-100 relative">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors border border-slate-200/60"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={userAvatar}
              alt={userName}
              className="w-8 h-8 rounded-full object-cover border border-slate-200"
            />
            <div className="text-left truncate">
              <div className="text-xs font-semibold text-slate-900 truncate">{userName}</div>
              <div className="text-[11px] text-slate-500 truncate">{userEmail}</div>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
        </button>

        {dropdownOpen && (
          <div className="absolute top-16 left-4 right-4 bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-1.5">
            <div className="px-3 py-2 border-b border-slate-100">
              <div className="text-xs font-medium text-slate-500">Signed in as</div>
              <div className="text-xs font-bold text-slate-900 truncate">{userEmail}</div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        )}
      </div>

      {/* Compose Pill Button */}
      <div className="p-4">
        <button
          onClick={onOpenCompose}
          className="w-full border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50 active:bg-emerald-100 font-semibold py-2.5 px-5 rounded-full transition-all duration-150 flex items-center justify-center gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          Compose
        </button>
      </div>

      {/* Core Navigation Section */}
      <div className="px-3 py-2 flex-1">
        <div className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
          CORE
        </div>

        <nav className="space-y-1">
          <button
            onClick={() => setActiveTab("scheduled")}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === "scheduled"
                ? "bg-emerald-50 text-emerald-700 font-semibold"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <div className="flex items-center gap-3">
              <Clock className={`w-4 h-4 ${activeTab === "scheduled" ? "text-emerald-600" : "text-slate-400"}`} />
              <span>Scheduled</span>
            </div>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                activeTab === "scheduled"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {scheduledCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("sent")}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === "sent"
                ? "bg-emerald-50 text-emerald-700 font-semibold"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <div className="flex items-center gap-3">
              <Send className={`w-4 h-4 ${activeTab === "sent" ? "text-emerald-600" : "text-slate-400"}`} />
              <span>Sent</span>
            </div>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                activeTab === "sent"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {sentCount}
            </span>
          </button>
        </nav>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-100 text-center text-xs text-slate-400">
        System Status: <span className="text-emerald-600 font-semibold inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Operational</span>
      </div>
    </aside>
  );
}
