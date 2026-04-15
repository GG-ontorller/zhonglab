import { ModulePlaceholder } from "@/components/module-placeholder";

export default function SchedulePage() {
  return (
    <ModulePlaceholder
      badge="组会日程"
      title="把组会时间、汇报安排和会议纪要集中起来。"
      description="这一块适合管理每周例会、论文汇报、里程碑检查和会议结论，避免信息散落在聊天记录里。"
      suggestions={[
        "固定组会：时间、地点、主持人、参与人。",
        "汇报安排：本周汇报人、主题、相关资料链接。",
        "会议纪要：决议、待办、负责人、截止时间。",
      ]}
      actionHref="/members"
      actionLabel="看看成员管理"
    />
  );
}
