export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="w-full h-full flex bg-orange-200">{children}</div>;
}
