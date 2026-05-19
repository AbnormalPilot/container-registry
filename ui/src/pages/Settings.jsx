import { useQuery } from "@tanstack/react-query";
import api, { formatApiError } from "../api/client";
import { formatBytes, formatDate } from "../api/format";

export default function Settings() {
  const system = useQuery({
    queryKey: ["system-info"],
    queryFn: async () => (await api.get("/system/info")).data
  });

  const data = system.data;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="page-title">Settings</h2>
        <p className="page-subtitle">Runtime registry and storage information.</p>
      </div>

      {system.isError ? <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-[14px] text-rose-700">{formatApiError(system.error)}</div> : null}

      <section className="table-shell">
        <dl className="divide-y divide-line">
          <div className="grid gap-2 px-4 py-4 sm:grid-cols-3 sm:px-5">
            <dt className="text-[14px] font-semibold tracking-[-0.224px] text-muted">Registry Hostname</dt>
            <dd className="break-all text-[17px] text-ink sm:col-span-2">{data?.hostname || "Unknown"}</dd>
          </div>
          <div className="grid gap-2 px-4 py-4 sm:grid-cols-3 sm:px-5">
            <dt className="text-[14px] font-semibold tracking-[-0.224px] text-muted">Registry API</dt>
            <dd className="break-all text-[17px] text-ink sm:col-span-2">{data?.registryUrl || "Unknown"}</dd>
          </div>
          <div className="grid gap-2 px-4 py-4 sm:grid-cols-3 sm:px-5">
            <dt className="text-[14px] font-semibold tracking-[-0.224px] text-muted">Version</dt>
            <dd className="text-[17px] text-ink sm:col-span-2">{data?.registryVersion || "registry/2.0"}</dd>
          </div>
          <div className="grid gap-2 px-4 py-4 sm:grid-cols-3 sm:px-5">
            <dt className="text-[14px] font-semibold tracking-[-0.224px] text-muted">Auth</dt>
            <dd className="text-[17px] text-ink sm:col-span-2">{data?.authMode || "htpasswd"}</dd>
          </div>
          <div className="grid gap-2 px-4 py-4 sm:grid-cols-3 sm:px-5">
            <dt className="text-[14px] font-semibold tracking-[-0.224px] text-muted">Storage Driver</dt>
            <dd className="text-[17px] text-ink sm:col-span-2">{data?.storageDriver || "filesystem"}</dd>
          </div>
          <div className="grid gap-2 px-4 py-4 sm:grid-cols-3 sm:px-5">
            <dt className="text-[14px] font-semibold tracking-[-0.224px] text-muted">Storage Root</dt>
            <dd className="break-all text-[17px] text-ink sm:col-span-2">{data?.storageRoot || "/var/lib/registry"}</dd>
          </div>
          <div className="grid gap-2 px-4 py-4 sm:grid-cols-3 sm:px-5">
            <dt className="text-[14px] font-semibold tracking-[-0.224px] text-muted">Disk Used</dt>
            <dd className="text-[17px] text-ink sm:col-span-2">{formatBytes(data?.diskUsedBytes)}</dd>
          </div>
          <div className="grid gap-2 px-4 py-4 sm:grid-cols-3 sm:px-5">
            <dt className="text-[14px] font-semibold tracking-[-0.224px] text-muted">Inventory</dt>
            <dd className="text-[17px] text-ink sm:col-span-2">
              {data?.totalRepositories ?? 0} repositories · {data?.totalTags ?? 0} tags
            </dd>
          </div>
          <div className="grid gap-2 px-4 py-4 sm:grid-cols-3 sm:px-5">
            <dt className="text-[14px] font-semibold tracking-[-0.224px] text-muted">Last GC</dt>
            <dd className="text-[17px] text-ink sm:col-span-2">{formatDate(data?.lastGcRunAt)}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
