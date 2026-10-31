import type { JSX } from "react";
import type { Metadata } from "next";
import { HomeView, getHomeFeed } from "@/features/home";
import { project } from "@/config/project";

export const metadata: Metadata = {
  description: project.description,
  title: { absolute: project.name },
};

export default async function HomePage(): Promise<JSX.Element> {
  return <HomeView feed={await getHomeFeed()} />;
}
