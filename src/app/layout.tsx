import type { Metadata } from "next";
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

export default function RootLayout({ children }: RootLayoutProps): JSX.Element {
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
