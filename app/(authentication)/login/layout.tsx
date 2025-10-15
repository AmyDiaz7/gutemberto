// Estructura base para la página de login
export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="w-screen h-screen flex bg-orange-200 light">
      {children}
    </main>
  );
}
