export interface NavLink {
  href: string;
  label: string;
}

export const NAV_LINKS: NavLink[] = [
  { href: "/", label: "Home" },
  { href: "/join", label: "Join" },
  { href: "/players", label: "Players" },
  { href: "/matches", label: "Matches" },
  { href: "/courses", label: "Course Selection" },
  { href: "/rules", label: "Rules" },
];
