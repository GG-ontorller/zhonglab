"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

const PROJECT_STATUSES = [
  "选题中",
  "写作中",
  "待投稿",
  "已投稿",
  "审稿中",
  "返修中",
  "已接收",
  "拒稿",
] as const;

const PROFILE_ROLES = ["admin", "member", "viewer"] as const;

type ProjectStatus = (typeof PROJECT_STATUSES)[number];
type ProfileRole = (typeof PROFILE_ROLES)[number];

type Project = {
  id: string;
  title: string;
  venue: string | null;
  status: ProjectStatus;
  deadline: string | null;
  priority: string | null;
  owner_name: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
  created_by: string | null;
};

type ProjectUpdate = {
  id: string;
  project_id: string;
  content: string;
  created_by_email: string | null;
  created_at: string;
};

type Profile = {
  id: string;
  email: string | null;
  role: ProfileRole;
  created_at: string;
};

type FormState = {
  title: string;
  venue: string;
  status: ProjectStatus;
  deadline: string;
  priority: string;
  owner_name: string;
  notes: string;
};

const defaultFormState: FormState = {
  title: "",
  venue: "",
  status: "选题中",
  deadline: "",
  priority: "中",
  owner_name: "",
  notes: "",
};

function formatDate(value: string | null) {
  if (!value) return "未设置";
  return value;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatBeijingNow() {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date());
}

function roleLabel(role: ProfileRole | null) {
  if (role === "admin") return "管理员";
  if (role === "member") return "组员";
  if (role === "viewer") return "只读";
  return "未分配";
}

export function ProjectDashboard({ supabaseReady }: { supabaseReady: boolean }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectUpdates, setProjectUpdates] = useState<
    Record<string, ProjectUpdate[]>
  >({});
  const [updateDrafts, setUpdateDrafts] = useState<Record<string, string>>({});
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [form, setForm] = useState<FormState>(defaultFormState);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [authLoading, setAuthLoading] = useState(supabaseReady);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingLoginLink, setSendingLoginLink] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [timelineSavingProjectId, setTimelineSavingProjectId] = useState<
    string | null
  >(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [roleSavingUserId, setRoleSavingUserId] = useState<string | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [beijingNow, setBeijingNow] = useState(() => formatBeijingNow());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setBeijingNow(formatBeijingNow());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();

    if (!supabaseReady || !supabase) {
      return;
    }

    let mounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabaseReady]);

  const isAuthLoading = supabaseReady ? authLoading : false;

  const loadCurrentProfile = useCallback(async () => {
    const supabase = createBrowserSupabaseClient();

    if (!supabaseReady || !supabase || !session) {
      setCurrentProfile(null);
      return;
    }

    const { data, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();

    if (profileError) {
      setCurrentProfile(null);
      setError("登录成功了，但还没读到 profiles。请重新执行最新的 supabase/init.sql。");
      return;
    }

    setCurrentProfile(data as Profile);
  }, [session, supabaseReady]);

  const loadProfiles = useCallback(async () => {
    const supabase = createBrowserSupabaseClient();

    if (!supabaseReady || !supabase || !session) {
      setProfiles([]);
      return;
    }

    const { data, error: profilesError } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: true });

    if (profilesError) {
      setError("角色列表读取失败，请确认 profiles 表和策略已经更新。");
      return;
    }

    setProfiles((data ?? []) as Profile[]);
  }, [session, supabaseReady]);

  const loadProjects = useCallback(async () => {
    const supabase = createBrowserSupabaseClient();

    if (!supabaseReady || !supabase) {
      setProjects([]);
      setLoading(false);
      setError("本地环境变量还没准备好，请先确认 .env.local 已生效。");
      return;
    }

    if (!session) {
      setProjects([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error: queryError } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });

    if (queryError) {
      setProjects([]);
      setError(
        "还没有读到 projects 表，或者登录权限策略还没更新。请重新执行最新的 supabase/init.sql。",
      );
      setLoading(false);
      return;
    }

    setProjects((data ?? []) as Project[]);
    setLoading(false);
  }, [session, supabaseReady]);

  const loadProjectUpdates = useCallback(
    async (projectId: string) => {
      const supabase = createBrowserSupabaseClient();

      if (!supabaseReady || !supabase || !session) {
        return;
      }

      const { data, error: queryError } = await supabase
        .from("project_updates")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (queryError) {
        setError("时间线读取失败，请确认 project_updates 表和策略已经更新。");
        return;
      }

      setProjectUpdates((current) => ({
        ...current,
        [projectId]: (data ?? []) as ProjectUpdate[],
      }));
    },
    [session, supabaseReady],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCurrentProfile();
      void loadProjects();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadCurrentProfile, loadProjects]);

  useEffect(() => {
    if (currentProfile?.role === "admin") {
      const timer = window.setTimeout(() => {
        void loadProfiles();
      }, 0);

      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(() => {
      setProfiles([]);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [currentProfile, loadProfiles]);

  const permissions = useMemo(() => {
    const role = currentProfile?.role ?? null;
    return {
      role,
      canManageProjects: role === "admin" || role === "member",
      canManageRoles: role === "admin",
      canReadProjects: Boolean(role),
    };
  }, [currentProfile]);

  const stats = useMemo(() => {
    const active = projects.filter(
      (project) => !["已接收", "拒稿"].includes(project.status),
    ).length;
    const accepted = projects.filter(
      (project) => project.status === "已接收",
    ).length;
    const nearDeadline = projects.filter((project) => {
      if (!project.deadline) return false;
      const deadline = new Date(project.deadline);
      const now = new Date();
      const diff = deadline.getTime() - now.getTime();
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      return days >= 0 && days <= 14;
    }).length;

    return {
      total: projects.length,
      active,
      accepted,
      nearDeadline,
    };
  }, [projects]);

  function resetForm() {
    setEditingProjectId(null);
    setForm(defaultFormState);
  }

  function startEditing(project: Project) {
    setEditingProjectId(project.id);
    setForm({
      title: project.title,
      venue: project.venue ?? "",
      status: project.status,
      deadline: project.deadline ?? "",
      priority: project.priority ?? "中",
      owner_name: project.owner_name ?? "",
      notes: project.notes ?? "",
    });
    setNotice(`正在编辑：${project.title}`);
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = createBrowserSupabaseClient();

    if (!supabaseReady || !supabase) {
      setError("Supabase 连接还没准备好，先检查 .env.local 和 dev 服务。");
      return;
    }

    if (!session || !permissions.canManageProjects) {
      setError("当前账号没有项目编辑权限。");
      return;
    }

    if (!form.title.trim()) {
      setError("题目不能为空。");
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);

    const payload = {
      title: form.title.trim(),
      venue: form.venue.trim() || null,
      status: form.status,
      deadline: form.deadline || null,
      priority: form.priority.trim() || null,
      owner_name: form.owner_name.trim() || null,
      notes: form.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const query = editingProjectId
      ? supabase.from("projects").update(payload).eq("id", editingProjectId)
      : supabase.from("projects").insert({
          ...payload,
          created_by: session.user.id,
        });

    const { error: saveError } = await query;

    if (saveError) {
      setError(
        "保存失败。请确认你已经重新执行了 SQL 初始化，并且当前账号角色不是只读。",
      );
      setSaving(false);
      return;
    }

    const wasEditing = Boolean(editingProjectId);
    resetForm();
    setNotice(wasEditing ? "项目已更新。" : "项目已保存到 Supabase。");
    setSaving(false);
    await loadProjects();
  }

  async function handleDelete(projectId: string) {
    const supabase = createBrowserSupabaseClient();

    if (!supabaseReady || !supabase || !session || !permissions.canManageProjects) {
      setError("当前账号没有删除权限。");
      return;
    }

    const target = projects.find((project) => project.id === projectId);
    if (!target) return;

    if (!window.confirm(`确定删除项目「${target.title}」吗？`)) {
      return;
    }

    setDeletingProjectId(projectId);
    setError(null);
    setNotice(null);

    const { error: deleteError } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectId);

    if (deleteError) {
      setError("删除失败。请确认当前账号角色允许删除项目。");
      setDeletingProjectId(null);
      return;
    }

    if (editingProjectId === projectId) {
      resetForm();
    }
    if (expandedProjectId === projectId) {
      setExpandedProjectId(null);
    }

    setNotice("项目已删除。");
    setDeletingProjectId(null);
    await loadProjects();
  }

  async function toggleTimeline(projectId: string) {
    const nextExpanded = expandedProjectId === projectId ? null : projectId;
    setExpandedProjectId(nextExpanded);

    if (nextExpanded) {
      await loadProjectUpdates(projectId);
    }
  }

  async function handleAddTimelineUpdate(projectId: string) {
    const supabase = createBrowserSupabaseClient();
    const content = updateDrafts[projectId]?.trim();

    if (!supabaseReady || !supabase || !session || !permissions.canManageProjects) {
      setError("当前账号没有写入时间线的权限。");
      return;
    }

    if (!content) {
      setError("时间线内容不能为空。");
      return;
    }

    setTimelineSavingProjectId(projectId);
    setError(null);
    setNotice(null);

    const { error: insertError } = await supabase.from("project_updates").insert({
      project_id: projectId,
      content,
      created_by: session.user.id,
      created_by_email: session.user.email ?? null,
    });

    if (insertError) {
      setError("时间线保存失败。请确认当前账号角色允许写入时间线。");
      setTimelineSavingProjectId(null);
      return;
    }

    setUpdateDrafts((current) => ({ ...current, [projectId]: "" }));
    setNotice("时间线已更新。");
    setTimelineSavingProjectId(null);
    await loadProjectUpdates(projectId);
  }

  async function handleSendMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = createBrowserSupabaseClient();

    if (!supabaseReady || !supabase) {
      setError("Supabase 环境变量还没准备好。");
      return;
    }

    if (!authEmail.trim()) {
      setError("请先填写登录邮箱。");
      return;
    }

    setSendingLoginLink(true);
    setError(null);
    setNotice(null);

    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: authEmail.trim(),
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (signInError) {
      setError(`登录邮件发送失败：${signInError.message}`);
      setSendingLoginLink(false);
      return;
    }

    setNotice("登录链接已经发送到你的邮箱，请点开邮件完成登录。");
    setSendingLoginLink(false);
  }

  async function handleSignOut() {
    const supabase = createBrowserSupabaseClient();

    if (!supabaseReady || !supabase) return;

    setSigningOut(true);
    setError(null);
    setNotice(null);
    await supabase.auth.signOut();
    setProjects([]);
    setProfiles([]);
    setProjectUpdates({});
    setExpandedProjectId(null);
    setCurrentProfile(null);
    setSigningOut(false);
    setNotice("你已经退出登录。");
  }

  async function handleRoleChange(userId: string, role: ProfileRole) {
    const supabase = createBrowserSupabaseClient();

    if (!supabaseReady || !supabase || !permissions.canManageRoles) {
      setError("当前账号没有角色管理权限。");
      return;
    }

    setRoleSavingUserId(userId);
    setError(null);
    setNotice(null);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", userId);

    if (updateError) {
      setError("角色更新失败。请确认当前账号已经被设置成 admin。");
      setRoleSavingUserId(null);
      return;
    }

    setProfiles((current) =>
      current.map((profile) =>
        profile.id === userId ? { ...profile, role } : profile,
      ),
    );

    if (currentProfile?.id === userId) {
      setCurrentProfile({ ...currentProfile, role });
    }

    setNotice("角色已更新。");
    setRoleSavingUserId(null);
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/85 p-8 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.35)] backdrop-blur">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <div className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-4 py-1 text-sm font-semibold text-amber-700">
              项目管理
            </div>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
                Zhong&apos;s Lab
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-600">
                {beijingNow}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-3xl bg-slate-950 px-5 py-4 text-white">
                <div className="text-sm text-slate-300">总项目</div>
                <div className="mt-2 text-3xl font-semibold">{stats.total}</div>
              </div>
              <div className="rounded-3xl bg-sky-100 px-5 py-4 text-sky-900">
                <div className="text-sm text-sky-700">进行中</div>
                <div className="mt-2 text-3xl font-semibold">{stats.active}</div>
              </div>
              <div className="rounded-3xl bg-emerald-100 px-5 py-4 text-emerald-900">
                <div className="text-sm text-emerald-700">已接收</div>
                <div className="mt-2 text-3xl font-semibold">{stats.accepted}</div>
              </div>
              <div className="rounded-3xl bg-orange-100 px-5 py-4 text-orange-900">
                <div className="text-sm text-orange-700">14 天内截止</div>
                <div className="mt-2 text-3xl font-semibold">{stats.nearDeadline}</div>
              </div>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-950 p-6 text-slate-50 shadow-[0_20px_60px_-36px_rgba(15,23,42,0.9)]">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold">账号状态</h2>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  session
                    ? "bg-emerald-400/15 text-emerald-300"
                    : "bg-amber-400/15 text-amber-300"
                }`}
              >
                {isAuthLoading ? "正在检测" : session ? "已登录" : "未登录"}
              </span>
            </div>

            {session ? (
              <div className="space-y-4 text-sm text-slate-300">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-1 font-medium text-white">当前账号</div>
                  <p>{session.user.email}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-1 font-medium text-white">当前角色</div>
                  <p>{roleLabel(permissions.role)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-1 font-medium text-white">当前能力</div>
                  <p>
                    {permissions.role === "admin"
                      ? "管理项目、时间线和成员角色"
                      : permissions.role === "member"
                        ? "管理项目和时间线"
                        : permissions.role === "viewer"
                          ? "只读查看"
                          : "等待角色同步"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  disabled={signingOut}
                  className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {signingOut ? "正在退出..." : "退出登录"}
                </button>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleSendMagicLink}>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                  先用邮箱登录。登录后系统会自动读取你在 `profiles` 表里的角色。
                </div>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-white">
                    登录邮箱
                  </span>
                  <input
                    value={authEmail}
                    onChange={(event) => setAuthEmail(event.target.value)}
                    className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-white/30"
                    placeholder="例如：your.name@university.edu"
                  />
                </label>
                <button
                  type="submit"
                  disabled={sendingLoginLink || isAuthLoading}
                  className="w-full rounded-2xl bg-white px-4 py-3 font-medium text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sendingLoginLink ? "发送中..." : "发送登录链接"}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-7 text-rose-700">
          {error}
        </div>
      ) : null}

      {notice ? (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm leading-7 text-emerald-700">
          {notice}
        </div>
      ) : null}

      {!session ? (
        <section className="rounded-[1.75rem] border border-slate-200/80 bg-white/85 p-8 text-slate-600 shadow-[0_16px_50px_-30px_rgba(15,23,42,0.35)]">
          <h2 className="text-2xl font-semibold text-slate-950">下一步要做的事</h2>
          <ol className="mt-4 space-y-3 leading-7">
            <li>1. 去 Supabase Auth 的 URL Configuration 配置 `http://localhost:3000`。</li>
            <li>2. 重新执行项目里的 `supabase/init.sql`，让 profiles 和角色策略生效。</li>
            <li>3. 回到这里输入邮箱，点登录链接后刷新页面。</li>
          </ol>
        </section>
      ) : null}

      {permissions.canManageRoles ? (
        <section className="rounded-[1.75rem] border border-slate-200/80 bg-white/85 p-6 shadow-[0_16px_50px_-30px_rgba(15,23,42,0.35)]">
          <div className="mb-5">
            <h2 className="text-2xl font-semibold text-slate-950">成员角色管理</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              只有 `admin` 能看到这里。你可以把成员切成管理员、组员或只读。
            </p>
          </div>
          <div className="grid gap-4">
            {profiles.map((profile) => (
              <div
                key={profile.id}
                className="grid gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_auto]"
              >
                <div>
                  <div className="font-medium text-slate-950">
                    {profile.email || "unknown"}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    当前角色：{roleLabel(profile.role)}
                  </div>
                </div>
                <select
                  value={profile.role}
                  onChange={(event) =>
                    void handleRoleChange(
                      profile.id,
                      event.target.value as ProfileRole,
                    )
                  }
                  disabled={roleSavingUserId === profile.id}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {PROFILE_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {roleLabel(role)}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/85 p-6 shadow-[0_16px_50px_-30px_rgba(15,23,42,0.35)]">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-slate-950">项目列表</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                已登录后可以查看项目；`member` 与 `admin` 可编辑、删除和维护时间线。
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadProjects()}
              disabled={!permissions.canReadProjects || loading}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              刷新列表
            </button>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-8 text-center text-slate-500">
                正在读取项目列表...
              </div>
            ) : null}

            {!loading && permissions.canReadProjects && !projects.length ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-slate-500">
                已登录，但还没有项目。先在右侧新增一个试试看。
              </div>
            ) : null}

            {permissions.canReadProjects
              ? projects.map((project) => {
                  const updates = projectUpdates[project.id] ?? [];
                  const isExpanded = expandedProjectId === project.id;

                  return (
                    <article
                      key={project.id}
                      className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[0_10px_40px_-28px_rgba(15,23,42,0.45)]"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            <h3 className="mr-2 text-xl font-semibold text-slate-950">
                              {project.title}
                            </h3>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                              {project.status}
                            </span>
                            {project.priority ? (
                              <span className="rounded-full bg-orange-100 px-3 py-1 text-orange-700">
                                {project.priority} 优先级
                              </span>
                            ) : null}
                            {project.owner_name ? (
                              <span className="rounded-full bg-sky-100 px-3 py-1 text-sky-700">
                                负责人：{project.owner_name}
                              </span>
                            ) : null}
                          </div>
                          <div className="text-sm leading-7 text-slate-600">
                            <div>目标：{project.venue || "未填写"}</div>
                            <div>截止：{formatDate(project.deadline)}</div>
                            <div>
                              最近更新：
                              {formatDateTime(project.updated_at ?? project.created_at)}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {permissions.canManageProjects ? (
                            <>
                              <button
                                type="button"
                                onClick={() => startEditing(project)}
                                className="rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700 transition hover:bg-sky-100"
                              >
                                编辑
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDelete(project.id)}
                                disabled={deletingProjectId === project.id}
                                className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {deletingProjectId === project.id ? "删除中..." : "删除"}
                              </button>
                            </>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => void toggleTimeline(project.id)}
                            className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
                          >
                            {isExpanded ? "收起时间线" : "项目时间线"}
                          </button>
                        </div>
                      </div>

                      {project.notes ? (
                        <p className="mt-4 leading-7 text-slate-600">{project.notes}</p>
                      ) : null}

                      {isExpanded ? (
                        <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                          <div className="mb-4 flex items-center justify-between gap-4">
                            <h4 className="text-lg font-semibold text-slate-950">
                              项目时间线
                            </h4>
                            <button
                              type="button"
                              onClick={() => void loadProjectUpdates(project.id)}
                              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                            >
                              刷新时间线
                            </button>
                          </div>

                          <div className="space-y-3">
                            {updates.length ? (
                              updates.map((update) => (
                                <div
                                  key={update.id}
                                  className="rounded-2xl border border-white bg-white px-4 py-3"
                                >
                                  <div className="text-sm leading-7 text-slate-700">
                                    {update.content}
                                  </div>
                                  <div className="mt-2 text-xs text-slate-500">
                                    {update.created_by_email || "unknown"} ·{" "}
                                    {formatDateTime(update.created_at)}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                                这个项目还没有时间线记录。先补一条“已投稿”或“返修完成”。
                              </div>
                            )}
                          </div>

                          {permissions.canManageProjects ? (
                            <div className="mt-4 space-y-3">
                              <textarea
                                value={updateDrafts[project.id] ?? ""}
                                onChange={(event) =>
                                  setUpdateDrafts((current) => ({
                                    ...current,
                                    [project.id]: event.target.value,
                                  }))
                                }
                                className="min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-slate-300"
                                placeholder="例如：2026-04-20 提交给 IEEE TAC；2026-05-18 收到 major revision。"
                              />
                              <button
                                type="button"
                                onClick={() => void handleAddTimelineUpdate(project.id)}
                                disabled={timelineSavingProjectId === project.id}
                                className="rounded-2xl bg-slate-950 px-5 py-3 font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                              >
                                {timelineSavingProjectId === project.id
                                  ? "保存中..."
                                  : "新增时间线记录"}
                              </button>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </article>
                  );
                })
              : null}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-orange-100 bg-gradient-to-br from-orange-50 to-rose-50 p-6 shadow-[0_16px_50px_-30px_rgba(15,23,42,0.35)]">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-slate-950">
                {editingProjectId ? "编辑项目" : "新增项目"}
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {permissions.canManageProjects
                  ? editingProjectId
                    ? "你正在修改已有项目，保存后会直接更新数据库。"
                    : "先把投稿题目、阶段、负责人这些基础信息存进去。"
                  : "当前账号没有写入权限。切换成 member 或 admin 后，这里会自动启用。"}
              </p>
            </div>
            {editingProjectId ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-orange-700 transition hover:bg-orange-50"
              >
                取消编辑
              </button>
            ) : null}
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">题目</span>
              <input
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({ ...current, title: event.target.value }))
                }
                className="w-full rounded-2xl border border-orange-200 bg-white px-4 py-3 outline-none transition focus:border-orange-300"
                placeholder="例如：Graph-based control for ..."
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  目标期刊 / 会议
                </span>
                <input
                  value={form.venue}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, venue: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-orange-200 bg-white px-4 py-3 outline-none transition focus:border-orange-300"
                  placeholder="例如：IEEE TAC"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">负责人</span>
                <input
                  value={form.owner_name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      owner_name: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-orange-200 bg-white px-4 py-3 outline-none transition focus:border-orange-300"
                  placeholder="例如：Zhong / Alice"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">阶段</span>
                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      status: event.target.value as ProjectStatus,
                    }))
                  }
                  className="w-full rounded-2xl border border-orange-200 bg-white px-4 py-3 outline-none transition focus:border-orange-300"
                >
                  {PROJECT_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">截止日期</span>
                <input
                  type="date"
                  value={form.deadline}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, deadline: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-orange-200 bg-white px-4 py-3 outline-none transition focus:border-orange-300"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">优先级</span>
                <select
                  value={form.priority}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, priority: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-orange-200 bg-white px-4 py-3 outline-none transition focus:border-orange-300"
                >
                  <option value="高">高</option>
                  <option value="中">中</option>
                  <option value="低">低</option>
                </select>
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">备注</span>
              <textarea
                value={form.notes}
                onChange={(event) =>
                  setForm((current) => ({ ...current, notes: event.target.value }))
                }
                className="min-h-32 w-full rounded-2xl border border-orange-200 bg-white px-4 py-3 outline-none transition focus:border-orange-300"
                placeholder="例如：还缺最后一组实验；返修点集中在第 3 节。"
              />
            </label>

            <button
              type="submit"
              disabled={saving || !permissions.canManageProjects}
              className="w-full rounded-2xl bg-slate-950 px-5 py-3 font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {saving
                ? "正在保存..."
                : editingProjectId
                  ? "更新项目"
                  : "保存到 Supabase"}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
