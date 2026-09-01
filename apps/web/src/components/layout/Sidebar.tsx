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
  { href: "/fixtures", label: "Fixture", perms: [PERMISSIONS.FIXTURES_VIEW_ALL, PERMISSIONS.FIXTURES_VIEW_ASSIGNED] },
  { href: "/finance", label: "Financiero", perms: [PERMISSIONS.FINANCE_VIEW, PERMISSIONS.FINANCE_MANAGE] },
  { href: "/audit", label: "Auditoría", perms: [PERMISSIONS.AUDIT_VIEW] },
  { href: "/import-export", label: "Importar / Exportar", perms: [PERMISSIONS.DATA_IMPORT, PERMISSIONS.DATA_EXPORT] },
];

const adminNav: NavItem[] = [
  { href: "/admin/seasons", label: "Temporadas", perms: [PERMISSIONS.SEASONS_MANAGE] },
  { href: "/admin/categories", label: "Categorías", perms: [PERMISSIONS.CATEGORIES_MANAGE] },
  { href: "/admin/teams", label: "Equipos", perms: [PERMISSIONS.TEAMS_MANAGE] },
  { href: "/admin/users", label: "Usuarios", perms: [PERMISSIONS.USERS_MANAGE] },
  { href: "/admin/roles", label: "Roles y permisos", perms: [PERMISSIONS.ROLES_MANAGE] },
];

function NavLink({ item, horizontal }: { item: NavItem; horizontal?: boolean }) {
  const pathname = usePathname();
  const active = pathname === item.href || pathname.startsWith(item.href + "/");
  return (
    <Link
      href={item.href}
      className={cn(
        "rounded-lg text-sm font-medium transition-colors",
        horizontal ? "shrink-0 whitespace-nowrap px-3 py-2 text-[13px]" : "block px-3 py-2",
        active ? "bg-white text-rojo-oscuro shadow-club" : "text-white/70 hover:bg-white/10 hover:text-white",
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
    <>
      {/* Mobile: horizontal scrollable strip on top */}
      <aside className="flex shrink-0 items-center gap-2 overflow-x-auto bg-gradient-to-r from-rojo-oscuro to-rojo-noche px-3 py-2 md:hidden">
        <div className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-[10px] font-bold text-rojo-oscuro">
          CDL
        </div>
        {[...visibleMain, ...visibleAdmin].map((item) => (
          <NavLink key={item.href} item={item} horizontal />
        ))}
      </aside>

      {/* Desktop: full-height vertical rail */}
      <aside className="hidden h-screen w-60 shrink-0 flex-col gap-1 bg-gradient-to-b from-rojo-oscuro to-rojo-noche px-3 py-4 md:flex">
        <div className="mb-6 flex items-center gap-2 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-sm font-bold text-rojo-oscuro shadow-club">
            CDL
          </div>
          <div>
            <p className="font-display text-base leading-none tracking-wide text-white">Deportes Limache</p>
            <p className="text-[11px] text-white/60">Fútbol Joven</p>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto">
          {visibleMain.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}

          {visibleAdmin.length > 0 && (
            <>
              <p className="mb-1 mt-5 px-3 text-[11px] font-semibold uppercase tracking-wide text-white/40">Administración</p>
              {visibleAdmin.map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
            </>
          )}
        </nav>

        <p className="px-2 text-[11px] text-white/40">DEMO — datos ficticios</p>
      </aside>
    </>
  );
}
