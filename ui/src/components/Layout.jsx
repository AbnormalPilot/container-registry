import { Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Boxes, Gauge, LogOut, Settings, Trash2 } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "./AuthContext.jsx";
import Sidebar from "./Sidebar.jsx";

const mobileLinks = [
  { to: "/", label: "Dashboard", icon: Gauge, end: true },
  { to: "/repositories", label: "Repos", icon: Boxes },
  { to: "/cleanup", label: "Cleanup", icon: Trash2 },
  { to: "/docs", label: "Docs", icon: BookOpen },
  { to: "/settings", label: "Settings", icon: Settings }
];

export default function Layout() {
  const auth = useAuth();
  const navigate = useNavigate();
  const { data } = useQuery({
    queryKey: ["system-info"],
    queryFn: async () => (await api.get("/system/info")).data
  });

  function logout() {
    auth.logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex min-h-screen bg-wash text-ink">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 border-b border-black/10 bg-wash/80 px-4 py-3 backdrop-blur-xl sm:px-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="fine-label">Registry</p>
              <h1 className="break-all text-[19px] font-semibold leading-[1.19] tracking-[0.231px] text-ink sm:text-[21px]">{data?.hostname || "Loading registry"}</h1>
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-3 text-[14px] leading-[1.43] tracking-[-0.224px] text-muted">
              <span className="min-w-0 break-words">{data?.registryVersion || "registry/2.0"} · {data?.storageDriver || "filesystem"}</span>
              <button type="button" className="btn-secondary shrink-0 px-3 lg:hidden" onClick={logout}>
                <LogOut size={16} aria-hidden="true" />
                Sign out
              </button>
            </div>
          </div>
        </header>
        <main className="p-4 pb-24 sm:p-6 lg:pb-6">
          <Outlet />
        </main>
      </div>
      <nav className="fixed bottom-0 left-0 right-0 z-20 grid grid-cols-5 border-t border-black/10 bg-wash/90 backdrop-blur-xl lg:hidden">
        {mobileLinks.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                [
                  "flex min-h-16 flex-col items-center justify-center gap-1 text-[10px] font-normal tracking-[-0.08px]",
                  isActive ? "text-primary" : "text-muted"
                ].join(" ")
              }
            >
              <Icon size={18} aria-hidden="true" />
              {link.label}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
