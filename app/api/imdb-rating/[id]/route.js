import { NextResponse } from 'next/server'

export async function GET(request, { params }) {
  const { id } = await params

  if (!id || !id.startsWith('tt')) {
    return NextResponse.json(
      { error: 'Invalid IMDB ID provided' },
      { status: 400 }
    )
  }

  try {
    const res = await fetch(`https://www.imdb.com/title/${id}/reference`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      next: {
        revalidate: 86400, // Cache for 24 hours
      },
    })

    if (!res.ok) {
      throw new Error(`IMDB returned ${res.status}`)
    }

    const html = await res.text()

    // Try __NEXT_DATA__ first (most reliable on /reference pages)
    const nextDataMatch = html.match(
      /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/
    )
    if (nextDataMatch) {
      try {
        const nextData = JSON.parse(nextDataMatch[1])
        const ratingsSummary =
          nextData.props?.pageProps?.aboveTheFoldData?.ratingsSummary
        if (ratingsSummary) {
          return NextResponse.json({
            id,
            rating: ratingsSummary.aggregateRating || 0,
            votes: ratingsSummary.voteCount || 0,
            bestRating: 10,
          })
        }
      } catch {
        console.error('Failed to parse __NEXT_DATA__')
      }
    }

    // Fallback to ld+json
    const regex =
      /<script type="application\/ld\+json".*?>([\s\S]*?)<\/script>/g
    let match
    let aggregateRating = null

    while ((match = regex.exec(html)) !== null) {
      try {
        const json = JSON.parse(match[1])
        const data = Array.isArray(json)
          ? json.find((i) => i.aggregateRating)
          : json

        if (data?.aggregateRating) {
          aggregateRating = data.aggregateRating
          break
        }
      } catch {
        continue
      }
    }

    if (!aggregateRating) {
      return NextResponse.json(
        { error: 'Rating data not found in any structured data block' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id,
      rating:
        typeof aggregateRating.ratingValue === 'number'
          ? aggregateRating.ratingValue
          : parseFloat(aggregateRating.ratingValue) || 0,
      votes:
        typeof aggregateRating.ratingCount === 'number'
          ? aggregateRating.ratingCount
          : parseInt(aggregateRating.ratingCount) || 0,
      bestRating: aggregateRating.bestRating,
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch IMDB rating' },
      { status: 500 }
    )
  }
}
