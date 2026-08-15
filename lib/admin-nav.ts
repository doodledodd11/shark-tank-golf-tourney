export interface AdminNavLink {
  href: string;
  label: string;
}

export const ADMIN_NAV_LINKS: AdminNavLink[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/tournament", label: "Tournament" },
  { href: "/admin/players", label: "Players" },
  { href: "/admin/rounds", label: "Rounds & Matches" },
  { href: "/admin/courses", label: "Courses" },
];
