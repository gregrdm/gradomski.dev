/* ============================================================
   Shared chrome: header, footer, theme toggle, mobile nav.
   Edit SITE below — it is the single source for links used
   across every page.
   ============================================================ */

const SITE = {
  name: "gradomski",
  tld: ".dev",
  author: "Grzegorz Radomski",
  company: "Grzegorz Radomski TECH",
  email: "contact@gradomski.dev",
  // Live listing. In closed testing until roughly early August 2026 — until then the
  // page only opens for registered testers.
  storeUrl: "https://play.google.com/store/apps/details?id=dev.gradomski.sqtilelauncher",
  storeLabel: "Get sqTile",
  // Newsletter: paste the form's POST endpoint from your provider here and the form
  // starts working. Leave `action` empty and it falls back to a "not connected yet"
  // message. `field` is the name the provider expects for the email input:
  //   MailerLite  → "fields[email]"
  //   Buttondown  → "email"
  newsletter: {
    action: "https://assets.mailerlite.com/jsonp/2525700/forms/193694051445245785/subscribe",
    field: "fields[email]"
  },
  socials: [
    { id: "github",   label: "GitHub",   handle: "@gregrdm",           url: "https://github.com/gregrdm" },
    { id: "linkedin", label: "LinkedIn", handle: "Grzegorz Radomski",  url: "https://www.linkedin.com/in/grzegorz-radomski/" },
    { id: "mail",     label: "Email",    handle: "contact@gradomski.dev", url: "mailto:contact@gradomski.dev" }
  ]
};

const NAV = [
  { label: "Project",   href: "index.html#project" },
  { label: "Backlog",   href: "index.html#backlog" },
  { label: "Blog",      href: "blog.html" },
  { label: "About",     href: "contact.html" },
  { label: "Subscribe", href: "index.html#newsletter" }
];

/* ---------- Theme ---------- */

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem("theme", theme); } catch (e) { /* private mode */ }
}

function toggleTheme() {
  setTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light");
}

/* ---------- Chrome ---------- */

const ICONS = {
  sun: '<svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon: '<svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>'
};

function renderHeader() {
  const page = document.body.dataset.page || "";
  const links = NAV.map(item => {
    const target = item.href.split("#")[0];
    const current = target === `${page}.html` && !item.href.includes("#") ? ' aria-current="page"' : "";
    return `<a href="${item.href}"${current}>${item.label}</a>`;
  }).join("");

  return `
<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap nav">
    <a class="brand" href="index.html">${SITE.name}<span>${SITE.tld}</span></a>
    <nav class="nav-links" id="nav-links">
      ${links}
      <a class="btn btn--primary" href="${SITE.storeUrl}" rel="noopener">${SITE.storeLabel}</a>
    </nav>
    <div class="nav-actions">
      <button class="icon-btn" id="theme-toggle" type="button" aria-label="Toggle colour theme">${ICONS.sun}${ICONS.moon}</button>
      <button class="icon-btn nav-toggle" id="nav-toggle" type="button" aria-label="Toggle menu" aria-expanded="false">${ICONS.menu}</button>
    </div>
  </div>
</header>`;
}

function renderFooter() {
  const year = new Date().getFullYear();
  return `
<footer class="site-footer">
  <div class="wrap footer-inner">
    <div>© ${year} ${SITE.company}. Built and shipped from Poland.</div>
    <div class="footer-links">
      <a href="blog.html">Blog</a>
      <a href="contact.html">About</a>
      <a href="privacy.html">Privacy</a>
      <a href="mailto:${SITE.email}">${SITE.email}</a>
    </div>
  </div>
</footer>`;
}

/*
  Newsletter block — mount it on any page with <div id="newsletter-mount"></div>.
  Wire it up by filling in SITE.newsletter above; nothing else needs to change.

  The form submits with fetch() and reports the result in place. MailerLite's
  endpoint sends CORS headers, so the JSON response is readable and the visitor
  never leaves the page. `action` and `method` are still set on the form so that
  it degrades to a normal POST if JavaScript is unavailable.
*/
function renderNewsletter() {
  const { action, field } = SITE.newsletter;
  const formAttrs = action ? ` action="${action}" method="post" target="_blank"` : "";
  return `
<section class="section section--alt newsletter" id="newsletter">
  <div class="wrap wrap--narrow">
    <div class="section-head">
      <span class="eyebrow">Newsletter</span>
      <h2>Release notes, in your inbox.</h2>
      <p>
        A short email when something ships — what changed, what's next. No more than
        once or twice a month, and unsubscribe in one click.
      </p>
    </div>
    <form class="newsletter-form" id="newsletter-form"${formAttrs}>
      <div class="newsletter-row">
        <label for="newsletter-email" hidden>Email address</label>
        <input type="email" id="newsletter-email" name="${field}" placeholder="you@example.com" required autocomplete="email">
        <button class="btn btn--primary" type="submit">Subscribe</button>
      </div>
      <label class="consent" for="newsletter-consent">
        <input type="checkbox" id="newsletter-consent" required>
        <span>
          I agree to receive sqTile release notes by email from ${SITE.company}, and I have
          read the <a href="privacy.html">privacy notice</a>. You can unsubscribe from any
          email in one click.
        </span>
      </label>
    </form>
    <p class="form-note" id="newsletter-note">No spam, no sharing. Just sqTile updates.</p>
  </div>
</section>`;
}

/*
  MailerLite answers with {success:true} or
  {success:false, errors:{fields:{email:["…"]}}} — dig out the first message.
*/
function firstError(data) {
  const fields = data?.errors?.fields;
  const first = fields && Object.values(fields)[0];
  return (Array.isArray(first) ? first[0] : first) || "Something went wrong.";
}

function initNewsletterForm() {
  const form = document.getElementById("newsletter-form");
  if (!form) return;

  const note = document.getElementById("newsletter-note");
  const button = form.querySelector("button");
  const { action, field } = SITE.newsletter;

  const say = (text, kind = "") => {
    note.className = "form-note" + (kind ? ` form-note--${kind}` : "");
    note.textContent = text;
  };

  if (!action) {
    form.addEventListener("submit", e => {
      e.preventDefault();
      say(`Newsletter isn't connected yet — email ${SITE.email} and I'll add you manually.`);
    });
    return;
  }

  form.addEventListener("submit", async e => {
    e.preventDefault();
    button.disabled = true;
    say("Signing you up…");

    try {
      const res = await fetch(action, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ [field]: form.elements[field].value.trim() })
      });
      const data = await res.json();
      if (!data.success) throw new Error(firstError(data));

      form.hidden = true;
      say("Almost there — check your inbox and confirm the subscription.", "ok");
    } catch (err) {
      say(`${err.message} You can also email ${SITE.email} and I'll add you manually.`, "error");
      button.disabled = false;
    }
  });
}

/*
  Render `html` into the placeholder with this id, then unwrap it — the
  placeholder div would otherwise be the containing block for the sticky
  header, and since it is exactly as tall as the header, sticky would have
  nowhere to travel and the bar would scroll away.
*/
function mount(id, html) {
  const slot = document.getElementById(id);
  if (!slot) return;
  slot.innerHTML = html;
  slot.replaceWith(...slot.childNodes);
}

function mountChrome() {
  mount("site-header", renderHeader());
  mount("newsletter-mount", renderNewsletter());
  mount("site-footer", renderFooter());

  initNewsletterForm();

  document.getElementById("theme-toggle")?.addEventListener("click", toggleTheme);

  const navToggle = document.getElementById("nav-toggle");
  const navLinks = document.getElementById("nav-links");
  navToggle?.addEventListener("click", () => {
    const open = navLinks.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(open));
  });
  navLinks?.addEventListener("click", e => {
    if (e.target.tagName === "A") navLinks.classList.remove("open");
  });
}

/* ---------- Helpers shared with blog pages ---------- */

function formatDate(iso) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric"
  });
}

async function loadPosts() {
  const res = await fetch("posts/index.json", { cache: "no-cache" });
  if (!res.ok) throw new Error(`Cannot load posts/index.json (${res.status})`);
  const data = await res.json();
  return data.posts.slice().sort((a, b) => b.date.localeCompare(a.date));
}

document.addEventListener("DOMContentLoaded", mountChrome);
