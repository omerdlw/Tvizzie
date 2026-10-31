import type { MetadataRoute } from "next";
import { project } from "@/config/project";

const PAGES: readonly [
  path: string,
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"],
  priority: number,
][] = [
  ["", "daily", 1],
  ["/account", "weekly", 0.8],
  ["/privacy", "yearly", 0.3],
  ["/terms", "yearly", 0.3],
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return PAGES.map(([path, changeFrequency, priority]) => ({
    changeFrequency,
    lastModified,
    priority,
    url: `${project.url}${path}`,
  }));
}
