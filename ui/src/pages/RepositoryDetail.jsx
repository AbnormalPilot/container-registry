import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, RefreshCw, Trash2 } from "lucide-react";
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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const repository = useMemo(() => decodeRepository(params["*"]), [params]);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleteRepositoryOpen, setDeleteRepositoryOpen] = useState(false);

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

  const deleteRepository = useMutation({
    mutationFn: async () => (await api.delete(`/repositories/${encodeRepoPath(repository)}`)).data,
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: ["repository-tags", repository] });
      queryClient.invalidateQueries({ queryKey: ["repositories"] });
      queryClient.invalidateQueries({ queryKey: ["system-info"] });
      queryClient.invalidateQueries({ queryKey: ["gc-status"] });
      setDeleteRepositoryOpen(false);
      navigate("/repositories");
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
        <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-2">
          <button type="button" className="btn-secondary w-full" onClick={() => tags.refetch()} disabled={tags.isFetching || deleteRepository.isPending}>
            <RefreshCw size={16} aria-hidden="true" />
            {tags.isFetching ? "Refreshing..." : "Refresh"}
          </button>
          <button type="button" className="btn-danger w-full" onClick={() => setDeleteRepositoryOpen(true)} disabled={deleteRepository.isPending || deleteTag.isPending}>
            <Trash2 size={16} aria-hidden="true" />
            {deleteRepository.isPending ? "Deleting..." : "Delete Repo"}
          </button>
        </div>
      </div>

      {tags.isError ? <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-[14px] text-rose-700">{formatApiError(tags.error)}</div> : null}
      {deleteTag.isError ? <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-[14px] text-rose-700">{formatApiError(deleteTag.error)}</div> : null}
      {deleteRepository.isError ? <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-[14px] text-rose-700">{formatApiError(deleteRepository.error)}</div> : null}

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

      <ConfirmDialog
        open={deleteRepositoryOpen}
        title="Delete repository"
        description={`Delete ${repository} and all of its tags? Garbage collection will run immediately after the manifests are deleted.`}
        confirmLabel="Delete repository"
        loading={deleteRepository.isPending}
        onCancel={() => setDeleteRepositoryOpen(false)}
        onConfirm={() => deleteRepository.mutate()}
      />
    </div>
  );
}
