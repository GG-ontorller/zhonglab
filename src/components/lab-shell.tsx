"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { href: "/", label: "首页总览", desc: "Dashboard" },
  { href: "/projects", label: "项目管理", desc: "Projects" },
  { href: "/chat", label: "公共聊天", desc: "Chat" },
  { href: "/members", label: "成员管理", desc: "People" },
  { href: "/schedule", label: "组会日程", desc: "Schedule" },
  { href: "/library", label: "成果资料库", desc: "Library" },
  { href: "/settings", label: "系统设置", desc: "Settings" },
];

export function LabShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(242,112,73,0.18),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(89,172,255,0.18),_transparent_22%),linear-gradient(160deg,_#fffaf5_0%,_#f6fbff_48%,_#eef6f2_100%)] text-slate-900">
      <div className="mx-auto grid min-h-screen max-w-[1600px] gap-6 px-4 py-4 lg:grid-cols-[280px_1fr] lg:px-6 lg:py-6">
        <aside className="rounded-[2rem] border border-white/70 bg-white/78 p-5 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.35)] backdrop-blur lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
          <div className="mb-6 space-y-3">
            <div className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-4 py-1 text-sm font-semibold text-amber-700">
              Zhong&apos;s Lab
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                实验室工作台
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                把项目、成员、组会和成果库收进一个统一入口。
              </p>
            </div>
          </div>

          <nav className="space-y-2">
            {navigation.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === item.href
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-[1.4rem] border px-4 py-3 transition ${
                    active
                      ? "border-slate-900 bg-slate-900 text-white shadow-[0_16px_40px_-28px_rgba(15,23,42,0.9)]"
                      : "border-slate-200/80 bg-white/80 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="text-base font-semibold">{item.label}</div>
                  <div
                    className={`mt-1 text-sm ${
                      active ? "text-slate-300" : "text-slate-500"
                    }`}
                  >
                    {item.desc}
                  </div>
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 rounded-[1.5rem] border border-slate-200/80 bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-950">当前阶段</div>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              已上线项目管理和公共聊天，接下来适合补成员档案、组会纪要和成果沉淀。
            </p>
          </div>
        </aside>

        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
