"use client";

import React, { useState } from "react";
import { X, Slack, CheckCircle2, AlertCircle, Send, Loader2 } from "lucide-react";

interface SlackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SlackModal({ isOpen, onClose }: SlackModalProps) {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [channel, setChannel] = useState("#email-alerts");
  const [loading, setLoading] = useState(false);
  const [testingAlert, setTestingAlert] = useState(false);
  const [success, setSuccess] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const res = await fetch("/api/slack/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl, channel }),
      });

      if (!res.ok) {
        throw new Error("Failed to save Slack webhook configuration.");
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 1500);
    } catch (err: any) {
      setError(err.message || "An error occurred connecting Slack.");
    } finally {
      setLoading(false);
    }
  };

  const handleTestAlert = async () => {
    if (!webhookUrl) {
      setError("Please enter a valid Slack Webhook URL first.");
      return;
    }

    setTestingAlert(true);
    setError("");
    setTestSuccess(false);

    try {
      // First connect/save
      await fetch("/api/slack/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl, channel }),
      });

      // Directly dispatch test POST payload to the user's webhook
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `🧪 *ReachInbox Slack Integration Test Alert*\nHourly rate limit test notification successfully delivered to channel \`${channel}\`. Rate limit alerts are active!`,
        }),
      });

      if (res.ok || res.type === "opaque") {
        setTestSuccess(true);
      } else {
        throw new Error(`Slack webhook returned HTTP status ${res.status}`);
      }
    } catch (err: any) {
      setError(`Test alert failed: ${err.message}. Please verify webhook URL permissions.`);
    } finally {
      setTestingAlert(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Slack className="w-5 h-5 text-emerald-600" />
            Connect Slack Alerts
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
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

        {success && (
          <div className="mx-6 mt-4 p-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>Slack Webhook Saved Successfully!</span>
          </div>
        )}

        {testSuccess && (
          <div className="mx-6 mt-4 p-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>Test Alert Dispatched to Slack Webhook Successfully!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-xs text-slate-500">
            Receive real-time Slack notifications whenever hourly sender email rate limits are triggered.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Incoming Webhook URL
            </label>
            <input
              type="url"
              required
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://hooks.slack.com/services/T00/B00/XXXX"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Target Channel Name
            </label>
            <input
              type="text"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              placeholder="#email-alerts"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleTestAlert}
              disabled={testingAlert || !webhookUrl}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-semibold text-xs rounded-xl transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              {testingAlert ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                  Testing...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 text-emerald-600" />
                  Test Alert
                </>
              )}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
              >
                {loading ? "Connecting..." : "Save Webhook"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
