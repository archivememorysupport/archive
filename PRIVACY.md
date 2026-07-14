# Archive Privacy Policy

**Last updated:** July 2026

Archive is a local-first browsing memory tool. Your data stays on your machine.

## What we collect

Archive saves text you explicitly view on supported websites (LinkedIn, Instagram, TikTok, Google Search), including:

- Post or result text
- Author name (when visible on the page)
- Permalink URL (when available)
- Platform name and capture timestamp

## Where data is stored

- **Browser extension (default):** all memories stored in **IndexedDB** on your device. No server required.
- **Optional local backend:** if you run the Python server, saves are mirrored to your local PostgreSQL database.
- **No cloud storage** is used by default.

## What we do not collect

- Passwords or credentials
- Private messages
- Payment information
- Browsing history outside supported platforms
- Data from sites not listed in the extension permissions

## Optional OpenAI usage

If you enable `USE_OPENAI=true` and provide an `OPENAI_API_KEY`, search text may be sent to OpenAI to generate embeddings. This is **opt-in only** and disabled by default.

## Third parties

Archive does not sell or share your data. The extension communicates only with:

1. Supported content pages (read-only DOM extraction on sites you visit)
2. Your browser's local IndexedDB storage (default — no network)
3. Your optional local Archive backend (`http://127.0.0.1:8000`) — only if you choose to run it
4. OpenAI (optional, only if you enable it in a self-hosted backend)

## Data control

You control your data entirely:

- **Extension-only (default):** uninstall Archive, or clear extension/site data in Chrome settings (`chrome://settings/content/all` → search for extension data)
- **Optional backend:** delete the PostgreSQL `archive` database to remove mirrored copies
- Uninstall the extension to stop new captures
- Stop the optional backend server to pause mirroring

## Chrome Web Store

Archive is distributed via the Chrome Web Store. The store listing describes what data the extension accesses. This policy applies to the extension whether installed from the store or loaded unpacked for development.

## Contact

For privacy questions, contact: **archivememory.support@gmail.com**

Or open an issue on the GitHub repository listed on the store page.

## Changes

We may update this policy as the product evolves. Material changes will be reflected in the store listing and repository.
