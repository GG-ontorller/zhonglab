import Link from "next/link";

export function ModulePlaceholder({
  badge,
  title,
  description,
  suggestions,
  actionHref = "/projects",
  actionLabel = "先看项目管理",
}: {
  badge: string;
  title: string;
  description: string;
  suggestions: string[];
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <main className="space-y-6">
      <section className="rounded-[2rem] border border-white/70 bg-white/82 p-8 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.35)] backdrop-blur">
        <div className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-4 py-1 text-sm font-semibold text-amber-700">
          {badge}
        </div>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
          {title}
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
          {description}
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/82 p-6 shadow-[0_16px_50px_-30px_rgba(15,23,42,0.35)]">
          <h2 className="text-2xl font-semibold text-slate-950">建议先放进来的内容</h2>
          <div className="mt-5 space-y-3">
            {suggestions.map((item, index) => (
              <div
                key={item}
                className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-slate-600"
              >
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <span className="leading-7">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-slate-200/80 bg-gradient-to-br from-sky-50 to-white p-6 shadow-[0_16px_50px_-30px_rgba(15,23,42,0.35)]">
          <h2 className="text-2xl font-semibold text-slate-950">当前状态</h2>
          <p className="mt-4 leading-7 text-slate-600">
            这个模块现在还是占位页，结构已经留好。等你确认具体字段和流程后，
            我们就可以把它继续扩成正式功能。
          </p>
          <Link
            href={actionHref}
            className="mt-6 inline-flex rounded-full bg-slate-900 px-5 py-3 font-medium text-white transition hover:bg-slate-800"
          >
            {actionLabel}
          </Link>
        </div>
      </section>
    </main>
  );
}
