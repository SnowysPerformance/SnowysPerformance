import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/register", "/privacy", "/terms"],
        disallow: ["/dashboard", "/accept-invite"],
      },
    ],
    sitemap: "https://www.snowysperformance.com/sitemap.xml",
  };
}
