# gradomski.dev

Static site for **gradomski.dev**, hosted on GitHub Pages. No build step — commit to the
default branch and it's live.

```
index.html              landing page (sqTile)
blog.html               post list
post.html               single post renderer (?slug=…)
contact.html            about, timeline, socials
privacy.html            site + newsletter privacy notice
posts/
  index.json            post manifest — metadata lives here (empty for now)
  <slug>.md             post bodies
assets/
  css/style.css         all styling + theme tokens
  js/site.js            header/footer, theme toggle, SITE config
  js/blog.js            post list
  js/post.js            single post (markdown + syntax highlighting)
  img/                  screenshots, covers, avatar (placeholders for now)
sqTile/privacy-policy.html
```

## Local preview

Markdown and JSON are loaded with `fetch()`, so `file://` won't work — serve the folder:

```bash
python3 -m http.server 4321
```

Then open <http://localhost:4321>.

## Adding a blog post

1. Write the body in `posts/my-post-slug.md` — plain Markdown, no frontmatter.
2. Add an entry at the top of the `posts` array in `posts/index.json`:

```json
{
  "slug": "my-post-slug",
  "title": "Post title",
  "date": "2026-08-04",
  "tag": "Release",
  "excerpt": "One or two sentences shown on the card and under the title.",
  "image": "assets/img/blog/my-cover.png"
}
```

`slug` must match the filename. `image` and `tag` are optional. Posts are sorted by `date`
automatically, so order in the file doesn't matter.

While the array is empty, `blog.html` shows an empty-state card instead of a list, so the
page is safe to keep in the nav before anything is published.

Fenced code blocks are highlighted by highlight.js — tag the language for best results:

    ```kotlin
    val count = items.size
    ```

## Editing the site

- **Links, socials, store URL, email** — the `SITE` object at the top of `assets/js/site.js`.
- **Nav items** — the `NAV` array in the same file.
- **Colours, spacing, type** — the token blocks at the top of `assets/css/style.css`
  (`:root[data-theme="dark"]` and `:root[data-theme="light"]`).
- **Backlog** — the `.backlog-item` blocks in `index.html`. Chip classes: `chip--done`
  (shipped), `chip--now` (in development), `chip--next` (up next), plain `chip` (exploring).
- **Target, features** — plain HTML sections in `index.html`, each marked with a comment.
- **Newsletter** — `renderNewsletter()` in `assets/js/site.js`, rendered into any page that
  has `<div id="newsletter-mount"></div>`. Currently on `index.html` and `blog.html`.

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

- Reviews — the section in `index.html` is commented out; it holds placeholder quotes.
  Swap in real Play Store reviews and remove the comment wrapper to bring it back.
- The closed-testing note under the hero buttons in `index.html`, once the Play Store
  listing is public.

## Theme

Dark by default. The choice is stored in `localStorage` under `theme` and applied by a small
inline script in each page's `<head>` so there's no flash on load.
