import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { LockKeyhole } from "lucide-react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import api, { formatApiError } from "../api/client";
import { useAuth } from "../components/AuthContext.jsx";

export default function Login() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const from = location.state?.from?.pathname || "/";

  const loginMutation = useMutation({
    mutationFn: async () => (await api.post("/auth/login", { username, password })).data,
    onSuccess(data) {
      auth.login(data.token);
      navigate(from, { replace: true });
    }
  });

  if (auth.isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  function submit(event) {
    event.preventDefault();
    loginMutation.mutate();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-wash p-4">
      <section className="w-full max-w-md rounded-[18px] border border-line bg-white p-6 sm:p-8">
        <div className="mb-8 flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-white sm:h-12 sm:w-12">
            <LockKeyhole size={21} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h1 className="text-[30px] font-semibold leading-[1.1] tracking-[-0.374px] text-ink sm:text-[34px]">Registry Dashboard</h1>
            <p className="mt-1 text-[17px] leading-[1.47] tracking-[-0.374px] text-muted">Sign in with your registry credentials.</p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={submit}>
          <label className="block">
            <span className="mb-2 block text-[14px] font-semibold leading-[1.29] tracking-[-0.224px] text-ink">Username</span>
            <input className="field" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" autoFocus />
          </label>
          <label className="block">
            <span className="mb-2 block text-[14px] font-semibold leading-[1.29] tracking-[-0.224px] text-ink">Password</span>
            <input className="field" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
          </label>

          {loginMutation.isError ? (
            <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-[14px] tracking-[-0.224px] text-rose-700">{formatApiError(loginMutation.error)}</div>
          ) : null}

          <button type="submit" className="btn-primary w-full" disabled={loginMutation.isPending || !username || !password}>
            {loginMutation.isPending ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
