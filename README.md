# gradomski.dev

Static site for **gradomski.dev**, hosted on GitHub Pages. No build step — commit to the
default branch and it's live.

```
index.html              landing page (sqTile)
blog.html               post list — written by hand, newest first
algolearn/
  index.html            AlgoLearn episode list — by hand, newest first
  <slug>.html           one episode, as exported, plus a few added lines
post.html               redirect shim for old ?slug= links; not indexed
contact.html            about, timeline, socials
privacy.html            site + newsletter privacy notice
robots.txt              open to every crawler; points at the sitemap
sitemap.xml             the five indexable URLs
llms.txt                plain-text index of the site, for AI readers
llms-full.txt           the whole site as one plain-text document
app-ads.txt             AdMob seller declaration — one line, must stay at the root
posts/
  <slug>.html           the post as a page
  <slug>.md             the same post as Markdown — what llms.txt links to
assets/
  css/style.css         all styling + theme tokens
  css/policy.css        the app privacy policies' own small stylesheet
  js/site.js            SITE config, theme toggle, mobile nav, newsletter form
  js/analytics.js       GoatCounter loader — AlgoLearn pages only
  img/screens/          landing-page shots, copied from sqTile/docs/store-screenshots/
  img/blog/             post covers
  img/                  favicon, og cover, avatar
sqTile/privacy-policy.html          sqTile app privacy policy
kaucja-rush/privacy-policy.html     Kaucja Rush privacy policy (EN)
kaucja-rush/privacy-policy-pl.html  the same in Polish — keep the two in step
```

## Local preview

```bash
python3 -m http.server 4321
```

Then open <http://localhost:4321>. Everything is plain files now, so `file://` mostly
works too — but the absolute `/llms.txt` links in each `<head>` only resolve over HTTP.

## Written for humans and for robots

Every page is complete in its HTML. That is a constraint, not a nicety: ClaudeBot, GPTBot
and PerplexityBot do not execute JavaScript, so anything a script writes into the page is
invisible to them. This site used to render its header, nav, footer, post list and post
bodies at runtime, which meant an AI reader crawling gradomski.dev found one page with no
links on it.

So:

- **The header and footer are markup, in all six pages.** They are duplicated by hand.
  `assets/js/site.js` no longer renders them — it only wires up the theme toggle, the
  mobile menu and the newsletter form. When you change a nav item or the store URL, change
  it in every page (`grep` for the old value) and in the `SITE` object.
- **The socials on `contact.html` are markup**, and repeated as `sameAs` in the `Person`
  JSON-LD in that page's head. Three places, keep them in step.
- **Every page carries** a unique `<title>` and `<meta name="description">`, a
  `rel=canonical`, Open Graph and Twitter tags, and a JSON-LD block — `SoftwareApplication`
  on the landing page, `ProfilePage`/`Person` on contact, `Blog` on the list,
  `BlogPosting` on a post.
- **`llms.txt` links to the `.md` of each post, not the `.html`.** That is the point of the
  format: send the reader to clean text. It is why the Markdown sources are still here.
- **No third-party requests — except on AlgoLearn.** The Markdown renderer and syntax
  highlighter that used to load from jsDelivr are gone with the client-side post
  rendering. The one exception is the visit counter on the AlgoLearn pages (below).
  `privacy.html` says exactly that; if you ever add an embed, a web font, or the counter
  to another page, update it.

## The social preview image

`assets/img/og-cover.png` (1200×630) is what `og:image` points at. It is **generated from
`assets/img/og-cover.svg`**, which stays in the repo as the source — edit the SVG, then
re-render.

It has to be a raster. LinkedIn, X and Facebook do not render SVG in a preview card, so
pointing `og:image` at the `.svg` gets you a blank card on all three.

To re-render after editing the SVG, with Chromium and Node:

```bash
npm i playwright
node -e '
const { chromium } = require("playwright");
const svg = require("fs").readFileSync("assets/img/og-cover.svg", "utf8")
  .replace(/system-ui,sans-serif/g, "Liberation Sans, Arial, Helvetica, sans-serif");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await p.setContent(`<style>html,body{margin:0}svg{display:block}</style>${svg}`);
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: "assets/img/og-cover.png" });
  await b.close();
})();'
```

The font substitution matters: the SVG asks for `system-ui`, which is right in a browser
but resolves to whatever the rendering machine happens to have. Pinning it to an
Arial-metric face keeps the PNG looking like the site's own fallback rather than like the
build box.

Each page also declares `og:image:width`, `og:image:height`, `og:image:type` and
`og:image:alt`. The dimensions let a scraper reserve the right space before it has fetched
the file; keep them true if you change an image.

The copyright year in the footer is hardcoded (`© 2026`) since the footer is no longer
generated. Six files to bump each January.

## Adding a blog post

1. **Write the body** in `posts/my-post-slug.md` — plain Markdown, no frontmatter. Use
   absolute `https://www.gradomski.dev/...` URLs for images and internal links, so the file
   stands on its own when an AI reader fetches it directly.
2. **Copy an existing post page** — `posts/four-releases-what-you-asked-for.html` is the
   template. Update the head block (title, description, OG tags, canonical, the
   `BlogPosting` JSON-LD), the `.post-header`, and the `.prose` body. Asset paths are one
   level up (`../assets/…`).
3. **Add a card to `blog.html`**, newest first, inside `.post-list`.
4. **Register the URL** in `sitemap.xml`, in the `## Writing` section of `llms.txt`, and in
   `llms-full.txt` (the site sections at the top of that file are hand-written; the post
   bodies below are the `.md` files pasted in).

The `.md` and the `.html` are two views of one post — edit both, or they drift.

There is no syntax highlighter any more. A code block is a hand-written
`<pre><code>…</code></pre>`; it gets the mono font and the code background, but no token
colours. The `.hljs-*` rules are still in the stylesheet if you ever want to bring one
back.

**If this gets tedious** — say, more than a post a month — the answer is a small Node
script that generates `posts/*.html`, the `blog.html` cards, `sitemap.xml` and
`llms-full.txt` from the Markdown on push. Worth doing then; not worth a build step and a
CI workflow for one post a fortnight.

## Adding an AlgoLearn episode

An episode is a self-contained `.html` file (everything inline, nothing loaded from
anywhere) that draws itself with JavaScript. It goes in as exported, plus a few lines.

1. **Copy it to `algolearn/<slug>.html`** — English slug, e.g. `quicksort.html`.
2. **Add three tags just before `</head>`**, all on the end of the line the export
   puts them on:
   ```html
   <link rel="canonical" href="https://www.gradomski.dev/algolearn/<slug>.html"><link rel="icon" href="../assets/img/favicon.svg"><script src="../assets/js/analytics.js" defer></script>
   ```
   The canonical matters for the counter too: GoatCounter records that path, so
   `/algolearn/quicksort` and `/algolearn/quicksort.html` count as one page.
3. **Add the back bar right after `<body>`** — copy the `<!-- gradomski.dev … -->`
   comment, `<style>`, `<nav class="gd-back">` and `<noscript>` block from
   `algolearn/bubble-sort.html`, and put the new episode's description in the
   `<noscript>`. The bar takes its font and colours from the episode's own CSS
   variables and hides itself in video mode (`body[data-video]`).
4. **Add a card to `algolearn/index.html`**, newest first, and an entry in its
   `hasPart` JSON-LD.
5. **Register the URL** in `sitemap.xml`, in the `## AlgoLearn` section of `llms.txt`,
   and in the `# AlgoLearn` section of `llms-full.txt`. The episode itself is
   invisible to a crawler that runs no JavaScript, so those descriptions are all an AI
   reader gets — write them as the actual takeaway, not a teaser.

## Visit counter (AlgoLearn)

[GoatCounter](https://www.goatcounter.com) — no cookies, no profile, so no consent
banner. It is loaded by `assets/js/analytics.js`, which only the AlgoLearn pages
include. To switch it on:

1. Sign up at goatcounter.com and pick a site code — the `xxx` in `xxx.goatcounter.com`.
2. Put that code in `GOATCOUNTER_CODE` at the top of `assets/js/analytics.js` and push.
3. Open <https://xxx.goatcounter.com> for the dashboard: views per page, referrers,
   browsers, countries.

While the code is empty nothing loads. `count.js` ignores `localhost` and `file://`, so
local previews never count.

## Editing the site

- **Store URL, email, newsletter endpoint** — the `SITE` object at the top of
  `assets/js/site.js`, and the copies in each page's markup.
- **Nav items** — the `<nav class="nav-links">` block in every page that has one: the
  four at the root, each post in `posts/`, and `algolearn/index.html`.
- **Colours, spacing, type** — the token blocks at the top of `assets/css/style.css`
  (`:root[data-theme="dark"]` and `:root[data-theme="light"]`).
- **Backlog** — the `.releases` block in `index.html`. It is one vertical line, newest
  first: a shipped node is a single version (`.rel-item`, an `<h3 class="rel-ver">` holding
  the number, a `<time class="rel-date">`, and `.rel-read` linking to that version's post),
  and its bullets are what that version changed. Planned work is three nodes carrying
  `.rel-item--planned` — In development, Up next, Exploring — which get a hollow marker and
  a dashed line. Status is the heading text, never the colour on its own.
  **Keep only the last five releases here** and let the changelog hold the rest, or the
  line grows by a node every fortnight; `.rel-item--fold` is the muted node that closes the
  shipped run and points at `blog.html`. Keep it all in sync with
  `sqTile/docs/to_release_*.md`, which is the source of truth for what each version did.
  The backlog is also summarised in `llms-full.txt`.

  Note `.releases` is not `.timeline` — that one is the career timeline on `contact.html`,
  and reusing the name silently restyles both.
- **Target, features** — plain HTML sections in `index.html`, each marked with a comment.
- **Newsletter** — `renderNewsletter()` in `assets/js/site.js`, rendered into any page that
  has `<div id="newsletter-mount"></div>`. Currently on `index.html` and `blog.html`. Its
  links assume a page at the site root.

## Connecting the newsletter

The form posts directly to the provider — no backend, no JS to break. Two values in the
`SITE.newsletter` object in `assets/js/site.js` switch it on:

```js
newsletter: {
  action: "https://…",     // the form's POST endpoint, from the provider's embed code
  field: "fields[email]"   // MailerLite: fields[email] — Buttondown: email
}
```

To find `action`: create an embedded/inline form in the provider's dashboard, copy the
embed snippet, and take the `action="…"` attribute off its `<form>` tag. Ignore the rest of
the snippet — the markup and styling here already match the site.

While `action` is empty the form shows a "not connected yet" message instead of submitting,
so it is safe to ship either way.

The form submits with `fetch()` and shows the result in place — MailerLite's endpoint sends
CORS headers, so its JSON reply (`{"success":true}`, or `errors.fields.email` on failure)
is readable and the visitor never leaves the page. `action`/`method` stay on the `<form>`
so it still degrades to a plain POST without JavaScript.

Double opt-in is enabled on the MailerLite form — the consent checkbox here is only a gate,
and the record that stands up under GDPR is the subscriber clicking the confirmation link.
The success message ("check your inbox and confirm") depends on it staying on.

Collecting email addresses makes you a data controller for that list — `privacy.html`
covers the site and the newsletter, and the consent checkbox links to it. Keep the two in
sync if you change provider.

## Still to replace

- **Reviews** — the section in `index.html` is commented out; it holds placeholder quotes.
  Swap in real Play Store reviews and remove the comment wrapper to bring it back.

## Theme

Dark by default. The choice is stored in `localStorage` under `theme` and applied by a small
inline script in each page's `<head>` so there's no flash on load.
