import "./globals.css";
import React from "react";
import AuthProvider from "@/components/AuthProvider";

export const metadata = {
  title: "ReachInbox Email Scheduler",
  description: "TypeScript full-stack email scheduling monorepo application",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
