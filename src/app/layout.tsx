import type { Metadata } from "next";
import { connection } from "next/server";
import type { JSX, ReactNode } from "react";
import "./globals.css";
import { geist, zuume } from "./fonts";
import { project } from "@/config/project";
import { Providers } from "./providers";

export const metadata: Metadata = {
  description: project.description,
  metadataBase: new URL(project.url),
  title: {
    default: project.name,
    template: "%s",
  },
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}): Promise<JSX.Element> {
  await connection();

  return (
    <html lang="en">
      <body
        className={`${geist.variable} ${geist.className} ${zuume.variable} bg-black text-white antialiased`}
        suppressHydrationWarning
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
