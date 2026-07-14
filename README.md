# Archive — Personal Browsing Memory

Archive passively saves content you spend time on across LinkedIn, Instagram, TikTok, and Google Search, then lets you search it with natural language.

## Extension-only mode (v2.0)

**No terminal required.** Install the extension and it works immediately:

1. Load `extension/` in Chrome or Arc (`chrome://extensions` → Load unpacked)
2. Browse LinkedIn, Instagram, TikTok, or Google
3. Pause on posts for 2 seconds, or click **Capture visible**
4. Search from the popup

All memories are stored locally in your browser (IndexedDB). Private, fast, offline-capable.

## Optional backend (power users)

For PostgreSQL storage, larger archives, or OpenAI embeddings:

```bash
cd ~/archive
./scripts/setup.sh
./scripts/start.sh
```

When the backend is running, the extension mirrors saves automatically. Search always uses fast local storage.

## Search tips

- `LinkedIn post about AI agents`
- `sai` (matches author names)
- `TikTok coffee video`

## Chrome Web Store

```bash
./scripts/package-extension.sh
```

See `CHROME_STORE.md` and `PRIVACY.md`.

Built for the curious. Archive everything.
