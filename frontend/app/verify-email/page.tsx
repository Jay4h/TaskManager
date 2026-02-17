import { Suspense } from "react";
import VerifyEmailClient from "./VerifyEmailClient";

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--bg-canvas)] flex items-center justify-center px-4 py-12">
          <div className="max-w-md w-full">
            <div className="ck-card p-8 text-center">
              <div className="mb-4">
                <div className="mx-auto h-10 w-10 rounded-full border-4 border-[var(--border-subtle)] border-t-blue-600 animate-spin" />
              </div>
              <h1 className="text-xl font-semibold text-[var(--text-primary)]">Email Verification</h1>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">Verifying your email...</p>
            </div>
          </div>
        </div>
      }
    >
      <VerifyEmailClient />
    </Suspense>
  );
}
