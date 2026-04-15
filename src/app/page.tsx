import { ProjectDashboard } from "@/components/project-dashboard";

export default function Home() {
  const supabaseReady = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(242,112,73,0.18),_transparent_28%),linear-gradient(160deg,_#fffaf5_0%,_#f6fbff_48%,_#eef6f2_100%)] px-6 py-8 text-slate-900">
      <ProjectDashboard supabaseReady={supabaseReady} />
    </main>
  );
}
