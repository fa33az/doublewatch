import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  
  if (!query) {
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;

  // 1. If API Key is present, use official YouTube Data API v3
  if (apiKey) {
    try {
      // Step 1: Search for live videos
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&eventType=live&q=${encodeURIComponent(query)}&key=${apiKey}&maxResults=20`;
      const searchRes = await fetch(searchUrl, { next: { revalidate: 60 } });
      
      if (!searchRes.ok) {
        throw new Error(`YouTube API Search failed: ${searchRes.status}`);
      }
      
      const searchData = await searchRes.json();
      
      if (!searchData.items || searchData.items.length === 0) {
        return NextResponse.json([], { status: 200 });
      }

      // Step 2: Extract video IDs to fetch viewer counts
      const videoIds = searchData.items.map((item: any) => item.id.videoId).filter(Boolean).join(',');
      
      if (!videoIds) {
        return NextResponse.json([], { status: 200 });
      }

      const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails,snippet&id=${videoIds}&key=${apiKey}`;
      const detailsRes = await fetch(detailsUrl, { next: { revalidate: 60 } });
      
      if (!detailsRes.ok) {
        throw new Error(`YouTube API Video Details failed: ${detailsRes.status}`);
      }
      
      const detailsData = await detailsRes.json();
      
      const items = detailsData.items.map((item: any) => {
        const concurrentViewers = item.liveStreamingDetails?.concurrentViewers;
        return {
          videoId: item.id,
          title: item.snippet.title,
          channelName: item.snippet.channelTitle,
          thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url || '',
          viewerCount: concurrentViewers 
            ? `${Number(concurrentViewers).toLocaleString()} watching`
            : null
        };
      });

      return NextResponse.json(items, { status: 200 });
    } catch (e: any) {
      console.warn('Official YouTube API failed, falling back to scrape-based search:', e.message);
      // Fall through to scrape-based search if API fails (quota limits, expired key, etc.)
    }
  }

  // 2. Scrape-based fallback (no API key required)
  const scrapeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgJAAQ%253D%253D`;

  try {
    const res = await fetch(scrapeUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      next: { revalidate: 60 } // Cache results for 60 seconds
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch YouTube results: ${res.status}`);
    }

    const html = await res.text();
    const regex = /ytInitialData\s*=\s*({.+?});/;
    const match = html.match(regex);
    
    if (!match) {
      return NextResponse.json([], { status: 200 });
    }

    const json = JSON.parse(match[1]);
    const contents = json.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
    
    if (!contents) {
      return NextResponse.json([], { status: 200 });
    }

    const items = [];
    for (const section of contents) {
      const videoItems = section.itemSectionRenderer?.contents;
      if (videoItems) {
        for (const item of videoItems) {
          if (item.videoRenderer) {
            const vr = item.videoRenderer;

            // Check if it is a live stream
            const isLive = vr.badges?.some((b: any) => b.metadataBadgeRenderer?.style === 'BADGE_STYLE_TYPE_LIVE_NOW') || 
                           JSON.stringify(vr).includes('LIVE') || 
                           JSON.stringify(vr).includes('watching');
            
            if (!isLive) continue;

            const videoId = vr.videoId;
            const title = vr.title?.runs?.[0]?.text || '';
            const channelName = vr.ownerText?.runs?.[0]?.text || '';
            const thumbnail = vr.thumbnail?.thumbnails?.[0]?.url || '';
            
            // Extract viewer count
            let viewerCount = '';
            if (vr.viewCountText?.runs) {
              viewerCount = vr.viewCountText.runs.map((r: any) => r.text).join('');
            } else if (vr.shortViewCountText?.runs) {
              viewerCount = vr.shortViewCountText.runs.map((r: any) => r.text).join('');
            } else if (vr.viewCountText?.simpleText) {
              viewerCount = vr.viewCountText.simpleText;
            }

            items.push({ videoId, title, channelName, thumbnail, viewerCount });
          }
        }
      }
    }

    return NextResponse.json(items, { status: 200 });
  } catch (e: any) {
    console.error('YouTube Search API error:', e);
    return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
  }
}
