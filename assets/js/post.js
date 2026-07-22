/* Renders a single post: metadata from posts/index.json, body from posts/<slug>.md */

(async function renderPost() {
  const header = document.getElementById("post-header");
  const body = document.getElementById("post-body");
  const slug = new URLSearchParams(location.search).get("slug");

  if (!slug) {
    header.innerHTML = '<p class="error">No post selected. <a href="blog.html">Back to all posts</a>.</p>';
    return;
  }

  try {
    const posts = await loadPosts();
    const post = posts.find(p => p.slug === slug);
    if (!post) throw new Error(`Unknown post "${slug}"`);

    const res = await fetch(`posts/${slug}.md`, { cache: "no-cache" });
    if (!res.ok) throw new Error(`Cannot load posts/${slug}.md (${res.status})`);
    const markdown = await res.text();

    document.title = `${post.title} — gradomski.dev`;
    document.querySelector('meta[name="description"]')?.setAttribute("content", post.excerpt);

    header.innerHTML = `
      <div class="post-meta">
        <time datetime="${post.date}">${formatDate(post.date)}</time>
        ${post.tag ? `<span class="tag">${post.tag}</span>` : ""}
      </div>
      <h1>${post.title}</h1>
      <p class="lead">${post.excerpt}</p>
      ${post.image ? `<div class="post-cover"><img src="${post.image}" alt=""></div>` : ""}`;

    body.innerHTML = marked.parse(markdown);
    body.querySelectorAll("pre code").forEach(block => hljs.highlightElement(block));
  } catch (err) {
    header.innerHTML = `<p class="error">Couldn't load this post.<br><small>${err.message}</small><br><a href="blog.html">Back to all posts</a></p>`;
  }
})();
