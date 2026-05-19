import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Play, Save } from "lucide-react";
import api, { formatApiError } from "../api/client";
import { formatDate } from "../api/format";

export default function CleanupPolicy() {
  const queryClient = useQueryClient();
  const [keepCount, setKeepCount] = useState(10);
  const [keepDays, setKeepDays] = useState(30);

  const policy = useQuery({
    queryKey: ["cleanup-policy"],
    queryFn: async () => (await api.get("/cleanup/policy")).data
  });

  useEffect(() => {
    if (policy.data) {
      setKeepCount(policy.data.keepCount);
      setKeepDays(policy.data.keepDays);
    }
  }, [policy.data]);

  const savePolicy = useMutation({
    mutationFn: async () => (await api.post("/cleanup/policy", { keepCount: Number(keepCount), keepDays: Number(keepDays) })).data,
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: ["cleanup-policy"] });
    }
  });

  const runCleanup = useMutation({
    mutationFn: async () => (await api.post("/cleanup/run")).data,
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: ["cleanup-policy"] });
      queryClient.invalidateQueries({ queryKey: ["repositories"] });
      queryClient.invalidateQueries({ queryKey: ["system-info"] });
      queryClient.invalidateQueries({ queryKey: ["gc-status"] });
    }
  });

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h2 className="page-title">Cleanup Policy</h2>
        <p className="page-subtitle">Retention settings used by manual cleanup runs.</p>
      </div>

      {policy.isError ? <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-[14px] text-rose-700">{formatApiError(policy.error)}</div> : null}
      {savePolicy.isError ? <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-[14px] text-rose-700">{formatApiError(savePolicy.error)}</div> : null}
      {runCleanup.isError ? <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-[14px] text-rose-700">{formatApiError(runCleanup.error)}</div> : null}
      {savePolicy.isSuccess ? <div className="rounded-[18px] border border-line bg-white px-4 py-3 text-[14px] text-primary">Policy saved.</div> : null}

      <section className="panel p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-[14px] font-semibold leading-[1.29] tracking-[-0.224px] text-ink">Keep last N tags</span>
            <input className="field" type="number" min="1" step="1" value={keepCount} onChange={(event) => setKeepCount(event.target.value)} />
          </label>
          <label className="block">
            <span className="mb-2 block text-[14px] font-semibold leading-[1.29] tracking-[-0.224px] text-ink">Delete tags older than X days</span>
            <input className="field" type="number" min="1" step="1" value={keepDays} onChange={(event) => setKeepDays(event.target.value)} />
          </label>
        </div>

        <dl className="mt-6 grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
          <div>
            <dt className="fine-label">Last Updated</dt>
            <dd className="mt-2 text-[17px] text-ink">{formatDate(policy.data?.updatedAt)}</dd>
          </div>
          <div>
            <dt className="fine-label">Last Applied</dt>
            <dd className="mt-2 text-[17px] text-ink">{formatDate(policy.data?.lastAppliedAt)}</dd>
          </div>
        </dl>

        <div className="mt-5 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
          <button type="button" className="btn-primary w-full sm:w-auto" onClick={() => savePolicy.mutate()} disabled={savePolicy.isPending}>
            <Save size={16} aria-hidden="true" />
            {savePolicy.isPending ? "Saving..." : "Save Policy"}
          </button>
          <button type="button" className="btn-secondary w-full sm:w-auto" onClick={() => runCleanup.mutate()} disabled={runCleanup.isPending}>
            <Play size={16} aria-hidden="true" />
            {runCleanup.isPending ? "Running..." : "Run Cleanup Now"}
          </button>
        </div>
      </section>
    </div>
  );
}
