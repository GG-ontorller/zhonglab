import { ModulePlaceholder } from "@/components/module-placeholder";

export default function LibraryPage() {
  return (
    <ModulePlaceholder
      badge="成果资料库"
      title="把论文、代码、数据和资料链接做成实验室知识库。"
      description="这个模块更像长期资产沉淀区，适合把已发表论文、开源仓库、数据集、实验模板和常用文档集中管理。"
      suggestions={[
        "论文与成果：题目、状态、链接、作者、引用信息。",
        "代码与数据：仓库地址、模型权重、实验记录、数据集路径。",
        "实验室公共资料：模板、规范、投稿清单、常用资源站点。",
      ]}
      actionHref="/schedule"
      actionLabel="看看组会日程"
    />
  );
}
