# gradomski.dev

Static site for **gradomski.dev**, hosted on GitHub Pages. No build step — commit to the
default branch and it's live.

```
index.html              landing page (sqTile)
blog.html               post list — written by hand, newest first
post.html               redirect shim for old ?slug= links; not indexed
contact.html            about, timeline, socials
privacy.html            site + newsletter privacy notice
robots.txt              open to every crawler; points at the sitemap
sitemap.xml             the five indexable URLs
llms.txt                plain-text index of the site, for AI readers
llms-full.txt           the whole site as one plain-text document
posts/
  <slug>.html           the post as a page
  <slug>.md             the same post as Markdown — what llms.txt links to
assets/
  css/style.css         all styling + theme tokens
  js/site.js            SITE config, theme toggle, mobile nav, newsletter form
  img/screens/          landing-page shots, copied from sqTile/docs/store-screenshots/
  img/blog/             post covers
  img/                  favicon, og cover, avatar
sqTile/privacy-policy.html
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
- **No third-party requests.** The Markdown renderer and syntax highlighter that used to
  load from jsDelivr are gone with the client-side post rendering. `privacy.html` says so;
  if you ever add an embed or a web font, that section stops being true.

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

## Editing the site

- **Store URL, email, newsletter endpoint** — the `SITE` object at the top of
  `assets/js/site.js`, and the copies in each page's markup.
- **Nav items** — the `<nav class="nav-links">` block in each of the six pages.
- **Colours, spacing, type** — the token blocks at the top of `assets/css/style.css`
  (`:root[data-theme="dark"]` and `:root[data-theme="light"]`).
- **Backlog** — the `.backlog-item` blocks in `index.html`. Chip classes: `chip--done`
  (shipped), `chip--now` (in development), `chip--next` (up next), plain `chip` (exploring).
  Shipped items use the version they landed in as the chip label (`1.4.0`) rather than the
  word "shipped" — it dates the item and shows the release cadence. Keep it in sync with
  `sqTile/docs/to_release_*.md`, which is the source of truth for what each version did.
  The backlog is also summarised in `llms-full.txt`.
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
- **`og:image` is an SVG.** LinkedIn, X and Facebook do not render SVG in a preview card,
  so the card comes up blank on all three. Export `assets/img/og-cover.svg` to a 1200×630
  PNG and point the `og:image` tags at it.

## Theme

Dark by default. The choice is stored in `localStorage` under `theme` and applied by a small
inline script in each page's `<head>` so there's no flash on load.
