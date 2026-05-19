import { Trash2 } from "lucide-react";
import { formatBytes, formatDate, truncateDigest } from "../api/format";

function TagCard({ tag, onDelete, deletingTag }) {
  return (
    <section className="rounded-[18px] border border-line bg-white p-5">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="fine-label">Tag</p>
          <h3 className="mt-2 break-words text-[21px] font-semibold leading-[1.19] tracking-[0.231px] text-ink">{tag.tag}</h3>
        </div>
        <button type="button" className="btn-secondary shrink-0 px-3" onClick={() => onDelete(tag)} disabled={deletingTag === tag.tag} aria-label={`Delete ${tag.tag}`}>
          <Trash2 size={16} aria-hidden="true" />
        </button>
      </div>
      <dl className="mt-5 grid gap-4">
        <div>
          <dt className="fine-label">Digest</dt>
          <dd className="mt-2 break-all font-mono text-[12px] tracking-normal text-muted">{truncateDigest(tag.digest)}</dd>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <dt className="fine-label">Size</dt>
            <dd className="mt-2 text-[17px] text-ink">{formatBytes(tag.size)}</dd>
          </div>
          <div>
            <dt className="fine-label">Pushed</dt>
            <dd className="mt-2 text-[17px] text-ink">{formatDate(tag.pushedAt || tag.createdAt)}</dd>
          </div>
        </div>
      </dl>
    </section>
  );
}

export default function TagTable({ tags, onDelete, deletingTag }) {
  return (
    <>
      <div className="space-y-3 lg:hidden">
        {tags.map((tag) => (
          <TagCard key={tag.tag} tag={tag} onDelete={onDelete} deletingTag={deletingTag} />
        ))}
        {tags.length === 0 ? <div className="panel p-8 text-center text-[17px] text-muted">No tags found.</div> : null}
      </div>

    <div className="table-shell hidden lg:block">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-line">
          <thead className="table-head">
            <tr>
              <th className="px-5 py-4 text-left">Tag</th>
              <th className="px-5 py-4 text-left">Digest</th>
              <th className="px-5 py-4 text-right">Size</th>
              <th className="px-5 py-4 text-left">Pushed</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-white">
            {tags.map((tag) => (
              <tr key={tag.tag} className="hover:bg-wash/70">
                <td className="whitespace-nowrap px-5 py-4 text-[17px] font-semibold tracking-[-0.374px] text-ink">{tag.tag}</td>
                <td className="whitespace-nowrap px-5 py-4 font-mono text-[12px] tracking-normal text-muted">{truncateDigest(tag.digest)}</td>
                <td className="whitespace-nowrap px-5 py-4 text-right text-[14px] tracking-[-0.224px] text-ink">{formatBytes(tag.size)}</td>
                <td className="whitespace-nowrap px-5 py-4 text-[14px] tracking-[-0.224px] text-muted">{formatDate(tag.pushedAt || tag.createdAt)}</td>
                <td className="whitespace-nowrap px-5 py-4 text-right">
                  <button type="button" className="btn-secondary min-h-9 px-3" onClick={() => onDelete(tag)} disabled={deletingTag === tag.tag}>
                    <Trash2 size={16} aria-hidden="true" />
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {tags.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-5 py-12 text-center text-[17px] text-muted">
                  No tags found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
    </>
  );
}
