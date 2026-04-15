import { ModulePlaceholder } from "@/components/module-placeholder";

export default function SettingsPage() {
  return (
    <ModulePlaceholder
      badge="系统设置"
      title="把部署状态、账号权限和系统说明收在这里。"
      description="设置页适合放环境变量说明、Supabase / Vercel 状态、自定义品牌信息，以及对管理员有用的后台说明。"
      suggestions={[
        "系统信息：部署域名、Supabase 项目、最近更新时间。",
        "权限说明：admin、member、viewer 的能力差异。",
        "运维说明：如何新增管理员、如何重置数据、如何扩展新模块。",
      ]}
      actionHref="/library"
      actionLabel="看看成果资料库"
    />
  );
}
