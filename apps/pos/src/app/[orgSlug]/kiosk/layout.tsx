"use client";

import { useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";

const IDLE_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

export default function KioskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const params = useParams<{ orgSlug: string }>();
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    function resetTimer() {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        router.push(`/${params.orgSlug}/kiosk`);
      }, IDLE_TIMEOUT_MS);
    }

    const events = ["mousedown", "touchstart", "keydown", "scroll"] as const;
    events.forEach((e) => window.addEventListener(e, resetTimer));
    resetTimer();

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [router, params.orgSlug]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-6 py-8">{children}</div>
    </div>
  );
}
