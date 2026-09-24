# DoubleWatch

Watch two to four YouTube live streams side by side and control their audio like a DJ mixer.

DoubleWatch is a Next.js app. It embeds YouTube players, adds its own controls on top of them, and uses a few small API routes for search, live chat and stream info. It works without any API keys; a YouTube Data API key is optional.

## Features

**Screens**
- 2, 3 or 4 screens in a grid, or a spotlight layout with one large screen and thumbnails
- Resizable split in 2-screen mode (drag the divider, double-click to reset)
- Per-screen controls: title and viewer count, volume, resolution, replace, swap and clear
- Resolution selection that applies to all screens and is remembered
- Theater mode with an auto-hiding control dock
- Swipe between screens on phones, with audio following the visible screen

**Audio**
- Crossfader for two screens, with standard, constant-power and cut curves
- Solo or mix-all selector for three or four screens
- Mixer panel with per-channel volume, mute and master level

**Finding streams**
- Live search with categories, search as you type and recent searches
- Accepts `watch?v=`, `youtu.be/`, `/live/`, `/shorts/` and `/embed/` links, plain video IDs, or a channel `@handle`
- Presets for saving channel combinations, plus watch history
- Follow channels by `@handle` and get notified when they go live
- Share links (`/?v=ID1,ID2`) that open the same set of streams

**Live chat**
- Chat panel next to each screen
- Combined chat that merges every screen's chat, tagged by channel
- Super Chat highlighting, member and moderator marks, blocked-word filter

**Other**
- Keyboard shortcuts (press `?` in the app for the full list)
- Installable as a PWA
- Accessible dialogs with focus trapping; respects reduced-motion settings

## Getting started

Requirements: Node.js 20.9 or later.

```bash
git clone https://github.com/fa33az/doublewatch.git
cd doublewatch
npm install
npm run dev
```

Then open http://localhost:3000.

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Build for production |
| `npm run start` | Serve the production build |
| `npm run lint` | Lint with oxlint |
| `npm run typecheck` | Type-check with `tsc --noEmit` |

### Configuration

Both variables are optional. Copy `.env.example` to `.env.local` and fill in what you need.

| Variable | Description |
| --- | --- |
| `YOUTUBE_API_KEY` | YouTube Data API v3 key. When set, search and stream info use the official API. Without it, the app reads YouTube's public pages instead. |
| `NEXT_PUBLIC_SITE_URL` | Public URL of your deployment, used for Open Graph image links. Defaults to `http://localhost:3000`. |

## How it works

**Players.** Each screen is a YouTube IFrame player with the native controls turned off. Volume, pause and live-edge seeking go through the IFrame API.

**Resolution.** The embed API ignores `setPlaybackQuality` and similar calls, so a site can't set the quality directly. What does work is YouTube's own quality menu: a choice made there is stored by YouTube (`yt-player-quality`, about a year) and applied to every embedded player on the same site. The resolution button therefore reloads one screen with YouTube's native controls so the user can pick a quality from its settings menu, then switches back. The choice then applies to all screens and future visits.

**Search** (`/api/search`) uses the Data API when a key is set and otherwise parses YouTube's search results page, filtered to live streams.

**Live chat** (`/api/chat/[videoId]`) is a Server-Sent Events stream. It reads recent messages and a continuation token from YouTube's `live_chat` page, then polls for new messages using the client and parser from [`youtube-chat`](https://www.npmjs.com/package/youtube-chat). The browser opens one connection per video and shares it between the chat panel and the combined chat.

**Stream info** (`/api/video/[videoId]`) returns title, channel, live status and viewer count. Without an API key it combines oEmbed with YouTube's internal `updated_metadata` endpoint.

**Channel lookup** (`/api/resolve?handle=@name`) finds a channel's current live stream from its `/live` page.

All API routes are rate limited per IP. The limiter keeps its state in memory, so on serverless platforms the limit applies per instance.

### Limitations

- Without an API key, search, chat and stream info rely on YouTube's web pages and internal endpoints. They can break if YouTube changes them, and YouTube sometimes serves a "confirm you're not a bot" page to servers. The routes retry, but for a public deployment an API key is more reliable.
- Some videos can't be embedded because their owners have disabled playback on other sites.

## Deployment

The app deploys to Vercel without extra configuration. The chat route sets `maxDuration = 300`; when Vercel ends the function, the browser reconnects automatically and duplicate messages are dropped.

## Project structure

```
src/
  app/
    api/
      chat/[videoId]/    live chat stream (SSE)
      resolve/           @handle to current live stream
      search/            live stream search
      video/[videoId]/   title, live status and viewers
    page.tsx             main screen
    globals.css          styles
  components/            UI components
  hooks/                 React hooks
  lib/                   shared logic: layout, mixer, storage, YouTube helpers
```

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `1` / `2` | 2 screens: full audio to CH 1 / CH 2 |
| `0` or `3` | 2 screens: mix both |
| `1`–`4` | 3–4 screens: listen to that channel only |
| `0` | 3–4 screens: mix all channels |
| `Space` | Pause or play all screens |
| `C` | Toggle chat on all live screens |
| `F` | Theater mode |
| `M` | Mute or unmute master |
| `S` or `/` | Search |
| `L` | Library |
| `?` | Show all shortcuts |

## License

[Apache License 2.0](LICENSE)
