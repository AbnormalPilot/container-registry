import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Check,
  Copy,
  Globe2,
  LockKeyhole,
  PackageCheck,
  TerminalSquare
} from "lucide-react";
import api from "../api/client";

function CopyButton({ value, className = "" }) {
  const [copied, setCopied] = useState(false);

  function fallbackCopy() {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const succeeded = document.execCommand("copy");
    document.body.removeChild(textarea);
    return succeeded;
  }

  async function copyCode() {
    try {
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(value);
        } catch {
          if (!fallbackCopy()) {
            throw new Error("Clipboard write failed");
          }
        }
      } else if (!fallbackCopy()) {
        throw new Error("Clipboard write failed");
      }

      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button type="button" className={`btn-secondary px-4 text-[12px] ${className}`} onClick={copyCode}>
      {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function CommandTerminal({ code, shell = true }) {
  const lines = code.split("\n");

  return (
    <div className="overflow-hidden rounded-[18px] border border-black/10 bg-tile-3 text-white">
      <div className="flex h-10 items-center gap-2 border-b border-white/10 px-4">
        <span className="h-2.5 w-2.5 rounded-full bg-white/35" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/25" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="ml-2 text-[12px] leading-none tracking-[-0.12px] text-white/56">terminal</span>
      </div>
      <pre className="overflow-hidden whitespace-pre-wrap p-4 text-[13px] leading-[1.65] tracking-normal sm:p-5">
        {shell ? (
          <code className="block min-w-0">
            {lines.map((line, index) => (
              <span key={`${line}-${index}`} className="grid grid-cols-[16px_minmax(0,1fr)] gap-3">
                <span className="select-none text-primary-dark">$</span>
                <span className="min-w-0 break-words text-white">{line}</span>
              </span>
            ))}
          </code>
        ) : (
          <code className="block whitespace-pre-wrap break-words text-white">{code}</code>
        )}
      </pre>
    </div>
  );
}

function DirectCard({ icon: Icon, title, description, code }) {
  return (
    <section className="panel overflow-hidden">
      <div className="flex items-start justify-between gap-4 p-5">
        <div className="flex min-w-0 gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-white">
            <Icon size={19} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 className="mt-1 text-[21px] font-semibold leading-[1.19] tracking-[0.231px] text-ink">{title}</h3>
            <p className="mt-2 text-[14px] leading-[1.43] tracking-[-0.224px] text-muted">{description}</p>
          </div>
        </div>
        <CopyButton value={code} className="shrink-0" />
      </div>
      <div className="px-3 pb-3 sm:px-5 sm:pb-5">
        <CommandTerminal code={code} />
      </div>
    </section>
  );
}

export default function Docs() {
  const { data } = useQuery({
    queryKey: ["system-info"],
    queryFn: async () => (await api.get("/system/info")).data
  });

  const host = data?.hostname || "registry.example.com";
  const dockerHost = host === "localhost" ? "localhost:80" : host;
  const sourceImage = "alpine:latest";
  const targetImage = `${dockerHost}/my-app:latest`;
  const namespacedImage = `${dockerHost}/my-team/my-app:latest`;

  const commands = useMemo(
    () => ({
      login: `docker login ${dockerHost}`,
      tagPush: `docker pull ${sourceImage}
docker tag ${sourceImage} ${targetImage}
docker push ${targetImage}`,
      pull: `docker pull ${targetImage}`,
      buildPush: `docker build -t ${targetImage} .
docker push ${targetImage}`,
      all: `docker login ${dockerHost}
docker pull ${sourceImage}
docker tag ${sourceImage} ${targetImage}
docker push ${targetImage}
docker pull ${targetImage}`,
      dokployFields: `Registry URL: ${dockerHost}
Image Prefix: leave empty
Optional namespace prefix: my-team`
    }),
    [dockerHost, sourceImage, targetImage]
  );

  return (
    <div className="max-w-6xl space-y-8">
      <section className="grid gap-8 border-b border-line bg-white pb-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)] lg:items-end">
        <div>
          <h2 className="page-title">Push And Pull Images</h2>
          <p className="page-subtitle">
            Use the registry hostname directly in the image name. No `/v2/`, no `https://`, no extra routing steps.
          </p>
          <div className="mt-5 inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border border-line bg-pearl px-4 text-[14px] leading-[1.43] tracking-[-0.224px] text-muted">
            <Globe2 size={15} aria-hidden="true" />
            <span className="break-all">{dockerHost}</span>
          </div>
        </div>

        <div className="panel overflow-hidden">
          <div className="flex items-center justify-between gap-4 border-b border-line bg-wash px-5 py-4">
            <div>
              <p className="fine-label">Copy this</p>
              <h3 className="mt-1 text-[21px] font-semibold leading-[1.19] tracking-[0.231px] text-ink">Full simple flow</h3>
            </div>
            <CopyButton value={commands.all} className="shrink-0" />
          </div>
          <div className="p-3 sm:p-5">
            <CommandTerminal code={commands.all} />
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <DirectCard
          icon={LockKeyhole}
          title="1. Login"
          description="Use the registry username and password."
          code={commands.login}
        />
        <DirectCard
          icon={PackageCheck}
          title="2. Tag And Push"
          description="Tag any local image with the registry host, then push it."
          code={commands.tagPush}
        />
        <DirectCard
          icon={TerminalSquare}
          title="3. Pull"
          description="Pull it back from any machine that can reach the registry."
          code={commands.pull}
        />
      </div>

      <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[18px] border border-line bg-white p-6">
          <h3 className="text-[21px] font-semibold leading-[1.19] tracking-[0.231px] text-ink">Image name rule</h3>
          <p className="mt-2 text-[17px] leading-[1.47] tracking-[-0.374px] text-muted">
            Put the registry hostname at the start of the image name.
          </p>
          <dl className="mt-5 grid gap-4">
            <div>
              <dt className="fine-label">Simple image</dt>
              <dd className="mt-2 break-all font-mono text-[13px] tracking-normal text-ink">{targetImage}</dd>
            </div>
            <div>
              <dt className="fine-label">With namespace</dt>
              <dd className="mt-2 break-all font-mono text-[13px] tracking-normal text-ink">{namespacedImage}</dd>
            </div>
          </dl>
        </section>

        <section className="panel overflow-hidden">
          <div className="flex items-center justify-between gap-4 border-b border-line bg-wash px-5 py-4">
            <div>
              <p className="fine-label">Dokploy fields</p>
              <h3 className="mt-1 text-[21px] font-semibold leading-[1.19] tracking-[0.231px] text-ink">Keep prefix simple</h3>
            </div>
            <CopyButton value={commands.dokployFields} className="shrink-0" />
          </div>
          <div className="p-3 sm:p-5">
            <CommandTerminal code={commands.dokployFields} shell={false} />
          </div>
        </section>
      </section>
    </div>
  );
}
