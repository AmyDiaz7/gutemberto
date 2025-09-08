import Sidebar from "@/ui/Sidebar";

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Sidebar />
      <main className="flex-1 h-screen overflow-hidden">{children}</main>
    </div>
  );
}
