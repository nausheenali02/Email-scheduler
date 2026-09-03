"use client";

import React, { useState, useRef } from "react";
import {
  X,
  Send,
  Calendar,
  Clock,
  Upload,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Code,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Sparkles,
} from "lucide-react";

import { useSession } from "next-auth/react";

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ComposeModal({ isOpen, onClose, onSuccess }: ComposeModalProps) {
  const { data: session } = useSession();
  const userEmail = session?.user?.email || "you@yourdomain.com";

  const [senderEmail, setSenderEmail] = useState(userEmail);
  const [recipientInput, setRecipientInput] = useState("");
  const [parsedRecipients, setParsedRecipients] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [delaySeconds, setDelaySeconds] = useState(2);
  const [hourlyLimit, setHourlyLimit] = useState(200);
  
  // Date & Time Scheduling
  const [scheduledAt, setScheduledAt] = useState("");
  const [sendLaterOpen, setSendLaterOpen] = useState(false);
  const [presetLabel, setPresetLabel] = useState("Immediate");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // CSV / TXT File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        // Extract email addresses from file
        const emails = content
          .split(/[\n,;\r]+/)
          .map((line) => line.trim().replace(/['"]/g, ""))
          .filter((line) => line.includes("@") && line.length > 3);

        if (emails.length > 0) {
          const combined = Array.from(new Set([...parsedRecipients, ...emails]));
          setParsedRecipients(combined);
          setRecipientInput("");
        }
      }
    };
    reader.readAsText(file);
  };

  const handleAddTypedRecipient = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === ",") && recipientInput.trim()) {
      e.preventDefault();
      const newEmail = recipientInput.trim().replace(/,/g, "");
      if (newEmail.includes("@") && !parsedRecipients.includes(newEmail)) {
        setParsedRecipients([...parsedRecipients, newEmail]);
        setRecipientInput("");
      }
    }
  };

  const removeRecipient = (emailToRemove: string) => {
    setParsedRecipients(parsedRecipients.filter((email) => email !== emailToRemove));
  };

  // Rich Text Formatting Helpers
  const insertFormatting = (prefix: string, suffix: string = "") => {
    setBody((prev) => `${prev}${prefix}text${suffix}`);
  };

  // Date Preset Helpers
  const handlePresetSelect = (type: "now" | "tomorrow" | "in2h" | "nextMonday") => {
    const now = new Date();
    let selectedDate = new Date();

    if (type === "now") {
      setScheduledAt("");
      setPresetLabel("Immediate");
    } else if (type === "tomorrow") {
      selectedDate.setDate(now.getDate() + 1);
      selectedDate.setHours(10, 0, 0, 0);
      setScheduledAt(selectedDate.toISOString().slice(0, 16));
      setPresetLabel("Tomorrow 10:00 AM");
    } else if (type === "in2h") {
      selectedDate.setTime(now.getTime() + 2 * 60 * 60 * 1000);
      setScheduledAt(selectedDate.toISOString().slice(0, 16));
      setPresetLabel("In 2 Hours");
    } else if (type === "nextMonday") {
      const day = now.getDay();
      const diff = (day === 0 ? 1 : 8 - day);
      selectedDate.setDate(now.getDate() + diff);
      selectedDate.setHours(9, 0, 0, 0);
      setScheduledAt(selectedDate.toISOString().slice(0, 16));
      setPresetLabel("Next Mon 9:00 AM");
    }
    setSendLaterOpen(false);
  };

  // Final Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Gather all recipients
      const allRecipients = [...parsedRecipients];
      if (recipientInput.trim() && recipientInput.includes("@")) {
        allRecipients.push(recipientInput.trim());
      }

      if (allRecipients.length === 0) {
        throw new Error("Please specify at least one recipient email address.");
      }

      if (!subject.trim()) {
        throw new Error("Subject line is required.");
      }

      if (!body.trim()) {
        throw new Error("Email body message is required.");
      }

      const payload = {
        senderEmail,
        leads: allRecipients.length > 1 ? allRecipients : undefined,
        recipient: allRecipients.length === 1 ? allRecipients[0] : undefined,
        subject,
        body,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : new Date().toISOString(),
        delayBetweenEmails: Number(delaySeconds) * 1000,
        hourlyLimit: Number(hourlyLimit) || 200,
      };

      const res = await fetch("/api/emails/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to schedule email.");
      }

      onSuccess();
      onClose();
      // Reset
      setParsedRecipients([]);
      setRecipientInput("");
      setSubject("");
      setBody("");
      setScheduledAt("");
      setPresetLabel("Immediate");
    } catch (err: any) {
      setError(err.message || "An error occurred scheduling the email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Compose & Schedule Email</h2>
              <p className="text-xs text-slate-500">Configure recipient list, throttling, and execution time</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Sender Dropdown (From) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              From (Sender Address)
            </label>
            <select
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value={userEmail}>{session?.user?.name || "Your Account"} ({userEmail})</option>
              <option value="sales@reachinbox.com">ReachInbox Sales (sales@reachinbox.com)</option>
              <option value="outreach@reachinbox.com">Outreach Team (outreach@reachinbox.com)</option>
              <option value="support@reachinbox.com">Support (support@reachinbox.com)</option>
            </select>
          </div>

          {/* Multi-Recipient Field & CSV List Upload */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                To (Recipients)
              </label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-2.5 py-1 rounded-lg transition-colors border border-emerald-200"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload List (CSV/TXT)
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus-within:bg-white focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all min-h-[46px] flex flex-wrap items-center gap-1.5">
              {/* Parsed Badges Display */}
              {parsedRecipients.length > 0 && (
                <>
                  {/* First Email Badge */}
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {parsedRecipients[0]}
                    <button
                      type="button"
                      onClick={() => removeRecipient(parsedRecipients[0])}
                      className="text-emerald-600 hover:text-emerald-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>

                  {/* +Count Indicator Badge */}
                  {parsedRecipients.length > 1 && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-200 text-slate-700">
                      +{parsedRecipients.length - 1} more count indicator
                    </span>
                  )}
                </>
              )}

              <input
                type="text"
                value={recipientInput}
                onChange={(e) => setRecipientInput(e.target.value)}
                onKeyDown={handleAddTypedRecipient}
                placeholder={parsedRecipients.length === 0 ? "Enter email and press Enter, or upload CSV list..." : "Add another..."}
                className="flex-1 min-w-[200px] bg-transparent text-xs text-slate-900 focus:outline-none py-1 px-1"
              />
            </div>
          </div>

          {/* Subject Line */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Subject Line
            </label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Scaling Sales Outreach with AI"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {/* Throttling Settings: Delay & Hourly Limit */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Delay Between Emails (sec)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={delaySeconds}
                onChange={(e) => setDelaySeconds(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Hourly Limit (emails/hr)
              </label>
              <input
                type="number"
                min="1"
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Rich Text Editor Body & Toolbar */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Email Body Message
            </label>
            <div className="border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500">
              {/* Toolbar */}
              <div className="bg-slate-100/80 border-b border-slate-200 p-1.5 flex items-center gap-1 text-slate-600">
                <button
                  type="button"
                  onClick={() => insertFormatting("**", "**")}
                  className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors"
                  title="Bold"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting("*", "*")}
                  className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors"
                  title="Italic"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting("<u>", "</u>")}
                  className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors"
                  title="Underline"
                >
                  <Underline className="w-3.5 h-3.5" />
                </button>
                <div className="w-px h-4 bg-slate-300 mx-1" />
                <button
                  type="button"
                  onClick={() => insertFormatting("\n- ")}
                  className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors"
                  title="Bullet List"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting("\n1. ")}
                  className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors"
                  title="Numbered List"
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting("`", "`")}
                  className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors"
                  title="Code"
                >
                  <Code className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Textarea */}
              <textarea
                required
                rows={5}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your email body here..."
                className="w-full px-3.5 py-2.5 text-xs text-slate-900 bg-white focus:outline-none resize-none"
              />
            </div>
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 relative">
            {/* Send Later Preset Picker Modal Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setSendLaterOpen(!sendLaterOpen)}
                className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs rounded-xl shadow-xs transition-colors"
              >
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span>Schedule: <strong className="text-slate-900">{presetLabel}</strong></span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Send Later Presets Popup */}
              {sendLaterOpen && (
                <div className="absolute bottom-10 left-0 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-2 space-y-1 animate-in fade-in slide-in-from-bottom-2 duration-150">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Execution Presets
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePresetSelect("now")}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl transition-colors flex items-center justify-between"
                  >
                    <span>Immediate (Now)</span>
                    {presetLabel === "Immediate" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetSelect("tomorrow")}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl transition-colors flex items-center justify-between"
                  >
                    <span>Tomorrow 10:00 AM</span>
                    {presetLabel.includes("Tomorrow") && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetSelect("in2h")}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl transition-colors flex items-center justify-between"
                  >
                    <span>In 2 Hours</span>
                    {presetLabel.includes("In 2 Hours") && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetSelect("nextMonday")}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl transition-colors flex items-center justify-between"
                  >
                    <span>Next Monday 9:00 AM</span>
                    {presetLabel.includes("Next Mon") && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                  </button>

                  <div className="pt-1.5 border-t border-slate-100 px-3 pb-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Custom Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => {
                        setScheduledAt(e.target.value);
                        setPresetLabel(e.target.value ? new Date(e.target.value).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : "Custom");
                      }}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  "Scheduling..."
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Schedule Email
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
