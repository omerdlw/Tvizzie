import { NextResponse } from 'next/server'

import * as cheerio from 'cheerio'

export async function GET(request, { params }) {
  const resolvedParams = await params
  const type = resolvedParams?.type || 'movies'
  const url =
    type === 'tv'
      ? 'https://www.imdb.com/chart/toptv/'
      : 'https://www.imdb.com/chart/top/'

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      next: { revalidate: 86400 },
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch IMDB' },
        { status: 500 }
      )
    }

    const html = await res.text()
    const $ = cheerio.load(html)
    const items = []

    const nextDataScript = $('#__NEXT_DATA__').html()
    if (nextDataScript) {
      const data = JSON.parse(nextDataScript)
      const edges = data?.props?.pageProps?.pageData?.chartTitles?.edges || []

      for (const edge of edges) {
        const node = edge.node
        if (!node) continue

        items.push({
          id: node.id,
          title: node.titleText?.text || '',
          original_title: node.originalTitleText?.text || '',
          year: node.releaseYear?.year?.toString() || '',
          rating: node.ratingsSummary?.aggregateRating?.toFixed(1) || null,
          poster: node.primaryImage?.url || null,
          rank: edge.currentRank,
          description: node.plot?.plotText?.plainText || '',
        })
      }
    }

    if (items.length === 0) {
      $('.ipc-metadata-list-summary-item').each((i, el) => {
        const titleText = $(el).find('h3.ipc-title__text').text().trim()
        const rankMatch = titleText.match(/^(\d+)\.\s+(.*)/)
        const rank = rankMatch ? parseInt(rankMatch[1], 10) : i + 1
        const title = rankMatch ? rankMatch[2] : titleText
        const year = $(el)
          .find('.cli-title-metadata-item')
          .first()
          .text()
          .trim()
        const ratingText = $(el).find('.ipc-rating-star').text().trim()
        const ratingMatch = ratingText.match(/([\d.]+)/)
        const rating = ratingMatch ? ratingMatch[1] : null
        const poster = $(el).find('img.ipc-image').attr('src') || null

        items.push({
          id: `imdb-${i}`,
          title,
          year,
          rating,
          poster,
          rank,
        })
      })
    }

    const top100 = items.slice(0, 100)

    return NextResponse.json({
      success: true,
      data: top100,
    })
  } catch (err) {
    console.error('IMDB Scrape Error:', err)
    return NextResponse.json(
      { error: err.message || 'Scraping failed' },
      { status: 500 }
    )
  }
}
