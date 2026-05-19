export default function StatCard({ label, value, detail, icon: Icon, tone = "accent" }) {
  const color = tone === "rose" ? "text-white bg-ink" : "text-primary bg-primary/10";

  return (
    <section className="panel p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="fine-label">{label}</p>
          <p className="mt-3 break-words text-[30px] font-semibold leading-[1.1] tracking-[-0.374px] text-ink sm:text-[34px]">{value}</p>
          {detail ? <p className="mt-1 break-words text-[14px] leading-[1.43] tracking-[-0.224px] text-muted">{detail}</p> : null}
        </div>
        {Icon ? (
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${color}`}>
            <Icon size={18} aria-hidden="true" />
          </span>
        ) : null}
      </div>
    </section>
  );
}
