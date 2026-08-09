"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PERMISSIONS } from "@futboljoven/shared";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/cn";

interface NavItem {
  href: string;
  label: string;
  perms?: (typeof PERMISSIONS)[keyof typeof PERMISSIONS][];
}

const mainNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", perms: [PERMISSIONS.DASHBOARD_VIEW_GLOBAL, PERMISSIONS.DASHBOARD_VIEW_ASSIGNED] },
  { href: "/players", label: "Jugadores", perms: [PERMISSIONS.PLAYERS_VIEW_ALL, PERMISSIONS.PLAYERS_VIEW_ASSIGNED] },
  { href: "/evaluations", label: "Evaluaciones", perms: [PERMISSIONS.EVALUATIONS_VIEW_ALL, PERMISSIONS.EVALUATIONS_VIEW_ASSIGNED] },
  { href: "/audit", label: "Auditoría", perms: [PERMISSIONS.AUDIT_VIEW] },
];

const adminNav: NavItem[] = [
  { href: "/admin/seasons", label: "Temporadas", perms: [PERMISSIONS.SEASONS_MANAGE] },
  { href: "/admin/categories", label: "Categorías", perms: [PERMISSIONS.CATEGORIES_MANAGE] },
  { href: "/admin/teams", label: "Equipos", perms: [PERMISSIONS.TEAMS_MANAGE] },
  { href: "/admin/users", label: "Usuarios", perms: [PERMISSIONS.USERS_MANAGE] },
  { href: "/admin/roles", label: "Roles y permisos", perms: [PERMISSIONS.ROLES_MANAGE] },
];

function NavLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const active = pathname === item.href || pathname.startsWith(item.href + "/");
  return (
    <Link
      href={item.href}
      className={cn(
        "block rounded-md px-3 py-2 text-sm transition-colors",
        active ? "bg-accent-500/15 text-accent-500 font-medium" : "text-slate-400 hover:bg-pitch-800 hover:text-slate-100",
      )}
    >
      {item.label}
    </Link>
  );
}

export function Sidebar() {
  const { hasPermission } = useAuth();
  const visibleMain = mainNav.filter((item) => !item.perms || hasPermission(...item.perms));
  const visibleAdmin = adminNav.filter((item) => !item.perms || hasPermission(...item.perms));

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-pitch-700 bg-pitch-900/60 px-3 py-4">
      <div className="mb-6 flex items-center gap-2 px-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent-500 text-sm font-bold text-pitch-950">FJ</div>
        <div>
          <p className="text-sm font-semibold leading-tight text-slate-50">FutbolJoven</p>
          <p className="text-[11px] text-slate-500">Player Development</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5">
        {visibleMain.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}

        {visibleAdmin.length > 0 && (
          <>
            <p className="mb-1 mt-5 px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-600">Administración</p>
            {visibleAdmin.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </>
        )}
      </nav>

      <p className="px-2 text-[11px] text-slate-600">DEMO — datos ficticios</p>
    </aside>
  );
}
