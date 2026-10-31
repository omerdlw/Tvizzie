import { Geist } from "next/font/google";
import localFont from "next/font/local";

export const geist = Geist({
  subsets: ["latin", "latin-ext"],
  variable: "--font-geist",
});

export const zuume = localFont({
  src: [
    {
      path: "./zuume/Zuume-Bold.woff2",
      style: "normal",
      weight: "700",
    },
  ],
  variable: "--font-zuume",
});
