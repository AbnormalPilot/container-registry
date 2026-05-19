import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Check,
  Copy,
  FileCode2,
  Globe2,
  LockKeyhole,
  PackageCheck,
  Server,
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

function CommandCard({ step, icon: Icon, title, description, code, shell = true }) {
  return (
    <section className="panel overflow-hidden">
      <div className="flex items-start justify-between gap-4 p-5">
        <div className="flex min-w-0 gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-white">
            <Icon size={19} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="fine-label">Step {step}</p>
            <h3 className="mt-1 text-[21px] font-semibold leading-[1.19] tracking-[0.231px] text-ink">{title}</h3>
            <p className="mt-2 text-[14px] leading-[1.43] tracking-[-0.224px] text-muted">{description}</p>
          </div>
        </div>
        <CopyButton value={code} className="shrink-0" />
      </div>
      <div className="px-3 pb-3 sm:px-5 sm:pb-5">
        <CommandTerminal code={code} shell={shell} />
      </div>
    </section>
  );
}

function MiniFact({ icon: Icon, label, value }) {
  return (
    <div className="rounded-[18px] border border-line bg-white p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-wash text-primary">
        <Icon size={18} aria-hidden="true" />
      </div>
      <dt className="mt-4 fine-label">{label}</dt>
      <dd className="mt-2 break-words text-[17px] font-semibold leading-[1.24] tracking-[-0.374px] text-ink">{value}</dd>
    </div>
  );
}

export default function Docs() {
  const { data } = useQuery({
    queryKey: ["system-info"],
    queryFn: async () => (await api.get("/system/info")).data
  });

  const host = data?.hostname || "registry.example.com";
  const image = `${host}/library/alpine:latest`;
  const appImage = `${host}/my-team/my-service:1.0.0`;

  const commands = useMemo(
    () => ({
      login: `docker login ${host}`,
      push: `docker pull alpine:latest
docker tag alpine:latest ${image}
docker push ${image}`,
      pull: `docker pull ${image}`,
      compose: `services:
  app:
    image: ${appImage}
    restart: unless-stopped
    ports:
      - "3000:3000"`,
      build: `docker build -t ${appImage} .
docker push ${appImage}`,
      insecure: `{
  "insecure-registries": ["${host}"]
}`
    }),
    [appImage, host, image]
  );

  const commandCards = [
    {
      step: "01",
      icon: LockKeyhole,
      title: "Sign In From Docker",
      description: "Use the same registry username and password you use for this dashboard.",
      code: commands.login
    },
    {
      step: "02",
      icon: PackageCheck,
      title: "Push A Test Image",
      description: "Tag an existing image with this registry host, then push it through /v2/.",
      code: commands.push
    },
    {
      step: "03",
      icon: TerminalSquare,
      title: "Pull It Back",
      description: "Verify the registry can serve the image to any Docker client with access to the domain.",
      code: commands.pull
    },
    {
      step: "04",
      icon: FileCode2,
      title: "Build And Publish Your App",
      description: "Use the registry namespace as part of the tag in local builds or CI jobs.",
      code: commands.build
    }
  ];

  return (
    <div className="max-w-6xl space-y-8">
      <section className="overflow-hidden rounded-none bg-white">
        <div className="grid gap-8 border-b border-line pb-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(420px,1.08fr)] lg:items-end">
          <div>
            <h2 className="page-title">Add This Docker Registry</h2>
            <p className="page-subtitle">
              Copy the command, sign in with your registry credentials, then tag images with this host before pushing.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3 text-[14px] leading-[1.43] tracking-[-0.224px] text-muted">
              <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-line bg-pearl px-4">
                <Globe2 size={15} aria-hidden="true" />
                <span className="break-all">{host}</span>
              </span>
              <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-line bg-pearl px-4">
                <Server size={15} aria-hidden="true" />
                Docker Registry HTTP API v2
              </span>
            </div>
          </div>

          <div className="panel overflow-hidden">
            <div className="flex items-center justify-between gap-4 border-b border-line bg-wash px-5 py-4">
              <div>
                <p className="fine-label">Start here</p>
                <h3 className="mt-1 text-[21px] font-semibold leading-[1.19] tracking-[0.231px] text-ink">Login command</h3>
              </div>
              <CopyButton value={commands.login} className="shrink-0" />
            </div>
            <div className="p-3 sm:p-5">
              <CommandTerminal code={commands.login} />
            </div>
          </div>
        </div>
      </section>

      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MiniFact icon={Globe2} label="Registry Host" value={host} />
        <MiniFact icon={LockKeyhole} label="Authentication" value="htpasswd credentials" />
        <MiniFact icon={Server} label="Docker API Path" value="/v2/ is routed internally" />
      </dl>

      <section className="space-y-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h3 className="text-[28px] font-semibold leading-[1.14] tracking-[0.196px] text-ink">Quick start</h3>
            <p className="mt-1 text-[17px] leading-[1.47] tracking-[-0.374px] text-muted">
              Run these from a machine that can reach the registry domain.
            </p>
          </div>
          <div className="hidden items-center gap-2 text-[14px] leading-[1.43] tracking-[-0.224px] text-primary sm:flex">
            Login
            <ArrowRight size={15} aria-hidden="true" />
            Push
            <ArrowRight size={15} aria-hidden="true" />
            Pull
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {commandCards.map((card) => (
            <CommandCard key={card.step} {...card} />
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <CommandCard
          step="05"
          icon={FileCode2}
          title="Use It In Docker Compose"
          description="Reference the fully qualified image name in any Compose app that can authenticate to the registry."
          code={commands.compose}
          shell={false}
        />

        <div className="space-y-4">
          <section className="rounded-[18px] border border-line bg-pearl p-6 text-[17px] leading-[1.47] tracking-[-0.374px] text-ink">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-primary">
              <LockKeyhole size={19} aria-hidden="true" />
            </div>
            <h3 className="mt-4 text-[21px] font-semibold leading-[1.19] tracking-[0.231px] text-ink">HTTPS requirement</h3>
            <p className="mt-2 text-muted">
              In production, connect a Dokploy domain to the nginx service on port 80 and let Dokploy/Traefik terminate
              HTTPS. Docker clients should use the HTTPS registry hostname.
            </p>
          </section>

          <CommandCard
            step="Local"
            icon={TerminalSquare}
            title="HTTP Testing Only"
            description="If you test plain HTTP on a local machine, add the registry host to Docker daemon settings and restart Docker."
            code={commands.insecure}
            shell={false}
          />
        </div>
      </section>
    </div>
  );
}
