"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { RealtimePostgresInsertPayload, Session } from "@supabase/supabase-js";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type ProfileRole = "admin" | "member" | "viewer";

type Profile = {
  id: string;
  email: string | null;
  role: ProfileRole;
};

type ChatMessage = {
  id: string;
  content: string;
  created_at: string;
  created_by: string | null;
  created_by_email: string | null;
};

function formatChatTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getFriendlyAuthError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("email rate limit exceeded")) {
    return "邮件发送过于频繁，请稍等几分钟后再试。";
  }

  if (
    normalized.includes("redirect") ||
    normalized.includes("site url") ||
    normalized.includes("redirect url")
  ) {
    return "登录回跳地址配置有误，请检查 Supabase 里的 Site URL 和 Redirect URLs。";
  }

  if (normalized.includes("invalid email")) {
    return "邮箱格式无效，请检查后重新输入。";
  }

  if (normalized.includes("email provider is disabled")) {
    return "邮箱登录功能尚未开启，请到 Supabase Authentication 里启用 Email Provider。";
  }

  return `登录邮件发送失败：${message}`;
}

export function PublicChatRoom({
  supabaseReady,
}: {
  supabaseReady: boolean;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [authEmail, setAuthEmail] = useState("");
  const [draft, setDraft] = useState("");
  const [authLoading, setAuthLoading] = useState(supabaseReady);
  const [loading, setLoading] = useState(false);
  const [sendingLink, setSendingLink] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

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

  const loadProfile = useCallback(async () => {
    const supabase = createBrowserSupabaseClient();

    if (!supabaseReady || !supabase || !session) {
      setProfile(null);
      return;
    }

    const { data, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();

    if (profileError) {
      setProfile(null);
      setError("当前账号还没有读到 profiles，请重新执行一次 supabase/init.sql。");
      return;
    }

    setProfile(data as Profile);
  }, [session, supabaseReady]);

  const loadMessages = useCallback(async () => {
    const supabase = createBrowserSupabaseClient();

    if (!supabaseReady || !supabase || !session) {
      setMessages([]);
      return;
    }

    setLoading(true);
    const { data, error: queryError } = await supabase
      .from("chat_messages")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(100);

    if (queryError) {
      setError("公共聊天记录读取失败，请确认 chat_messages 表和策略已经更新。");
      setLoading(false);
      return;
    }

    setMessages((data ?? []) as ChatMessage[]);
    setLoading(false);
  }, [session, supabaseReady]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadProfile();
      void loadMessages();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadMessages, loadProfile]);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();

    if (!supabaseReady || !supabase || !session) {
      return;
    }

    const channel = supabase
      .channel("public-chat")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
        },
        (payload: RealtimePostgresInsertPayload<ChatMessage>) => {
          setMessages((current) => {
            const exists = current.some((item) => item.id === payload.new.id);
            if (exists) return current;
            return [...current, payload.new].slice(-100);
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [session, supabaseReady]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const permissions = useMemo(() => {
    const role = profile?.role ?? null;
    return {
      role,
      canRead: Boolean(role),
      canSend: role === "admin" || role === "member",
    };
  }, [profile]);

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

    setSendingLink(true);
    setError(null);
    setNotice(null);

    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: authEmail.trim(),
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (signInError) {
      setError(getFriendlyAuthError(signInError.message));
      setSendingLink(false);
      return;
    }

    setNotice("登录链接已经发送，请打开邮箱完成登录。");
    setSendingLink(false);
  }

  async function handleSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = createBrowserSupabaseClient();
    const content = draft.trim();

    if (!supabaseReady || !supabase || !session || !permissions.canSend) {
      setError("当前账号没有发送消息的权限。");
      return;
    }

    if (!content) {
      setError("消息不能为空。");
      return;
    }

    setSendingMessage(true);
    setError(null);
    setNotice(null);

    const { error: insertError } = await supabase.from("chat_messages").insert({
      content,
      created_by: session.user.id,
      created_by_email: session.user.email ?? null,
    });

    if (insertError) {
      setError("消息发送失败，请确认 chat_messages 表和权限策略已经更新。");
      setSendingMessage(false);
      return;
    }

    setDraft("");
    setSendingMessage(false);
  }

  return (
    <main className="space-y-6">
      <section className="rounded-[2rem] border border-white/70 bg-white/82 p-8 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.35)] backdrop-blur">
        <div className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-4 py-1 text-sm font-semibold text-amber-700">
          公共聊天频道
        </div>
        <div className="mt-5 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
              把实验室里高频但短促的沟通，收进一个实时公共频道。
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
              这一版先做公共聊天室：适合临时提醒、共享链接、问答和快速同步。
              等你觉得顺手，再往项目私聊或主题频道扩展。
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-950 p-6 text-slate-50 shadow-[0_20px_60px_-36px_rgba(15,23,42,0.9)]">
            <div className="mb-4 text-lg font-semibold">频道状态</div>
            <div className="space-y-3 text-sm text-slate-300">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mb-1 font-medium text-white">当前账号</div>
                <p>{session?.user.email ?? "未登录"}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mb-1 font-medium text-white">当前角色</div>
                <p>
                  {permissions.role === "admin"
                    ? "管理员"
                    : permissions.role === "member"
                      ? "组员"
                      : permissions.role === "viewer"
                        ? "只读"
                        : "未登录"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mb-1 font-medium text-white">当前能力</div>
                <p>{permissions.canSend ? "可读写聊天消息" : permissions.canRead ? "只能查看聊天消息" : "请先登录"}</p>
              </div>
            </div>
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
        <section className="rounded-[1.75rem] border border-slate-200/80 bg-white/85 p-6 shadow-[0_16px_50px_-30px_rgba(15,23,42,0.35)]">
          <h2 className="text-2xl font-semibold text-slate-950">先登录再进入聊天频道</h2>
          <form className="mt-5 max-w-xl space-y-4" onSubmit={handleSendMagicLink}>
            <input
              value={authEmail}
              onChange={(event) => setAuthEmail(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-slate-300"
              placeholder="例如：your.name@university.edu"
            />
            <button
              type="submit"
              disabled={sendingLink || authLoading}
              className="rounded-2xl bg-slate-900 px-5 py-3 font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {sendingLink ? "发送中..." : "发送登录链接"}
            </button>
          </form>
        </section>
      ) : (
        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/85 p-6 shadow-[0_16px_50px_-30px_rgba(15,23,42,0.35)]">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-slate-950">频道消息</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  最近 100 条消息会保留在这个公共频道里。
                </p>
              </div>
              <button
                type="button"
                onClick={() => void loadMessages()}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                刷新消息
              </button>
            </div>

            <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-2">
              {loading ? (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-8 text-center text-slate-500">
                  正在读取聊天记录...
                </div>
              ) : null}

              {!loading && !messages.length ? (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-slate-500">
                  还没有消息。发第一条，告诉大家公共频道已经开通了。
                </div>
              ) : null}

              {messages.map((message) => (
                <article
                  key={message.id}
                  className="rounded-[1.4rem] border border-slate-200 bg-white px-4 py-3 shadow-[0_10px_30px_-26px_rgba(15,23,42,0.35)]"
                >
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <div className="font-medium text-slate-950">
                      {message.created_by_email || "unknown"}
                    </div>
                    <div className="text-slate-500">
                      {formatChatTime(message.created_at)}
                    </div>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap leading-7 text-slate-700">
                    {message.content}
                  </p>
                </article>
              ))}
              <div ref={bottomRef} />
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200/80 bg-gradient-to-br from-sky-50 to-white p-6 shadow-[0_16px_50px_-30px_rgba(15,23,42,0.35)]">
            <h2 className="text-2xl font-semibold text-slate-950">发送消息</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              先发文字版，后面如果需要，再加附件、图片和主题频道。
            </p>

            <form className="mt-5 space-y-4" onSubmit={handleSendMessage}>
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                disabled={!permissions.canSend}
                className="min-h-40 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-slate-300 disabled:cursor-not-allowed disabled:bg-slate-100"
                placeholder={
                  permissions.canSend
                    ? "例如：明天下午组会提前到 14:30；TAC 的返修意见已经同步到项目里。"
                    : "当前账号只能查看，不能发送消息。"
                }
              />
              <button
                type="submit"
                disabled={!permissions.canSend || sendingMessage}
                className="w-full rounded-2xl bg-slate-900 px-5 py-3 font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {sendingMessage ? "发送中..." : "发送到公共频道"}
              </button>
            </form>
          </div>
        </section>
      )}
    </main>
  );
}
