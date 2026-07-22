/* Renders the post list from posts/index.json. */

function postCard(post) {
  const el = document.createElement("article");
  el.className = "post-card";
  el.innerHTML = `
    ${post.image ? `<div class="post-card__media"><img src="${post.image}" alt="" loading="lazy"></div>` : ""}
    <div class="post-card__body">
      <div class="post-meta">
        <time datetime="${post.date}">${formatDate(post.date)}</time>
        ${post.tag ? `<span class="tag">${post.tag}</span>` : ""}
      </div>
      <h2><a href="post.html?slug=${encodeURIComponent(post.slug)}">${post.title}</a></h2>
      <p>${post.excerpt}</p>
      <a class="read-more" href="post.html?slug=${encodeURIComponent(post.slug)}">Read the post →</a>
    </div>`;
  return el;
}

(async function renderList() {
  const target = document.getElementById("post-list");
  try {
    const posts = await loadPosts();
    target.innerHTML = "";
    if (!posts.length) {
      target.innerHTML = `
        <div class="empty">
          <h3>Nothing here yet.</h3>
          <p>
            The first release notes go up when sqTile leaves closed testing.
            <a href="index.html#newsletter">Subscribe</a> and they'll reach you by email too.
          </p>
        </div>`;
      return;
    }
    posts.forEach(post => target.appendChild(postCard(post)));
  } catch (err) {
    target.innerHTML = `<p class="error">Couldn't load the posts.<br><small>${err.message}</small></p>`;
  }
})();
