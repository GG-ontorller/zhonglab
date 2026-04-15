import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lab Workbench",
  description: "课题组科研协作与投稿管理工作台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
