import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Boxes, Database, Play, RefreshCcw, Tags } from "lucide-react";
import api, { formatApiError } from "../api/client";
import { formatBytes, formatDate } from "../api/format";
import StatCard from "../components/StatCard.jsx";

export default function Dashboard() {
  const queryClient = useQueryClient();
  const system = useQuery({
    queryKey: ["system-info"],
    queryFn: async () => (await api.get("/system/info")).data
  });
  const gcStatus = useQuery({
    queryKey: ["gc-status"],
    queryFn: async () => (await api.get("/gc/status")).data
  });

  const refreshAfterMutation = () => {
    queryClient.invalidateQueries({ queryKey: ["system-info"] });
    queryClient.invalidateQueries({ queryKey: ["repositories"] });
    queryClient.invalidateQueries({ queryKey: ["gc-status"] });
  };

  const runGc = useMutation({
    mutationFn: async () => (await api.post("/gc/run")).data,
    onSuccess: refreshAfterMutation
  });

  const runCleanup = useMutation({
    mutationFn: async () => (await api.post("/cleanup/run")).data,
    onSuccess: refreshAfterMutation
  });

  const data = system.data;
  const lastGc = gcStatus.data?.lastRunAt || data?.lastGcRunAt;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="page-title">Dashboard</h2>
          <p className="page-subtitle">Repository inventory, storage usage, and maintenance controls.</p>
        </div>
        <div className="grid w-full grid-cols-1 gap-2 sm:w-auto md:grid-cols-2">
          <button type="button" className="btn-secondary w-full" onClick={() => runGc.mutate()} disabled={runGc.isPending || runCleanup.isPending}>
            <Play size={16} aria-hidden="true" />
            {runGc.isPending ? "Running GC..." : "Run GC Now"}
          </button>
          <button type="button" className="btn-primary w-full" onClick={() => runCleanup.mutate()} disabled={runCleanup.isPending || runGc.isPending}>
            <RefreshCcw size={16} aria-hidden="true" />
            {runCleanup.isPending ? "Running Cleanup..." : "Run Cleanup Now"}
          </button>
        </div>
      </div>

      {system.isError ? <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-[14px] text-rose-700">{formatApiError(system.error)}</div> : null}
      {runGc.isError ? <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-[14px] text-rose-700">{formatApiError(runGc.error)}</div> : null}
      {runCleanup.isError ? <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-[14px] text-rose-700">{formatApiError(runCleanup.error)}</div> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Repositories" value={system.isLoading ? "..." : data?.totalRepositories ?? 0} detail="Catalog entries" icon={Boxes} />
        <StatCard label="Tags" value={system.isLoading ? "..." : data?.totalTags ?? 0} detail="Total pushed tags" icon={Tags} tone="accent" />
        <StatCard label="Disk Used" value={system.isLoading ? "..." : formatBytes(data?.diskUsedBytes)} detail={data?.storageRoot || "/var/lib/registry"} icon={Database} />
        <StatCard label="Last GC Run" value={formatDate(lastGc)} detail={gcStatus.data?.success === false ? "Last run failed" : "Garbage collection"} icon={RefreshCcw} tone={gcStatus.data?.success === false ? "rose" : "accent"} />
      </div>

      <section className="panel p-5 sm:p-6">
        <h3 className="text-[21px] font-semibold leading-[1.19] tracking-[0.231px] text-ink">Maintenance Status</h3>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div>
            <p className="fine-label">GC Result</p>
            <p className="mt-2 text-[17px] text-ink">{gcStatus.data?.success == null ? "No run recorded" : gcStatus.data.success ? "Success" : "Failed"}</p>
          </div>
          <div>
            <p className="fine-label">Exit Code</p>
            <p className="mt-2 text-[17px] text-ink">{gcStatus.data?.exitCode ?? "None"}</p>
          </div>
          <div>
            <p className="fine-label">Registry Host</p>
            <p className="mt-2 break-all text-[17px] text-ink">{data?.hostname || "Unknown"}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
