"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Sidebar } from "@/components/layout/Sidebar";
import { permissionsForRoute } from "@/lib/route-permissions";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, hasPermission } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-crema text-gris">
        Cargando...
      </div>
    );
  }

  // Enforced regardless of how the URL was reached — hiding a Sidebar link
  // only stops navigation, not someone typing the address directly. The API
  // rejects the underlying requests either way; this just keeps a user
  // without access from ever seeing the screen render in the first place.
  const requiredPerms = permissionsForRoute(pathname);
  const allowed = !requiredPerms || hasPermission(...requiredPerms);

  return (
    <div className="flex h-screen flex-col bg-crema md:flex-row">
      <Sidebar />
      <main className="scrollbar-thin flex-1 overflow-y-auto">
        {allowed ? (
          children
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
            <span className="text-3xl">⛔</span>
            <p className="font-display text-lg tracking-wide text-carbon">No tenés acceso a esta pantalla</p>
            <p className="text-sm text-gris">Tu rol no incluye el permiso necesario. Si creés que es un error, hablá con un administrador.</p>
          </div>
        )}
      </main>
    </div>
  );
}
