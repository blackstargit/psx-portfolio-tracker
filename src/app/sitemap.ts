import type { MetadataRoute } from 'next'

const SITE_URL = 'https://psx.blackstar.io'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  // Only publicly reachable routes are listed. The portfolio/dividends/planner
  // pages live behind authentication, so they are intentionally omitted.
  return [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${SITE_URL}/login`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ]
}
