import { MetadataRoute } from 'next'
import { prisma } from '@/lib/db'
import { getSiteUrl } from '@/lib/site-config'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl()

  if (!process.env.DATABASE_URL) {
    return [
      { url: `${baseUrl}/`, changeFrequency: 'weekly', priority: 1 },
    ]
  }

  try {
    const itens = await prisma.catmatItem.findMany({
      orderBy: { codigoItem: 'asc' },
      take: 5000,
      select: { codigoItem: true },
    })

    return [
      { url: `${baseUrl}/`, changeFrequency: 'weekly', priority: 1 },
      { url: `${baseUrl}/grupos`, changeFrequency: 'weekly', priority: 0.9 },
      ...itens.map((item) => ({ url: `${baseUrl}/material/${item.codigoItem}`, changeFrequency: 'monthly' as const, priority: 0.8 })),
    ]
  } catch (error) {
    console.warn('[sitemap] Falha ao consultar itens CATMAT:', error)
    return [
      { url: `${baseUrl}/`, changeFrequency: 'weekly', priority: 1 },
    ]
  }
}
