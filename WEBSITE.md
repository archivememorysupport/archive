# Archive website (GitHub Pages)

Static landing site in `docs/` — home, email signup, and privacy policy.

## Live URLs (after setup)

| Page | Path |
|------|------|
| Home | `/` |
| Email signup | `/email/` |
| Privacy | `/privacy/` |

With custom domain `getarchive.dev`:

- `https://getarchive.dev`
- `https://getarchive.dev/email`
- `https://getarchive.dev/privacy`

---

## Step 1 — Enable GitHub Pages

1. Open https://github.com/archivememorysupport/archive/settings/pages
2. **Source:** Deploy from a branch
3. **Branch:** `main` → folder **`/docs`**
4. Save — site goes live at:
   ```
   https://archivememorysupport.github.io/archive/
   ```

---

## Step 2 — Custom `.dev` domain (optional)

1. Buy a domain (e.g. `getarchive.dev`) at Cloudflare / Namecheap
2. Add DNS records:
   - **A** `@` → GitHub Pages IPs (see GitHub docs)  
   - **CNAME** `www` → `archivememorysupport.github.io`
3. In GitHub Pages settings → **Custom domain** → enter `getarchive.dev`
4. Uncomment and set in `docs/CNAME`:
   ```
   getarchive.dev
   ```
5. Enable **Enforce HTTPS**

---

## Step 3 — Configure site.js

Edit `docs/assets/site.js`:

```javascript
window.ARCHIVE_SITE = {
  chromeStoreUrl: "https://chrome.google.com/webstore/detail/YOUR_ID",
  buttondownUsername: "your-buttondown-username",
  formspreeId: "", // optional fallback
  supportEmail: "archivememory.support@gmail.com",
  githubUrl: "https://github.com/archivememorysupport/archive",
};
```

---

## Step 4 — Email signup (Buttondown — recommended)

1. Create free account at https://buttondown.com
2. Create newsletter (e.g. "Archive Updates")
3. Copy your username from the dashboard URL
4. Paste into `buttondownUsername` in `site.js`
5. Push to GitHub — `/email` form starts working

Subscribers get a confirmation email from Buttondown. You send updates from their dashboard.

**Alternative:** Formspree (https://formspree.io) — set `formspreeId` instead; forwards name + email to your inbox.

---

## Step 5 — Chrome Web Store links

After extension approval:

1. Paste store URL into `chromeStoreUrl` in `site.js`
2. Use `https://getarchive.dev/privacy` as privacy policy URL in the store dashboard (replace GitHub link)
3. Instagram bio → `getarchive.dev` or `getarchive.dev/email`

---

## Local preview

```bash
cd docs
python3 -m http.server 8080
```

Open http://localhost:8080

---

## Deploy

Any push to `main` that changes `docs/` auto-deploys via GitHub Pages (1–2 min).

```bash
git add docs WEBSITE.md
git commit -m "Add Archive marketing site for GitHub Pages"
git push origin main
```
