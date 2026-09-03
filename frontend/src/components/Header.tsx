"use client";

import React, { useState, useEffect } from "react";
import { Search, X, Loader2, Mail, Slack } from "lucide-react";

interface HeaderProps {
  onSearchResults: (results: any[] | null) => void;
  onOpenSlackConnect: () => void;
}

export default function Header({ onSearchResults, onOpenSlackConnect }: HeaderProps) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      onSearchResults(null);
      setSearching(false);
      return;
    }

    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/emails/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          onSearchResults(data.results || []);
        } else {
          onSearchResults([]);
        }
      } catch (err) {
        console.error("Search query failed:", err);
        onSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const clearSearch = () => {
    setQuery("");
    onSearchResults(null);
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-10">
      {/* Top Search Input Bar */}
      <div className="relative w-full max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          {searching ? (
            <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
          ) : (
            <Search className="w-4 h-4 text-slate-400" />
          )}
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search emails by subject, recipient, or body..."
          className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSlackConnect}
          className="flex items-center gap-2 px-3.5 py-1.5 border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs rounded-lg transition-colors shadow-sm"
        >
          <Slack className="w-4 h-4 text-emerald-600" />
          Slack Integration
        </button>
      </div>
    </header>
  );
}
