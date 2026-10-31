import type { MetadataRoute } from "next";
import { project } from "@/config/project";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ allow: "/", disallow: ["/api/", "/auth/"], userAgent: "*" }],
    sitemap: `${project.url}/sitemap.xml`,
  };
}
