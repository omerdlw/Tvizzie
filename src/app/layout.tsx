import type { Metadata } from "next";
import { connection } from "next/server";
import type { JSX, ReactNode } from "react";
import "./globals.css";
import { baselGrotesk, baselMono, martina, zuume } from "@/app/fonts";
import { project } from "@config/project";
import { Providers } from "./providers";

export const metadata: Metadata = {
  description: project.description,
  title: {
    default: project.name,
    template: "%s",
  },
};

export interface RootLayoutProps {
  children: ReactNode;
}

export default async function RootLayout({
  children,
}: RootLayoutProps): Promise<JSX.Element> {
  // Every page is rendered per request, so its scripts carry the nonce of the
  // policy the proxy sent with it. A page built ahead of time would have none,
  // and the policy would block it.
  await connection();

  return (
    <html lang="en">
      <body
        className={`${baselGrotesk.variable} ${baselGrotesk.className} ${baselMono.variable} ${martina.variable} ${zuume.variable} bg-black text-white antialiased`}
        suppressHydrationWarning
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
