# SASI AI Pulse Frontend

A responsive React + Vite frontend for the SASI AI Pulse research and AI industry-news discovery product.

## What's included

- Editorial-style personalized feed for papers and industry stories
- Light/dark themes, saved items, search, topic selection and profile views
- Beginner-friendly onboarding flow
- Responsive desktop, tablet and mobile layouts
- Reduced-motion support, keyboard focus states, and contrast-conscious design tokens
- Centralized API adapter in `src/api.js`
- Sample content fallback so the UI runs before the backend endpoints are wired up

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

To verify a production build:

```bash
npm run build
npm run preview
```

## Connect to your backend

Create `.env` in this folder:

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

The API adapter currently expects these routes:

- `GET /api/feed?profileId=...`
- `POST /api/profiles`
- `GET /api/profiles/:profileId` (available in adapter for later use)
- `POST /api/feedback`

The exact routes and response shapes in your current backend were not available in this frontend handoff, so these are the frontend's expected contract, not a claim that these endpoints already exist. All route assumptions are centralized in `src/api.js`. Update that file to match your actual Express routes.

### Expected feed response

Either a combined object:

```json
{
  "papers": [
    {
      "id": "paper-id",
      "type": "paper",
      "title": "Paper title",
      "authors": ["Author et al."],
      "source": "arXiv",
      "publishedAt": "2026-10-29T10:00:00.000Z",
      "url": "https://arxiv.org/abs/...",
      "summary": "A concise summary.",
      "topicTags": ["AI Agents"]
    }
  ],
  "stories": [
    {
      "id": "story-id",
      "type": "news",
      "title": "Story title",
      "source": "Official source",
      "publishedAt": "2026-10-29T10:00:00.000Z",
      "url": "https://example.com/story",
      "summary": "A concise story summary.",
      "sources": [
        { "name": "Original source", "url": "https://example.com/story" }
      ]
    }
  ]
}
```

Or an array of items containing `type: "paper"` or `type: "news"`.

### Feedback contract

The frontend sends:

```json
{
  "itemId": "database-id-or-external-id",
  "action": "like",
  "profileId": "profile-id"
}
```

Supported actions from the UI: `like`, `dismiss`, `save`, and `unsave`. Align the field names and action vocabulary with your existing controller in `src/api.js` if needed.

## Notes

- If the API is unavailable or its feed route does not match, the UI stays usable in preview mode and shows a banner. It does not silently claim the data is live.
- Saved items and profile preferences are stored locally as a convenience. Server-side persistence should be wired to your backend's actual routes before production deployment.
- Demo content is intentionally illustrative. Replace it with live API data before presenting real-world content as current.
- No API keys or secrets belong in frontend environment variables. `VITE_*` values are exposed to the browser.
