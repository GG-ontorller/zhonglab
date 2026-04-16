import Link from "next/link";

export default function Home() {
  return (
    <main className="space-y-6">
      <section className="rounded-[2rem] border border-white/70 bg-white/82 p-8 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.35)] backdrop-blur">
        <div className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-4 py-1 text-sm font-semibold text-amber-700">
          首页总览
        </div>
        <div className="mt-5 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
              把 Zhong&apos;s Lab 的项目、成员、组会和成果沉淀进同一套工作台。
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
              现在项目管理已经是正式子功能了。接下来你可以围绕首页总览继续扩展，
              让整个系统更像一个实验室门户，而不是单一工具页。
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/projects"
                className="rounded-full bg-slate-900 px-5 py-3 font-medium text-white transition hover:bg-slate-800"
              >
                打开项目管理
              </Link>
              <Link
                href="/chat"
                className="rounded-full border border-slate-200 bg-white px-5 py-3 font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                进入公共聊天
              </Link>
              <Link
                href="/members"
                className="rounded-full border border-slate-200 bg-white px-5 py-3 font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                查看成员模块
              </Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[1.5rem] bg-slate-950 px-5 py-4 text-white">
              <div className="text-sm text-slate-300">核心模块</div>
              <div className="mt-2 text-3xl font-semibold">6</div>
              <div className="mt-2 text-sm text-slate-300">首页、项目、成员、组会、成果、设置</div>
            </div>
            <div className="rounded-[1.5rem] bg-sky-100 px-5 py-4 text-sky-900">
              <div className="text-sm text-sky-700">已可用</div>
              <div className="mt-2 text-3xl font-semibold">2</div>
              <div className="mt-2 text-sm text-sky-700">项目管理与公共聊天都已经能用</div>
            </div>
            <div className="rounded-[1.5rem] bg-emerald-100 px-5 py-4 text-emerald-900">
              <div className="text-sm text-emerald-700">下一步</div>
              <div className="mt-2 text-3xl font-semibold">成员</div>
              <div className="mt-2 text-sm text-emerald-700">建议优先补成员资料和角色说明</div>
            </div>
            <div className="rounded-[1.5rem] bg-orange-100 px-5 py-4 text-orange-900">
              <div className="text-sm text-orange-700">平台状态</div>
              <div className="mt-2 text-3xl font-semibold">Online</div>
              <div className="mt-2 text-sm text-orange-700">本地与 Vercel 都已跑通</div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {[
          {
            href: "/projects",
            title: "项目管理",
            desc: "继续维护投稿项目、时间线、角色和协作记录。",
          },
          {
            href: "/members",
            title: "成员管理",
            desc: "整理成员档案、研究方向、职责与联系方式。",
          },
          {
            href: "/chat",
            title: "公共聊天",
            desc: "收纳实验室的即时沟通、通知和快速协作消息。",
          },
          {
            href: "/schedule",
            title: "组会日程",
            desc: "安排组会时间、汇报顺序、待讨论议题和会议纪要。",
          },
          {
            href: "/library",
            title: "成果资料库",
            desc: "归档论文、代码、数据、实验记录与外部链接。",
          },
          {
            href: "/settings",
            title: "系统设置",
            desc: "查看环境状态、权限说明和部署信息。",
          },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-[1.5rem] border border-slate-200/80 bg-white/82 p-6 shadow-[0_16px_50px_-30px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5 hover:border-slate-300"
          >
            <h2 className="text-2xl font-semibold text-slate-950">{item.title}</h2>
            <p className="mt-3 leading-7 text-slate-600">{item.desc}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
