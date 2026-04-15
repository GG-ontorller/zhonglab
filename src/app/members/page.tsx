import { ModulePlaceholder } from "@/components/module-placeholder";

export default function MembersPage() {
  return (
    <ModulePlaceholder
      badge="成员管理"
      title="把实验室成员、研究方向和职责收进统一名册。"
      description="这里适合沉淀每位成员的角色、研究主题、联系方式和近期负责事项，让组内协作不再只靠口头同步。"
      suggestions={[
        "成员基本资料：姓名、邮箱、年级、研究方向、个人主页。",
        "实验室角色：老师、博士、硕士、科研助理、访问学生。",
        "职责分工：当前负责课题、维护系统、带教安排、仪器负责人。",
      ]}
      actionHref="/projects"
      actionLabel="先回到项目管理"
    />
  );
}
