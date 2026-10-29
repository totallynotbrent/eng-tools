// explorer sidebar for the tool pages, injected on load.
// the tool list comes from js/catalog.js so the sidebar and the index cannot drift apart.
(function () {
  const catalog = window.eng_catalog;
  if (!catalog) return;

  const current = window.location.pathname;

  let html = '<a class="nav-home" href="../../index.html">eng tools</a>';
  for (const group of catalog) {
    html += '<div class="nav-group">' + group.name + "</div>";
    for (const item of group.items) {
      const active = current.indexOf(item.path) !== -1 ? ' class="active"' : "";
      html += "<a" + active + ' href="../../' + item.path + '">' + item.label + "</a>";
    }
  }

  const aside = document.createElement("aside");
  aside.className = "side-nav";
  aside.innerHTML = html;
  document.body.appendChild(aside);
  document.body.classList.add("with-sidebar");

  // toggle button to open/close the sidebar on narrow screens
  const toggle = document.createElement("button");
  toggle.className = "nav-toggle";
  toggle.type = "button";
  toggle.title = "toggle tools";
  toggle.textContent = "tools";
  document.body.appendChild(toggle);
  toggle.addEventListener("click", function () {
    document.body.classList.toggle("nav-open");
  });
  aside.addEventListener("click", function () {
    if (window.innerWidth <= 1200) document.body.classList.remove("nav-open");
  });
})();
