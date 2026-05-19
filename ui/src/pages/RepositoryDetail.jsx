import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, RefreshCw } from "lucide-react";
import api, { encodeRepoPath, formatApiError } from "../api/client";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import TagTable from "../components/TagTable.jsx";

function decodeRepository(path) {
  if (!path) return "";
  return path
    .split("/")
    .map((part) => {
      try {
        return decodeURIComponent(part);
      } catch {
        return part;
      }
    })
    .join("/");
}

export default function RepositoryDetail() {
  const params = useParams();
  const queryClient = useQueryClient();
  const repository = useMemo(() => decodeRepository(params["*"]), [params]);
  const [pendingDelete, setPendingDelete] = useState(null);

  const tags = useQuery({
    queryKey: ["repository-tags", repository],
    enabled: Boolean(repository),
    queryFn: async () => (await api.get(`/repositories/${encodeRepoPath(repository)}/tags`)).data.tags
  });

  const deleteTag = useMutation({
    mutationFn: async (tag) => (await api.delete(`/repositories/${encodeRepoPath(repository)}/tags/${encodeURIComponent(tag)}`)).data,
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: ["repository-tags", repository] });
      queryClient.invalidateQueries({ queryKey: ["repositories"] });
      queryClient.invalidateQueries({ queryKey: ["system-info"] });
      queryClient.invalidateQueries({ queryKey: ["gc-status"] });
      setPendingDelete(null);
    }
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link to="/repositories" className="mb-3 inline-flex items-center gap-2 text-[14px] font-normal tracking-[-0.224px] text-primary hover:underline">
            <ArrowLeft size={16} aria-hidden="true" />
            Repositories
          </Link>
          <h2 className="page-title break-all">{repository}</h2>
          <p className="page-subtitle">Tags, manifests, image sizes, and deletion controls.</p>
        </div>
        <button type="button" className="btn-secondary w-full sm:w-auto" onClick={() => tags.refetch()} disabled={tags.isFetching}>
          <RefreshCw size={16} aria-hidden="true" />
          {tags.isFetching ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {tags.isError ? <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-[14px] text-rose-700">{formatApiError(tags.error)}</div> : null}
      {deleteTag.isError ? <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-[14px] text-rose-700">{formatApiError(deleteTag.error)}</div> : null}

      {tags.isLoading ? (
        <div className="panel p-12 text-center text-[17px] text-muted">Loading tags...</div>
      ) : (
        <TagTable tags={tags.data || []} onDelete={setPendingDelete} deletingTag={deleteTag.variables} />
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete tag"
        description={`Delete ${repository}:${pendingDelete?.tag || ""}? The manifest digest will be removed and garbage collection will run immediately.`}
        confirmLabel="Delete tag"
        loading={deleteTag.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => deleteTag.mutate(pendingDelete.tag)}
      />
    </div>
  );
}
