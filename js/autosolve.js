// live solving for the calculator pages
//
// every input records the solver that owns it, so a change only recalculates the
// affected calculator. the last good results stay on screen while a value is
// being typed, and the warning only appears once the value has settled.

(function () {
  if (!document.querySelectorAll || !document.addEventListener) return;

  var QUIET_MS = 260;
  var SETTLE_MS = 900;
  var pending = {};
  var good_html = {};
  var ticker = null;

  function owner_of(node) {
    while (node && node !== document.body) {
      if (node.getAttribute && node.getAttribute("data-solver")) return node.getAttribute("data-solver");
      node = node.parentNode;
    }
    return null;
  }

  function field_key(field) {
    return (owner_of(field) || "default") + "#" + (field.id || "");
  }

  function results_node() {
    return document.getElementById("lines");
  }

  function error_node() {
    return document.getElementById("err");
  }

  // one solve pass, showing the warning only when the value has settled
  function run_solver(field, reveal) {
    var name = owner_of(field);
    if (!name) return;
    var fn = window[name];
    if (typeof fn !== "function") return;

    var key = field_key(field);
    var lines = results_node();
    var err = error_node();

    try {
      fn();
    } catch (problem) {
      if (window.console && console.warn) console.warn("autosolve failed", problem);
      if (lines && good_html[key]) lines.innerHTML = good_html[key];
      if (err) err.textContent = "";
      return;
    }

    var message = err ? err.textContent : "";
    if (!message) {
      if (lines) good_html[key] = lines.innerHTML;
      if (err) err.textContent = "";
      return;
    }

    // keep the last good numbers on screen while the value is still being worked out
    if (lines && good_html[key]) lines.innerHTML = good_html[key];

    if (err) err.textContent = reveal ? message : "";
  }

  // the figure engines redraw on their own schedule, so the panel is solved
  // again after they finish to make sure the numbers belong to the live value
  function settle(field) {
    var key = field_key(field);
    run_solver(field, true);
    window.setTimeout(function () {
      if (pending[key]) return;
      run_solver(field, true);
    }, 60);
  }

  function tick() {
    var now = Date.now();
    Object.keys(pending).forEach(function (key) {
      var entry = pending[key];
      if (!entry) return;
      var age = now - entry.at;
      if (age >= SETTLE_MS) {
        pending[key] = null;
        settle(entry.field);
      } else if (age >= QUIET_MS) {
        run_solver(entry.field, false);
        entry.at = now;
      }
    });
    ticker = window.setTimeout(tick, 120);
  }

  function on_edit(event) {
    var field = event.target;
    if (!field || !field.tagName) return;
    if (!/^(input|select|textarea)$/i.test(field.tagName)) return;

    if (field.tagName === "INPUT" && field.type !== "checkbox" && field.type !== "radio") {
      field.classList.remove("default-value");
      field.removeAttribute("data-default");
    }

    var key = field_key(field);
    pending[key] = { field: field, at: Date.now() };
    if (!ticker) ticker = window.setTimeout(tick, 120);
  }

  function on_focus(event) {
    var field = event.target;
    if (!field || field.tagName !== "INPUT") return;
    if (!field.hasAttribute || !field.hasAttribute("data-default")) return;
    // focusing the shipped default selects it so typing replaces it
    if (typeof field.select === "function") field.select();
  }

  function on_ready() {
    var fields = document.querySelectorAll("input, select, textarea");
    Array.prototype.forEach.call(fields, function (field) {
      field.addEventListener("input", on_edit);
      field.addEventListener("change", on_edit);
      field.addEventListener("focus", on_focus);
    });

    // the first solve paints the results and the figure with the shipped defaults
    var area = document.querySelector(".calc-input-area");
    if (area) {
      var field = area.querySelector("input, select, textarea");
      if (field) {
        run_solver(field, true);
        window.setTimeout(function () { run_solver(field, true); }, 60);
      }
    }
  }

  if (document.readyState === "complete" || document.readyState === "interactive") {
    window.setTimeout(on_ready, 0);
  } else {
    document.addEventListener("DOMContentLoaded", on_ready);
  }
})();
