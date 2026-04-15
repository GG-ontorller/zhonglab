import { ProjectDashboard } from "@/components/project-dashboard";

export default function ProjectsPage() {
  const supabaseReady = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );

  return <ProjectDashboard supabaseReady={supabaseReady} />;
}
