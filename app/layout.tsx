import "@/styles/globals.css";
import { Metadata } from "next";
import clsx from "clsx";

import { Providers } from "@/app/providers";
import { siteConfig } from "@/config/site";
import { fontText, fontTitle } from "@/ui/fonts";

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,
  },
  description: siteConfig.description,
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning className="!pr-0" lang="es">
      <head />
      <body
        className={clsx(
          "min-h-screen font-text antialiased",
          fontText.variable,
          fontTitle.variable
        )}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
