"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Sidebar } from "@/components/layout/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-pitch-950 text-slate-400">
        Cargando...
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-pitch-950">
      <Sidebar />
      <main className="scrollbar-thin flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
