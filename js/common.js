// shared helpers for all the tool pages

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