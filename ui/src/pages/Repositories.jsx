import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import api, { encodeRepoPath, formatApiError } from "../api/client";
import { formatBytes } from "../api/format";

function RepositoryCard({ repo }) {
  return (
    <Link
      className="block rounded-[18px] border border-line bg-white p-5 text-ink transition active:scale-[0.99]"
      to={`/repositories/${encodeRepoPath(repo.name)}`}
    >
      <p className="break-words text-[17px] font-semibold leading-[1.24] tracking-[-0.374px] text-primary">{repo.name}</p>
      <dl className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <dt className="fine-label">Tags</dt>
          <dd className="mt-2 text-[17px] font-semibold text-ink">{repo.tagCount}</dd>
        </div>
        <div>
          <dt className="fine-label">Total Size</dt>
          <dd className="mt-2 text-[17px] font-semibold text-ink">{formatBytes(repo.totalSize)}</dd>
        </div>
      </dl>
    </Link>
  );
}

export default function Repositories() {
  const [search, setSearch] = useState("");
  const repositories = useQuery({
    queryKey: ["repositories"],
    queryFn: async () => (await api.get("/repositories")).data.repositories
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return repositories.data || [];
    return (repositories.data || []).filter((repo) => repo.name.toLowerCase().includes(term));
  }, [repositories.data, search]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="page-title">Repositories</h2>
          <p className="page-subtitle">Browse pushed images and drill into tags.</p>
        </div>
        <label className="relative block w-full lg:max-w-md">
          <Search className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-muted" size={17} aria-hidden="true" />
          <input className="field pl-12" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search repositories" />
        </label>
      </div>

      {repositories.isError ? <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-[14px] text-rose-700">{formatApiError(repositories.error)}</div> : null}

      <div className="space-y-3 lg:hidden">
        {repositories.isLoading ? (
          <div className="panel p-8 text-center text-[17px] text-muted">Loading repositories...</div>
        ) : null}
        {!repositories.isLoading && filtered.map((repo) => <RepositoryCard key={repo.name} repo={repo} />)}
        {!repositories.isLoading && filtered.length === 0 ? (
          <div className="panel p-8 text-center text-[17px] text-muted">No repositories found.</div>
        ) : null}
      </div>

      <div className="table-shell hidden lg:block">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-line">
            <thead className="table-head">
              <tr>
                <th className="px-5 py-4 text-left">Repository</th>
                <th className="px-5 py-4 text-right">Tags</th>
                <th className="px-5 py-4 text-right">Total Size</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-white">
              {repositories.isLoading ? (
                <tr>
                  <td colSpan="3" className="px-5 py-12 text-center text-[17px] text-muted">
                    Loading repositories...
                  </td>
                </tr>
              ) : null}
              {!repositories.isLoading && filtered.map((repo) => (
                <tr key={repo.name} className="hover:bg-wash/70">
                  <td className="px-5 py-4 text-[17px] font-semibold tracking-[-0.374px] text-ink">
                    <Link className="text-primary hover:underline" to={`/repositories/${encodeRepoPath(repo.name)}`}>
                      {repo.name}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-right text-[14px] tracking-[-0.224px] text-ink">{repo.tagCount}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-right text-[14px] tracking-[-0.224px] text-ink">{formatBytes(repo.totalSize)}</td>
                </tr>
              ))}
              {!repositories.isLoading && filtered.length === 0 ? (
                <tr>
                  <td colSpan="3" className="px-5 py-12 text-center text-[17px] text-muted">
                    No repositories found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
