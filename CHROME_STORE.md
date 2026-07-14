# Chrome Web Store Release Guide — Archive v2.0.4

Complete step-by-step guide to publish **Archive — Personal Browsing Memory** on the Chrome Web Store.

**Architecture (v2.0.4):** Extension-only by default. All saves go to **IndexedDB** in the browser. No terminal, account, or server required. Optional Python backend for power users only.

---

## Blockers before you submit

| Blocker | Status | What to do |
|---------|--------|------------|
| **Chrome Web Store developer account** | Required | Pay **$5 one-time** at [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) |
| **Privacy policy URL (public HTTPS)** | Required | Host `PRIVACY.md` — see [Privacy policy hosting](#privacy-policy-hosting) |
| **Store icons (128×128)** | ✅ Present | `extension/icons/icon128.png` — consider upgrading to a polished brand icon before launch |
| **Screenshots (1–5)** | Required | Capture at **1280×800** (recommended) or **640×400** — see [Screenshot plan](#screenshot-plan-with-captions) |
| **Google account + 2FA** | Required | Developer account must use an account with 2-step verification enabled |
| **GitHub repo (optional but recommended)** | Recommended | For privacy policy URL, support link, and open-source credibility |

---

## Pre-launch checklist

### Product readiness

- [ ] Extension loads cleanly via **Load unpacked** from `extension/`
- [ ] Version in `manifest.json` is **2.0.4** (or your release version)
- [ ] `./scripts/package-extension.sh` produces `archive-extension.zip` without errors
- [ ] Passive capture works: pause on a LinkedIn post 2–3 seconds → green dot appears
- [ ] **Capture visible** saves the centered post and increments saved count in popup
- [ ] Search filters results (typing a word does **not** show every saved item)
- [ ] **Open original** works when a permalink was captured
- [ ] Tested on **Chrome** (not only Arc) — reviewers use Chrome
- [ ] No console errors on supported sites during normal use
- [ ] Uninstall/reinstall does not crash; fresh install shows 0 saved items

### Store assets

- [ ] **128×128** store icon uploaded (from `icons/icon128.png` or upgraded asset)
- [ ] **1–5 screenshots** at 1280×800 or 640×400
- [ ] **Privacy policy URL** live and publicly accessible
- [ ] **Support email or URL** ready (required field in dashboard)
- [ ] Listing copy pasted from [Store listing copy](#store-listing-copy-ready-to-paste) below
- [ ] **Notes for reviewer** pasted from [Notes for Chrome reviewer](#notes-for-chrome-reviewer) below

### Compliance

- [ ] Single purpose is clear: save and search content the user already viewed
- [ ] Permissions justification prepared (see [Permissions justification](#permissions-justification))
- [ ] Privacy policy matches actual behavior (IndexedDB primary; localhost optional)
- [ ] No remote code execution — all JS is bundled in the extension
- [ ] No obfuscated code beyond normal minification (you ship readable source — good)
- [ ] Data usage form completed accurately in dashboard (see [Data usage disclosure](#data-usage-disclosure))

---

## Step-by-step: publish on Chrome Web Store

### Step 1 — Register as a Chrome Web Store developer

1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Sign in with your Google account (enable **2-step verification** first if prompted)
3. Pay the **$5 one-time registration fee**
4. Accept the developer agreement
5. Complete your **developer profile** (name, email, website if you have one)

### Step 2 — Package the extension ZIP

From the project root:

```bash
cd ~/archive
./scripts/package-extension.sh
```

This creates **`archive-extension.zip`** containing only the `extension/` folder.

Verify contents:

```bash
unzip -l archive-extension.zip
```

You should see: `manifest.json`, `content.js`, `background.js`, `popup.html`, `icons/`, etc.  
Do **not** upload the whole repo or the `backend/` folder.

### Step 3 — Create a new item in the dashboard

1. Open [Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Click **New item**
3. Upload **`archive-extension.zip`**
4. Wait for upload + automated checks to finish
5. Fix any errors (missing icons, invalid manifest, etc.) and re-upload if needed

### Step 4 — Fill in the Store listing tab

Use the copy in [Store listing copy](#store-listing-copy-ready-to-paste) below.

| Field | Value |
|-------|-------|
| **Language** | English |
| **Title** | Archive — Personal Browsing Memory |
| **Summary** | Short description (132 chars max) — paste from below |
| **Description** | Detailed description — paste from below |
| **Category** | **Productivity** (primary) |
| **Language** | English (United States) |

Optional but recommended:

| Field | Suggestion |
|-------|------------|
| **Homepage URL** | Your GitHub repo or personal site |
| **Support URL / email** | GitHub Issues URL or `mailto:you@email.com` |

### Step 5 — Upload graphic assets

| Asset | Size | File / action |
|-------|------|---------------|
| **Store icon** | 128×128 PNG | `extension/icons/icon128.png` |
| **Screenshot 1–5** | 1280×800 or 640×400 | See [Screenshot plan](#screenshot-plan-with-captions) |
| **Small promo tile** (optional) | 440×280 | Brand mark + tagline: "Your private browsing memory" |
| **Marquee promo tile** (optional) | 1400×560 | Only if you plan featured placement — usually not needed for v1 |

**Screenshot tips:**
- Use Chrome on macOS/Windows at 1280×800 window size
- Hide personal info (names, DMs, email) or use demo accounts
- Crop to the browser chrome + extension popup for clarity

### Step 6 — Privacy practices tab

1. **Privacy policy URL** — paste your hosted `PRIVACY.md` URL (must be HTTPS)
2. **Single purpose description** — paste from [Single purpose statement](#single-purpose-statement) below
3. **Data usage** — see [Data usage disclosure](#data-usage-disclosure)
4. **Permissions justification** — paste from [Permissions justification](#permissions-justification) when prompted

Certify that:
- You do not sell user data
- Data is not used for unrelated purposes
- Users can request data deletion (uninstall + clear extension data)

### Step 7 — Privacy policy hosting

Chrome requires a **public HTTPS URL**. Options:

**Option A — GitHub (easiest if repo is public)**

1. Push `PRIVACY.md` to your repo
2. Use the GitHub Pages URL or the rendered blob URL:
   - Pages: `https://YOUR_USER.github.io/archive/PRIVACY.html` (convert MD to HTML or use a Pages generator)
   - Rendered: `https://github.com/YOUR_USER/archive/blob/main/PRIVACY.md` *(works but GitHub UI is less ideal)*

**Option B — GitHub Pages from repo**

```bash
# Add docs/PRIVACY.html or enable Pages on /docs
# URL: https://YOUR_USER.github.io/archive/
```

**Option C — Personal site**

Upload `PRIVACY.md` as a page on any HTTPS domain you control.

Replace `YOUR_USER` and `YOUR_EMAIL` in `PRIVACY.md` before publishing.

### Step 8 — Distribution tab

| Setting | Recommendation |
|---------|----------------|
| **Visibility** | Public |
| **Regions** | All regions (or restrict if you prefer) |
| **Pricing** | Free |

### Step 9 — Submit for review

1. Go to the **Package** tab — confirm version **2.0.4** uploaded
2. Open **Account** tab — confirm publisher name looks professional
3. Click **Submit for review**
4. In **Notes for certification** / **Notes to reviewer**, paste [Notes for Chrome reviewer](#notes-for-chrome-reviewer)
5. Submit

**Review timeline:** Usually 1–3 business days; can take up to 7 days. Complex permissions (host access to social sites) may trigger extra review.

### Step 10 — Post-approval

1. Confirm the listing is **Published** (not just approved)
2. Copy your store URL: `https://chromewebstore.google.com/detail/<extension-id>`
3. Share the link; add it to your README
4. Monitor **Reviews** and **Analytics** in the dashboard
5. Respond to user feedback within a few days

---

## Store listing copy (ready to paste)

### Title (45 chars max)

```
Archive — Personal Browsing Memory
```

### Short description (132 chars max)

```
Save posts you read on LinkedIn, Instagram, TikTok & Google. Search your private local memory later — no account or setup required.
```

*(131 characters)*

### Detailed description

```
Archive is your private memory layer for the web.

Browse LinkedIn, Instagram, TikTok, and Google Search like you normally do. Archive quietly saves content you spend time on — then lets you find it again with search.

✓ NO SETUP REQUIRED
Install and go. Everything is stored locally in your browser. No account, no cloud, no terminal.

✓ AUTOMATIC CAPTURE
Pause on a post for 2 seconds and Archive saves it. Or click "Capture visible" in the popup for instant save.

✓ SEARCH YOUR MEMORY
Find saved posts by keyword, author name, or platform:
• "LinkedIn post about AI agents"
• "sai" (matches author names)
• "TikTok coffee video"

✓ OPEN ORIGINAL
Jump back to the source post when a permalink was captured.

✓ PRIVACY FIRST
• All memories stored locally on your device (IndexedDB)
• No data sold to third parties
• No cloud account required
• Works offline after pages are captured

SUPPORTED SITES
• LinkedIn
• Instagram
• TikTok
• Google Search

OPTIONAL POWER-USER BACKEND
Advanced users can optionally run a local Python server to mirror saves to PostgreSQL. This is not required — the extension works fully on its own.

SINGLE PURPOSE
Archive helps you save and search content you have already viewed on supported websites for personal recall.
```

### Category

```
Productivity
```

### Language

```
English
```

### Single purpose statement

```
Archive helps users save and later search text content from posts and search results they have already viewed on LinkedIn, Instagram, TikTok, and Google — for personal recall only.
```

---

## Screenshot plan with captions

Capture **5 screenshots** at **1280×800**. Use Chrome (not Arc) for reviewer familiarity.

### Screenshot 1 — Popup search (hero shot)

**What to show:** Extension popup open with search query typed, 2–3 results with highlighted keywords, saved count visible (e.g. "12 saved").

**Store caption:**
```
Search everything you've read — keywords, author names, and platforms.
```

**Alt / subtitle (if field allows):**
```
Natural language search across your saved posts
```

---

### Screenshot 2 — Passive capture on LinkedIn

**What to show:** LinkedIn feed with one post showing the green save dot in the top-right corner of the post card.

**Store caption:**
```
Pause on any post for 2 seconds — Archive saves it automatically.
```

---

### Screenshot 3 — Capture visible button

**What to show:** LinkedIn feed with popup open, "Capture visible" button visible, status text showing "Saved new post" or similar.

**Store caption:**
```
Instant save with one click — Capture visible saves the post on screen.
```

---

### Screenshot 4 — Open original

**What to show:** Popup result card with "Open original" button enabled, or browser tab opening the LinkedIn permalink.

**Store caption:**
```
Jump back to the original post anytime a permalink was saved.
```

---

### Screenshot 5 — Privacy / local storage

**What to show:** Popup with Status clicked, showing "Local mode active" and saved count. Optional: Chrome `chrome://extensions` page showing Archive installed.

**Store caption:**
```
Private by default — all memories stay on your device. No cloud required.
```

---

## Promotional tile copy (optional)

### Small promo tile (440×280)

**Headline:**
```
Your private browsing memory
```

**Subtext (if space):**
```
Save & search posts locally
```

### Marquee tile (1400×560) — optional

**Headline:**
```
Never lose a post you actually read
```

**Subtext:**
```
Archive saves LinkedIn, Instagram, TikTok & Google content locally — then lets you search it later.
```

---

## Permissions justification

Paste these when the dashboard asks why each permission is needed.

| Permission | Justification |
|------------|---------------|
| **`tabs`** | Open the original post URL when the user clicks "Open original", and identify the active tab for manual capture. |
| **`scripting`** | Inject the content capture script into supported tabs that were opened before the extension was installed or updated. |
| **`host_permissions`: linkedin.com** | Read visible post text, author name, and permalink from LinkedIn pages the user is viewing — only for personal save/search. |
| **`host_permissions`: instagram.com** | Read visible post caption and author from Instagram pages the user is viewing. |
| **`host_permissions`: tiktok.com** | Read visible video description and creator from TikTok pages the user is viewing. |
| **`host_permissions`: google.com** | Read visible search result title and snippet from Google Search pages the user is viewing. |
| **`host_permissions`: localhost / 127.0.0.1** | Optional: mirror saves to a local Python backend if the user has chosen to run one on their own machine. Not required for core functionality. |

---

## Data usage disclosure

When filling out the **Privacy practices** / **Data use** form in the dashboard:

| Question | Answer |
|----------|--------|
| **Does your extension collect user data?** | Yes |
| **What data?** | User activity (post text the user viewed), website content (author names, URLs when visible) |
| **Is data sold?** | No |
| **Is data used for unrelated purposes?** | No |
| **Is data encrypted in transit?** | N/A for default mode (local only). Localhost mirror uses HTTP on user's machine only. |
| **Can users request deletion?** | Yes — uninstall extension and clear site data / extension storage |

**Data handling certification:** All collected data stays on the user's device in IndexedDB. No transmission to developer servers.

---

## Notes for Chrome reviewer

Paste this in **Notes for certification** / **Notes to reviewer**:

```
Archive — Personal Browsing Memory (v2.0.4)

NO BACKEND REQUIRED. The extension works fully standalone after install.

Quick test (2 minutes):
1. Install the extension from this package.
2. Open https://www.linkedin.com/feed/ (log in with any LinkedIn account).
3. Scroll the feed and pause on one post for 2–3 seconds.
4. A green dot should appear on the saved post (top-right of post card).
5. Click the Archive toolbar icon to open the popup.
6. Confirm the saved count increased (e.g. "1 saved").
7. Type a keyword from that post in the search box — it should appear in results.
8. Optional: click "Capture visible" with a post centered on screen for manual save.

Supported sites: LinkedIn, Instagram, TikTok, Google Search.

Data storage: All saves go to IndexedDB in the browser (local-only). No cloud, no account, no external server required.

Optional localhost permission: If a user runs an optional local Python backend on their own machine (127.0.0.1:8000), the extension may mirror saves there. This is best-effort and not required for any functionality. Reviewers do not need to run the backend.

Single purpose: Save and search content the user has already viewed on supported sites for personal recall.

No remote code. All JavaScript is bundled in the extension package.
```

---

## Common rejection reasons and how to avoid them

| Rejection reason | How to avoid |
|------------------|--------------|
| **Unclear single purpose** | Listing and reviewer notes must say: save + search content user already viewed. Do not mention unrelated features. |
| **Excessive permissions** | Justify each host permission in the form. Emphasize localhost is optional. |
| **Missing / broken privacy policy** | URL must be public HTTPS and match actual behavior (IndexedDB, not cloud). |
| **Extension doesn't work for reviewer** | Reviewer notes must be step-by-step. Test on fresh Chrome profile before submit. |
| **Misleading description** | Do not claim "syncs across devices" or "cloud backup" — it's local-only by default. |
| **Minimum functionality** | Ensure search + save both work without backend. Capture at least one platform reliably (LinkedIn). |
| **Obfuscated code** | Ship readable source (current codebase is fine). |
| **Scraping / ToS concerns** | Frame as personal memory of content the user already chose to view; no bulk scraping, no automation of actions. |
| **Broken icons or manifest** | Run `./scripts/package-extension.sh` and test Load unpacked before upload. |

---

## Post-launch: shipping updates

### Version bump workflow

1. Fix or add features in `extension/`
2. Bump version in `extension/manifest.json` (e.g. `2.0.4` → `2.0.5`)
3. Test with **Load unpacked**
4. Run `./scripts/package-extension.sh`
5. Developer Dashboard → your item → **Package** → **Upload new package**
6. Update **Store listing** if behavior changed materially
7. Update `PRIVACY.md` **Last updated** date if privacy practices changed
8. **Submit for review** again (updates also go through review)

### Changelog tips for store updates

In the dashboard "What's new" field:

```
v2.0.5 — Improved LinkedIn post detection, faster search filtering, bug fixes.
```

Keep it user-facing; no internal jargon.

---

## Quick reference — files in this repo

| File | Purpose |
|------|---------|
| `extension/manifest.json` | Version, permissions, content scripts |
| `extension/icons/` | 16, 48, 128 px icons for Chrome |
| `scripts/package-extension.sh` | Builds `archive-extension.zip` |
| `PRIVACY.md` | Privacy policy — host publicly for store URL |
| `README.md` | User-facing install and usage docs |
| `backend/` | Optional — do **not** include in store ZIP |

---

## Copy-paste quick sheet

**Title:** Archive — Personal Browsing Memory

**Short:** Save posts you read on LinkedIn, Instagram, TikTok & Google. Search your private local memory later — no account or setup required.

**Category:** Productivity

**Privacy policy:** Host `PRIVACY.md` at a public HTTPS URL before submitting.

**Package command:**
```bash
cd ~/archive && ./scripts/package-extension.sh
```

**Upload:** `archive-extension.zip` → [Developer Dashboard](https://chrome.google.com/webstore/devconsole) → New item

**Reviewer note headline:** No backend required — works standalone after install.

---

Built for the curious. Ship it. 🚀
