import { BookOpen, Boxes, Gauge, LogOut, Settings, ShieldCheck, Trash2 } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";

const links = [
  { to: "/", label: "Dashboard", icon: Gauge, end: true },
  { to: "/repositories", label: "Repositories", icon: Boxes },
  { to: "/cleanup", label: "Cleanup Policy", icon: Trash2 },
  { to: "/docs", label: "Docs", icon: BookOpen },
  { to: "/settings", label: "Settings", icon: Settings }
];

export default function Sidebar() {
  const auth = useAuth();
  const navigate = useNavigate();

  function logout() {
    auth.logout();
    navigate("/login", { replace: true });
  }

  return (
    <aside className="hidden w-64 shrink-0 bg-black px-3 py-4 text-white lg:flex lg:flex-col">
      <div className="mb-6 flex items-center gap-3 px-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black">
          <ShieldCheck size={21} aria-hidden="true" />
        </span>
        <div>
          <p className="text-[14px] font-semibold leading-[1.29] tracking-[-0.224px] text-white">Registry UI</p>
          <p className="text-[12px] leading-none tracking-[-0.12px] text-white/60">Self-hosted console</p>
        </div>
      </div>

      <nav className="space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                [
                  "flex min-h-12 items-center gap-3 rounded-full px-3 text-[14px] font-normal tracking-[-0.224px] transition active:scale-95",
                  isActive ? "bg-white text-black" : "text-white/68 hover:bg-white/10 hover:text-white"
                ].join(" ")
              }
            >
              <Icon size={18} aria-hidden="true" />
              <span>{link.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <button type="button" onClick={logout} className="mt-auto inline-flex min-h-12 w-full items-center justify-start gap-3 rounded-full px-3 text-[14px] font-normal tracking-[-0.224px] text-white/76 transition hover:bg-white/10 hover:text-white active:scale-95">
        <LogOut size={17} aria-hidden="true" />
        Sign out
      </button>
    </aside>
  );
}
