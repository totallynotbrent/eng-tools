// shared helpers for all the tool pages

// typeset all .eq blocks with katex once it loads from the cdn
(function () {
  if (!document.createElement || !document.head || !document.body) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css";
  document.head.appendChild(link);
  const s = document.createElement("script");
  s.src = "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js";
  s.defer = true;
  s.onload = function () {
    document.querySelectorAll(".eq").forEach(function (el) {
      const src = el.textContent;
      el.textContent = "";
      katex.render(src, el, { displayMode: true, throwOnError: false });
    });
  };
  s.onerror = function () { document.querySelectorAll(".eq").forEach(function (el) { el.classList.add("eq-raw"); }); };
  document.body.appendChild(s);
})();

function val(id) {
  const el = document.getElementById(id);
  const s = el.value.trim();
  if (s === "") return null;
  const n = parseFloat(s);
  return isFinite(n) ? n : null;
}

function set_text(id, text) {
  document.getElementById(id).textContent = text;
}

function fmt(n, sig) {
  if (!isFinite(n)) return "n/a";
  sig = sig || 6;
  if (n === 0) return "0";
  const m = n.toPrecision(sig).split(/[eE]/);
  let mant = m[0];
  if (mant.indexOf(".") !== -1) mant = mant.replace(/0+$/, "").replace(/\.$/, "");
  return m.length === 2 ? mant + "e" + m[1] : mant;
}

function lerp(x, x0, x1, y0, y1) {
  return y0 + (y1 - y0) * (x - x0) / (x1 - x0);
}

// interpolate a row-based table on column 0 (must be sorted ascending).
// takes an array of arrays and a key index for x, returns an array with the
// interpolated values for every nonzero column (the x value is echoed back).
function table_interp(table, x, key_idx) {
  const first = table[0];
  const last = table[table.length - 1];
  if (x <= first[key_idx]) return table[0].slice();
  if (x >= last[key_idx]) return last.slice();
  for (let i = 1; i < table.length; i++) {
    if (x <= table[i][key_idx]) {
      const x0 = table[i - 1][key_idx];
      const x1 = table[i][key_idx];
      const f = (x - x0) / (x1 - x0);
      const out = table[i - 1].slice();
      for (let c = 0; c < out.length; c++) {
        if (c === key_idx) continue;
        out[c] = table[i - 1][c] + (table[i][c] - table[i - 1][c]) * f;
      }
      out[key_idx] = x;
      return out;
    }
  }
  return last.slice();
}

// x-weighted average of a two-phase mixture
function mix(f_val, g_val, x) {
  return f_val + x * (g_val - f_val);
}

// render an array of [label, value] pairs into the results panel
function render_lines(id, lines) {
  document.getElementById(id).innerHTML = lines.map(function (l) {
    return '<div class="result-line"><span class="label">' + l[0] + "</span><span class=\"value\">" + l[1] + "</span></div>";
  }).join("");
  document.getElementById("results").style.display = "block";
}

// solve a square linear system with gauss-jordan elimination, returns null if singular
function gauss_solve(a, b) {
  const n = b.length;
  const m = a.map(function (row, i) { return row.slice().concat(b[i]); });
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(m[r][col]) > Math.abs(m[piv][col])) piv = r;
    }
    if (Math.abs(m[piv][col]) < 1e-12) return null;
    const tmp = m[col]; m[col] = m[piv]; m[piv] = tmp;
    const d = m[col][col];
    for (let c = col; c <= n; c++) m[col][c] /= d;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = m[r][col];
      for (let c = col; c <= n; c++) m[r][c] -= f * m[col][c];
    }
  }
  return m.map(function (row) { return row[n]; });
}

// polynomial helpers, coefficients ordered highest power first
function polymul(a, b) {
  const out = new Array(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i++)
    for (let j = 0; j < b.length; j++)
      out[i + j] += a[i] * b[j];
  return out;
}

function polyadd(a, b) {
  const n = Math.max(a.length, b.length);
  const out = new Array(n).fill(0);
  for (let i = 0; i < a.length; i++) out[i + n - a.length] += a[i];
  for (let i = 0; i < b.length; i++) out[i + n - b.length] += b[i];
  return out;
}

// tiny complex helpers, a complex value is [re, im]
function cx_add(a, b) { return [a[0] + b[0], a[1] + b[1]]; }
function cx_sub(a, b) { return [a[0] - b[0], a[1] - b[1]]; }
function cx_mul(a, b) { return [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]]; }
function cx_div(a, b) {
  const d = b[0] * b[0] + b[1] * b[1];
  return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d];
}

// durand-kerner root finder for real-coefficient polynomials, returns [re, im] pairs
function polyroots(coeffs) {
  let c = coeffs.slice();
  while (c.length > 1 && Math.abs(c[0]) < 1e-14) c = c.slice(1);
  const n = c.length - 1;
  if (n < 1) return [];
  c = c.map(function (v) { return v / c[0]; });
  if (n === 1) return [[-c[1], 0]];
  const evalp = function (z) {
    let r = [1, 0];
    for (let k = 1; k <= n; k++) r = cx_add(cx_mul(r, z), [c[k], 0]);
    return r;
  };
  let z = [];
  let cur = [1, 0];
  const step = [0.4, 0.9];
  for (let k = 0; k < n; k++) { z.push(cur.slice()); cur = cx_mul(cur, step); }
  for (let it = 0; it < 1000; it++) {
    let moved = 0;
    for (let i = 0; i < n; i++) {
      let den = [1, 0];
      for (let j = 0; j < n; j++) if (j !== i) den = cx_mul(den, cx_sub(z[i], z[j]));
      const dz = cx_div(evalp(z[i]), den);
      z[i] = cx_sub(z[i], dz);
      moved = Math.max(moved, Math.hypot(dz[0], dz[1]));
    }
    if (moved < 1e-12) break;
  }
  return z.map(function (w) { return [w[0], Math.abs(w[1]) < 1e-8 ? 0 : w[1]]; });
}

// format a polynomial with descending powers for display
function poly_str(coeffs) {
  const n = coeffs.length - 1;
  let out = "";
  for (let i = 0; i <= n; i++) {
    const p = n - i;
    const v = coeffs[i];
    if (Math.abs(v) < 1e-12) continue;
    const av = Math.abs(v);
    const body = (av === 1 && p > 0 ? "" : fmt(av, 4)) + (p === 0 ? "" : (p === 1 ? "s" : "s<sup>" + p + "</sup>"));
    if (!out) out += (v < 0 ? "&minus;" : "") + body;
    else out += (v < 0 ? " &minus; " : " + ") + body;
  }
  return out || "0";
}

// matrix helpers for square systems
function matmul(a, b) {
  const n = a.length, m = b[0].length, k = b.length;
  const out = Array.from({ length: n }, function () { return new Array(m).fill(0); });
  for (let i = 0; i < n; i++)
    for (let j = 0; j < m; j++)
      for (let t = 0; t < k; t++)
        out[i][j] += a[i][t] * b[t][j];
  return out;
}

function matvec(a, v) {
  return a.map(function (row) { return row.reduce(function (s, x, i) { return s + x * v[i]; }, 0); });
}

function matid(n) {
  return Array.from({ length: n }, function (_, i) {
    return Array.from({ length: n }, function (_, j) { return i === j ? 1 : 0; });
  });
}

function matpow(a, p) {
  let out = matid(a.length);
  for (let k = 0; k < p; k++) out = matmul(out, a);
  return out;
}

function matrank(m) {
  const a = m.map(function (r) { return r.slice(); });
  const rows = a.length, cols = a[0].length;
  let rank = 0, r = 0;
  for (let c = 0; c < cols && r < rows; c++) {
    let piv = r;
    for (let i = r; i < rows; i++) if (Math.abs(a[i][c]) > Math.abs(a[piv][c])) piv = i;
    if (Math.abs(a[piv][c]) < 1e-10) continue;
    const tmp = a[r]; a[r] = a[piv]; a[piv] = tmp;
    for (let i = 0; i < rows; i++) {
      if (i === r) continue;
      const f = a[i][c] / a[r][c];
      for (let j = c; j < cols; j++) a[i][j] -= f * a[r][j];
    }
    r++; rank++;
  }
  return rank;
}

// characteristic polynomial of a square matrix via faddeev-leverrier
function charpoly(a) {
  const n = a.length;
  let m = matid(n);
  const coeff = [1];
  for (let k = 1; k <= n; k++) {
    const am = matmul(a, m);
    const tr = am.reduce(function (s, row, i) { return s + row[i]; }, 0);
    const c = -tr / k;
    coeff.push(c);
    m = am.map(function (row, i) { return row.map(function (v, j) { return v + (i === j ? c : 0); }); });
  }
  return coeff;
}