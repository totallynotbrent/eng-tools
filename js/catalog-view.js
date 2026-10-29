// renders the tool catalogue grid on the index page from js/catalog.js.
(function () {
  const catalog = window.eng_catalog;
  const host = document.getElementById("tool-catalogue");
  if (!catalog || !host) return;

  let html = "";
  for (const group of catalog) {
    html += '<div class="grp"><div class="group">' + group.name + '</div><div class="tool-list">';
    for (const item of group.items) {
      html += '<a href="' + item.path + '">'
        + '<span class="t-name">' + item.label + "</span>"
        + '<span class="t-desc">' + item.desc + "</span></a>";
    }
    html += "</div></div>";
  }
  host.innerHTML = html;
})();
