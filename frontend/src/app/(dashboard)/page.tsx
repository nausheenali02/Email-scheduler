"use client";

import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import ComposeModal from "@/components/ComposeModal";
import SlackModal from "@/components/SlackModal";
import {
  Clock,
  Send,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Mail,
  Loader2,
  Calendar,
  Inbox,
  Plus,
} from "lucide-react";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<"scheduled" | "sent">("scheduled");
  const [scheduledJobs, setScheduledJobs] = useState<any[]>([]);
  const [sentJobs, setSentJobs] = useState<any[]>([]);
  const [scheduledCount, setScheduledCount] = useState<number>(0);
  const [sentCount, setSentCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchResults, setSearchResults] = useState<any[] | null>(null);

  const [composeOpen, setComposeOpen] = useState<boolean>(false);
  const [slackOpen, setSlackOpen] = useState<boolean>(false);

  const fetchScheduled = useCallback(async () => {
    try {
      const res = await fetch("/api/emails/scheduled?page=1&limit=50");
      if (res.ok) {
        const data = await res.json();
        setScheduledJobs(data.jobs || []);
        if (data.total !== undefined) setScheduledCount(data.total);
      }
    } catch (err) {
      console.error("Failed to fetch scheduled emails:", err);
    }
  }, []);

  const fetchSent = useCallback(async () => {
    try {
      const res = await fetch("/api/emails/sent?page=1&limit=50");
      if (res.ok) {
        const data = await res.json();
        setSentJobs(data.jobs || []);
        if (data.total !== undefined) setSentCount(data.total);
      }
    } catch (err) {
      console.error("Failed to fetch sent emails:", err);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchScheduled(), fetchSent()]);
    setLoading(false);
  }, [fetchScheduled, fetchSent]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const currentJobsList = activeTab === "scheduled" ? scheduledJobs : sentJobs;

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        scheduledCount={scheduledCount}
        sentCount={sentCount}
        onOpenCompose={() => setComposeOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <Header
          onSearchResults={setSearchResults}
          onOpenSlackConnect={() => setSlackOpen(true)}
        />

        {/* Main Content Container */}
        <main className="p-8 flex-1 max-w-7xl w-full mx-auto">
          {/* Section Title & Controls */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 capitalize tracking-tight flex items-center gap-2.5">
                {searchResults !== null ? (
                  <>
                    <Mail className="w-6 h-6 text-emerald-600" />
                    Search Results
                  </>
                ) : activeTab === "scheduled" ? (
                  <>
                    <Clock className="w-6 h-6 text-emerald-600" />
                    Scheduled Emails
                  </>
                ) : (
                  <>
                    <Send className="w-6 h-6 text-emerald-600" />
                    Sent Emails
                  </>
                )}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                {searchResults !== null
                  ? `Found ${searchResults.length} matching email record(s) in Elasticsearch`
                  : activeTab === "scheduled"
                  ? "Queued emails pending transmission based on configured schedule parameters"
                  : "Historical audit log of sent and failed email deliveries"}
              </p>
            </div>

            <button
              onClick={refreshAll}
              className="flex items-center gap-2 px-3.5 py-1.5 border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs rounded-xl shadow-xs transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-600" : ""}`} />
              Refresh Data
            </button>
          </div>

          {/* Email Table Container */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            {loading ? (
              // Loading Spinner State
              <div className="p-16 flex flex-col items-center justify-center text-center">
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                  Loading Email Queue Data...
                </span>
              </div>
            ) : searchResults !== null ? (
              // Search Results View
              searchResults.length === 0 ? (
                <EmptyState
                  title="No matching emails found"
                  description="Try adjusting your query or search terms in the top bar."
                  onAction={() => setSearchResults(null)}
                  actionText="Clear Search"
                />
              ) : (
                <EmailTable jobs={searchResults} isScheduledView={false} />
              )
            ) : currentJobsList.length === 0 ? (
              // Empty State View
              <EmptyState
                title={activeTab === "scheduled" ? "No scheduled emails pending" : "No sent emails logged"}
                description={
                  activeTab === "scheduled"
                    ? "Click Compose to create and schedule your first automated email campaign."
                    : "Sent and completed email deliveries will automatically appear here."
                }
                onAction={activeTab === "scheduled" ? () => setComposeOpen(true) : undefined}
                actionText={activeTab === "scheduled" ? "+ Compose Email" : undefined}
              />
            ) : (
              // Clean List/Table View
              <EmailTable jobs={currentJobsList} isScheduledView={activeTab === "scheduled"} />
            )}
          </div>
        </main>
      </div>

      {/* Modals */}
      <ComposeModal
        isOpen={composeOpen}
        onClose={() => setComposeOpen(false)}
        onSuccess={refreshAll}
      />
      <SlackModal
        isOpen={slackOpen}
        onClose={() => setSlackOpen(false)}
      />
    </div>
  );
}

/**
 * Clean List / Table Component
 */
function EmailTable({ jobs, isScheduledView }: { jobs: any[]; isScheduledView: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <th className="py-3 px-6">Recipient</th>
            <th className="py-3 px-6">Subject</th>
            <th className="py-3 px-6">
              {isScheduledView ? "Scheduled Time" : "Sent Time"}
            </th>
            <th className="py-3 px-6 text-right">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-xs">
          {jobs.map((job) => (
            <tr key={job.id} className="hover:bg-slate-50/80 transition-colors">
              {/* Recipient */}
              <td className="py-4 px-6 font-semibold text-slate-900 truncate max-w-[220px]">
                {job.recipient}
              </td>

              {/* Subject & Preview */}
              <td className="py-4 px-6 max-w-md">
                <div className="font-bold text-slate-900 truncate">{job.subject}</div>
                {job.body && (
                  <div className="text-slate-400 truncate text-[11px] mt-0.5 max-w-sm">
                    {job.body}
                  </div>
                )}
              </td>

              {/* Time Badge */}
              <td className="py-4 px-6 whitespace-nowrap">
                {isScheduledView ? (
                  /* Orange Badge Tag (e.g. Tue 9:15:12 AM) */
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100/90 text-amber-800 border border-amber-200/80 shadow-2xs">
                    <Calendar className="w-3.5 h-3.5 text-amber-600" />
                    {formatOrangeScheduledTag(job.scheduledAt)}
                  </span>
                ) : (
                  /* Sent Time */
                  <span className="text-slate-600 font-medium">
                    {job.sentAt
                      ? new Date(job.sentAt).toLocaleString([], { dateStyle: "short", timeStyle: "medium" })
                      : job.scheduledAt
                      ? new Date(job.scheduledAt).toLocaleString([], { dateStyle: "short", timeStyle: "medium" })
                      : "-"}
                  </span>
                )}
              </td>

              {/* Status Badge */}
              <td className="py-4 px-6 text-right whitespace-nowrap">
                {job.status === "SENT" ? (
                  /* Sent in grey/emerald pill */
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Sent
                  </span>
                ) : job.status === "FAILED" ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
                    <XCircle className="w-3.5 h-3.5 text-red-600" />
                    Failed
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    Scheduled
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Format timestamp as Orange Scheduled Tag (e.g. Tue 9:15:12 AM)
 */
function formatOrangeScheduledTag(dateInput?: string | Date): string {
  if (!dateInput) return "Tue 9:15:12 AM";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "Tue 9:15:12 AM";

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayStr = days[date.getDay()];
  const timeStr = date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  return `${dayStr} ${timeStr}`;
}

/**
 * Empty State Component with Illustration
 */
function EmptyState({
  title,
  description,
  onAction,
  actionText,
}: {
  title: string;
  description: string;
  onAction?: () => void;
  actionText?: string;
}) {
  return (
    <div className="p-16 text-center flex flex-col items-center justify-center">
      <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 border border-emerald-100 shadow-sm">
        <Inbox className="w-8 h-8 stroke-[1.5]" />
      </div>
      <h3 className="text-base font-bold text-slate-900 mb-1">{title}</h3>
      <p className="text-xs text-slate-500 max-w-sm mx-auto mb-6">{description}</p>
      {onAction && actionText && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          {actionText}
        </button>
      )}
    </div>
  );
}
