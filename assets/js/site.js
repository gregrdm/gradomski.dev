/* ============================================================
   Shared behaviour: theme toggle, mobile nav, newsletter form.

   The header, nav and footer are plain HTML in every page — not
   rendered from here. They used to be, and the cost was that a
   crawler which does not run JavaScript (ClaudeBot, GPTBot and
   PerplexityBot do not) saw a site with no navigation and no
   internal links at all. Markup that matters ships as markup.

   SITE below is still the single source for the values used in
   forms and scripts. When you change storeUrl, email or a social
   link here, update the copies in the page HTML too — grep for
   the old value; there are six pages.
   ============================================================ */

const SITE = {
  name: "gradomski",
  tld: ".dev",
  author: "Grzegorz Radomski",
  company: "Grzegorz Radomski TECH",
  email: "contact@gradomski.dev",
  // Live listing, public since 2 August 2026 (1.3.4 was the first build on the
  // production channel).
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
  // Mirrored in the .social list on contact.html and in the Person JSON-LD there.
  socials: [
    { id: "github",   label: "GitHub",   handle: "@gregrdm",           url: "https://github.com/gregrdm" },
    { id: "linkedin", label: "LinkedIn", handle: "Grzegorz Radomski",  url: "https://www.linkedin.com/in/grzegorz-radomski/" },
    { id: "mail",     label: "Email",    handle: "contact@gradomski.dev", url: "mailto:contact@gradomski.dev" }
  ]
};

/* ---------- Theme ---------- */

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem("theme", theme); } catch (e) { /* private mode */ }
}

function toggleTheme() {
  setTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light");
}

/*
  Newsletter block — mount it on any page with <div id="newsletter-mount"></div>.
  Wire it up by filling in SITE.newsletter above; nothing else needs to change.

  This one stays in JavaScript on purpose: it is a form, not content a reader
  needs, and keeping it here keeps the provider wiring in one place. The relative
  links inside assume a page at the site root — index.html and blog.html today.

  The form submits with fetch() and reports the result in place. MailerLite's
  endpoint sends CORS headers, so the JSON response is readable and the visitor
  never leaves the page. `action` and `method` are still set on the form so that
  it degrades to a normal POST if JavaScript is unavailable.
*/
function renderNewsletter() {
  const { action, field } = SITE.newsletter;
  const formAttrs = action ? ` action="${action}" method="post" target="_blank"` : "";
  return `
<section class="section section--alt newsletter" id="newsletter" aria-labelledby="newsletter-title">
  <div class="wrap wrap--narrow">
    <div class="section-head">
      <span class="eyebrow">Newsletter</span>
      <h2 id="newsletter-title">Release notes, in your inbox.</h2>
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
  placeholder div would otherwise sit in the flow as an extra element between
  sections.
*/
function mount(id, html) {
  const slot = document.getElementById(id);
  if (!slot) return;
  slot.innerHTML = html;
  slot.replaceWith(...slot.childNodes);
}

function initChrome() {
  mount("newsletter-mount", renderNewsletter());
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

document.addEventListener("DOMContentLoaded", initChrome);
