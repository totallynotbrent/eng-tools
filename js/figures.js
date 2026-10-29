// interactive figure kit: plotting, scales, drag interaction and page wiring
(function (global) {
  "use strict";

  var controllers = {};

  function esc(s) {
    var AMP = String.fromCharCode(38);
    return String(s)
      .replace(/&/g, AMP + "am" + "p;")
      .replace(/</g, AMP + "lt;")
      .replace(/>/g, AMP + "gt;");
  }

  function num_fmt(v) {
    if (v === null || v === undefined || !isFinite(v)) return "";
    var a = Math.abs(v);
    if (a === 0) return "0";
    if (a >= 1e5 || a < 1e-3) {
      var exp = Math.floor(Math.log10(a));
      var mant = v / Math.pow(10, exp);
      return trim_zero(mant.toFixed(1)) + "e" + exp;
    }
    if (a >= 100) return trim_zero(v.toFixed(0));
    if (a >= 10) return trim_zero(v.toFixed(1));
    if (a >= 1) return trim_zero(v.toFixed(2));
    return trim_zero(v.toFixed(3));
  }

  function trim_zero(s) {
    if (s.indexOf(".") < 0) return s;
    return s.replace(/\.?0+$/, "");
  }

  function nice_step(raw) {
    var mag = Math.pow(10, Math.floor(Math.log10(raw)));
    var norm = raw / mag;
    var mult;
    if (norm < 1.5) mult = 1;
    else if (norm < 3) mult = 2;
    else if (norm < 7) mult = 5;
    else mult = 10;
    return mult * mag;
  }

  function lin_ticks(min, max, count) {
    if (!(max > min)) return [min];
    var step = nice_step((max - min) / (count || 6));
    var start = Math.ceil(min / step) * step;
    var out = [];
    for (var v = start; v <= max + step * 1e-9; v += step) out.push(round_sig(v, 12));
    return out;
  }

  function round_sig(v, digits) {
    var f = Math.pow(10, digits);
    return Math.round(v * f) / f;
  }

  function log_ticks(min, max) {
    var out = [];
    var lo = Math.floor(Math.log10(min));
    var hi = Math.ceil(Math.log10(max));
    for (var e = lo; e <= hi; e++) {
      [1, 2, 5].forEach(function (m) {
        var v = m * Math.pow(10, e);
        if (v >= min * 0.999 && v <= max * 1.001) out.push(v);
      });
    }
    return out;
  }

  function span_of(values) {
    var lo = Infinity, hi = -Infinity;
    for (var i = 0; i < values.length; i++) {
      var v = values[i];
      if (!isFinite(v)) continue;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    if (!isFinite(lo)) return [0, 1];
    if (hi - lo < 1e-12) { hi = lo + 1; lo -= 1; }
    return [lo, hi];
  }

  function pad_span(range, frac) {
    var d = range[1] - range[0];
    var p = d * (frac === undefined ? 0.06 : frac);
    return [range[0] - p, range[1] + p];
  }

  function make_scale(axis_spec, dom_lo, dom_hi, pix_lo, pix_hi) {
    var is_log = !!axis_spec.log;
    if (is_log) {
      var lo = Math.log10(dom_lo);
      var hi = Math.log10(dom_hi);
      return function (v) {
        if (!(v > 0)) return NaN;
        return pix_lo + ((Math.log10(v) - lo) / (hi - lo)) * (pix_hi - pix_lo);
      };
    }
    return function (v) {
      return pix_lo + ((v - dom_lo) / (dom_hi - dom_lo)) * (pix_hi - pix_lo);
    };
  }

  function unscale(axis_spec, dom_lo, dom_hi, pix_lo, pix_hi, px) {
    var t = (px - pix_lo) / (pix_hi - pix_lo);
    if (axis_spec.log) {
      var lo = Math.log10(dom_lo), hi = Math.log10(dom_hi);
      return Math.pow(10, lo + t * (hi - lo));
    }
    return dom_lo + t * (dom_hi - dom_lo);
  }

  function series_points(series, sx, sy) {
    var pts = [];
    if (series.pts) {
      for (var i = 0; i < series.pts.length; i++) {
        var p = series.pts[i];
        var X = sx(p[0]);
        var Y = sy(p[1]);
        if (isFinite(X) && isFinite(Y)) pts.push([X, Y]);
      }
      return pts;
    }
    if (!series.fn) return pts;
    var n = series.n || 140;
    var x0 = series.xmin !== undefined ? series.xmin : sx.domain[0];
    var x1 = series.xmax !== undefined ? series.xmax : sx.domain[1];
    var lim = series.logn ? series.logn : (sx.scale.log ? 1 : 0);
    var fwd = x1 >= x0;
    for (var k = 0; k <= n; k++) {
      var xv;
      if (lim) {
        xv = Math.exp(Math.log(x0) + (Math.log(x1) - Math.log(x0)) * (k / n));
      } else {
        xv = x0 + (x1 - x0) * (k / n);
      }
      var yv = series.fn(xv);
      if (!isFinite(yv)) continue;
      var X2 = sx(xv), Y2 = sy(yv);
      if (isFinite(X2) && isFinite(Y2)) pts.push([X2, Y2]);
    }
    return fwd ? pts : pts.reverse();
  }

  function path_d(pts) {
    if (!pts.length) return "";
    var d = "M" + round1(pts[0][0]) + "," + round1(pts[0][1]);
    for (var i = 1; i < pts.length; i++) d += "L" + round1(pts[i][0]) + "," + round1(pts[i][1]);
    return d;
  }

  function round1(v) {
    return Math.round(v * 10) / 10;
  }

  function build_axes(ax, scale, domain, pix, side) {
    var out = [];
    var ticks = ax.log ? log_ticks(domain[0], domain[1]) : lin_ticks(domain[0], domain[1], ax.count);
    if (ax.zero_inside !== false && !ax.log && domain[0] < 0 && domain[1] > 0) {
      if (ticks.indexOf(0) < 0) ticks.push(0);
      ticks.sort(function (a, b) { return a - b; });
    }
    for (var i = 0; i < ticks.length; i++) {
      var p = scale(ticks[i]);
      if (!isFinite(p)) continue;
      if (side === "bottom") {
        out.push('<line class="fig-grid" x1="' + round1(p) + '" y1="' + round1(pix[0]) + '" x2="' + round1(p) + '" y2="' + round1(pix[1]) + '"/>');
        out.push('<text class="fig-label" x="' + round1(p) + '" y="' + round1(pix[1] + 14) + '" text-anchor="middle">' + esc(num_fmt(ticks[i])) + "</text>");
      } else {
        out.push('<line class="fig-grid" x1="' + round1(pix[0]) + '" y1="' + round1(p) + '" x2="' + round1(pix[1]) + '" y2="' + round1(p) + '"/>');
        out.push('<text class="fig-label" x="' + round1(pix[0] - 6) + '" y="' + round1(p + 3.5) + '" text-anchor="end">' + esc(num_fmt(ticks[i])) + "</text>");
      }
    }
    return out.join("");
  }

  function axis_title(label, unit, x, y, cls) {
    if (!label && !unit) return "";
    var t = label + (unit ? " (" + unit + ")" : "");
    return '<text class="' + cls + '" x="' + round1(x) + '" y="' + round1(y) + '" text-anchor="middle">' + esc(t) + "</text>";
  }

  function legend_block(items, x, y, maxw) {
    if (!items.length) return "";
    var out = [];
    var cx = x, cy = y, rows = 1;
    var limit = x + (maxw || 9999);
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var tw = String(it.label).length * 6.1;
      var need = 21 + tw + 14;
      if (cx > x && cx + need > limit) { cx = x; cy += 14; rows++; }
      var sattr = "";
      if (it.dash) sattr += ' stroke-dasharray="' + (Array.isArray(it.dash) ? it.dash.join(",") : String(it.dash)) + '"';
      if (it.opacity !== undefined) sattr += ' opacity="' + Number(it.opacity) + '"';
      if (it.stroke) sattr += ' stroke="' + String(it.stroke) + '"';
      out.push('<line class="' + (it.cls || "fig-line") + '"' + sattr + ' x1="' + round1(cx) + '" y1="' + round1(cy) +
        '" x2="' + round1(cx + 14) + '" y2="' + round1(cy) + '"/>');
      out.push('<text class="fig-label" x="' + round1(cx + 19) + '" y="' + round1(cy + 3.5) + '">' + esc(it.label) + "</text>");
      cx += need;
    }
    return { svg: out.join(""), rows: rows };
  }

  function svg_open(w, h) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + " " + h + '" preserveAspectRatio="xMidYMid meet" role="img">';
  }

  function render_plot(container, spec) {
    var w = spec.width || 560;
    var h = spec.height || 330;
    var pad = spec.pad || { l: 52, r: 16, t: 16, b: 36 };
    var plot_l = pad.l;
    var plot_r = w - pad.r;
    var plot_t = pad.t;
    var plot_b = h - pad.b;

    var series = spec.series || [];

    // reserve a band above the plot for the legend so it never sits on the curves
    var legend_plan = [];
    series.forEach(function (s) {
      if (s.label) legend_plan.push({ label: s.label, cls: s.cls || "fig-line", dash: s.dash, opacity: s.opacity, stroke: s.stroke });
    });
    var legend_h = 0;
    if (legend_plan.length) {
      var lx = 0, lrows = 1, lwid = w - pad.l - pad.r;
      for (var li = 0; li < legend_plan.length; li++) {
        var lw = 21 + String(legend_plan[li].label).length * 6.1 + 14;
        if (lx > 0 && lx + lw > lwid) { lx = 0; lrows++; }
        lx += lw;
      }
      legend_h = lrows * 14 + 14;
      plot_t = pad.t + legend_h;
      h = h + legend_h;
      plot_b = h - pad.b;
    }

    var x_vals = [];
    var y_left = [];
    var y_right = [];

    series.forEach(function (s) {
      if (s.pts) {
        s.pts.forEach(function (p) {
          x_vals.push(p[0]);
          (s.axis === "y2" ? y_right : y_left).push(p[1]);
        });
      } else if (s.fn) {
        var n = s.n || 60;
        for (var k = 0; k <= n; k++) {
          var xv = s.xmin !== undefined ? s.xmin + (s.xmax - s.xmin) * (k / n) : undefined;
          if (xv === undefined) continue;
          x_vals.push(xv);
          var yv = s.fn(xv);
          if (isFinite(yv)) (s.axis === "y2" ? y_right : y_left).push(yv);
        }
      }
    });

    var x_dom;
    if (spec.x && spec.x.min !== undefined && spec.x.max !== undefined) {
      x_dom = [spec.x.min, spec.x.max];
    } else {
      x_dom = span_of(x_vals);
      x_dom = pad_span(x_dom, 0.02);
    }
    var x_spec = Object.assign({}, spec.x || {});
    if (x_spec.log) x_dom = [Math.max(x_dom[0], 1e-12), x_dom[1]];
    x_spec.domain = x_dom;

    var y_spec = Object.assign({}, spec.y || {});
    var y_dom = spec.y && spec.y.min !== undefined && spec.y.max !== undefined
      ? [spec.y.min, spec.y.max]
      : pad_span(span_of(y_left), 0.1);
    y_spec.domain = y_dom;
    if (y_spec.log) y_dom = [Math.max(y_dom[0], 1e-12), y_dom[1]];

    var y2_spec = spec.y2 ? Object.assign({}, spec.y2) : null;
    var y2_dom = null;
    if (y2_spec) {
      y2_dom = y2_spec.min !== undefined && y2_spec.max !== undefined
        ? [y2_spec.min, y2_spec.max]
        : pad_span(span_of(y_right), 0.1);
      y2_spec.domain = y2_dom;
    }

    var sx = make_scale(x_spec, x_dom[0], x_dom[1], plot_l, plot_r);
    var sy = make_scale(y_spec, y_dom[0], y_dom[1], plot_b, plot_t);
    sx.scale = x_spec;
    sy.scale = y_spec;
    var sy2 = y2_spec ? make_scale(y2_spec, y2_dom[0], y2_dom[1], plot_b, plot_t) : null;
    if (sy2) sy2.scale = y2_spec;

    var out = [svg_open(w, h)];
    out.push("<defs>");
    out.push('<marker id="fig-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="#e0a458"/></marker>');
    out.push('<marker id="fig-arrow-alt" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="#d8d8d8"/></marker>');
    out.push('<marker id="fig-arrow-blue" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="#6f8fd0"/></marker>');
    out.push("</defs>");

    if (spec.clip_band) {
      out.push('<rect class="fig-band" x="' + round1(plot_l) + '" y="' + round1(plot_t) + '" width="' + round1(plot_r - plot_l) + '" height="' + round1(plot_b - plot_t) + '"/>');
    }

    out.push(build_axes(x_spec, sx, x_dom, [plot_t, plot_b], "bottom"));
    out.push(build_axes(y_spec, sy, y_dom, [plot_l, plot_r], "left"));
    if (y2_spec) out.push(build_axes(y2_spec, sy2, y2_dom, [plot_l, plot_r], "left"));

    out.push('<line class="fig-axis" x1="' + plot_l + '" y1="' + plot_b + '" x2="' + plot_r + '" y2="' + plot_b + '"/>');
    out.push('<line class="fig-axis" x1="' + plot_l + '" y1="' + plot_t + '" x2="' + plot_l + '" y2="' + plot_b + '"/>');
    if (y2_spec) {
      out.push('<line class="fig-axis" x1="' + plot_r + '" y1="' + plot_t + '" x2="' + plot_r + '" y2="' + plot_b + '"/>');
      for (var ti = 0; ti < (y2_spec.log ? log_ticks(y2_dom[0], y2_dom[1]) : lin_ticks(y2_dom[0], y2_dom[1], 6)).length; ti++) {}
      var yt2 = y2_spec.log ? log_ticks(y2_dom[0], y2_dom[1]) : lin_ticks(y2_dom[0], y2_dom[1], 6);
      for (var t2 = 0; t2 < yt2.length; t2++) {
        var pp = sy2(yt2[t2]);
        if (!isFinite(pp)) continue;
        out.push('<text class="fig-label" x="' + round1(plot_r + 6) + '" y="' + round1(pp + 3.5) + '" text-anchor="start">' + esc(num_fmt(yt2[t2])) + "</text>");
      }
    }

    (spec.bands || []).forEach(function (b) {
      var ya = sy(b.y0), yb = sy(b.y1);
      var xa = b.x0 !== undefined ? sx(b.x0) : plot_l;
      var xb = b.x1 !== undefined ? sx(b.x1) : plot_r;
      if (!isFinite(ya) || !isFinite(yb)) return;
      out.push('<rect class="' + (b.cls || "fig-band") + '" x="' + round1(Math.min(xa, xb)) + '" y="' + round1(Math.min(ya, yb)) + '" width="' + round1(Math.abs(xb - xa)) + '" height="' + round1(Math.abs(yb - ya)) + '"/>');
    });

    series.forEach(function (s) {
      var tgt = s.axis === "y2" && sy2 ? sy2 : sy;
      var pts = series_points(s, sx, tgt);
      if (!pts.length) return;
      var sattr = "";
      if (s.dash) sattr += ' stroke-dasharray="' + (Array.isArray(s.dash) ? s.dash.join(",") : String(s.dash)) + '"';
      if (s.opacity !== undefined) sattr += ' opacity="' + Number(s.opacity) + '"';
      if (s.stroke) sattr += ' stroke="' + String(s.stroke) + '"';
      out.push('<path class="' + (s.cls || "fig-line") + '"' + sattr + ' d="' + path_d(pts) + '"/>');
      if (s.fill) {
        var fill_pts = pts.concat([[pts[pts.length - 1][0], plot_b], [pts[0][0], plot_b]]);
        out.push('<path class="fig-fill" d="' + path_d(fill_pts) + '"/>');
      }

    });

    (spec.regions || []).forEach(function (rg) {
      var rp = rg.pts.map(function (p) { return [sx(p[0]), sy(p[1])]; })
        .filter(function (p) { return isFinite(p[0]) && isFinite(p[1]); });
      if (rp.length < 3) return;
      out.push('<path class="' + (rg.cls || "fig-region") + '" d="' + path_d(rp) + ' Z"/>');
    });

    (spec.points || []).forEach(function (pt) {
      var px = sx(pt.x), py = pt.axis === "y2" && sy2 ? sy2(pt.y) : sy(pt.y);
      if (!isFinite(px) || !isFinite(py)) return;
      out.push('<circle class="' + (pt.cls || "fig-dot") + '" cx="' + round1(px) + '" cy="' + round1(py) + '" r="' + (pt.r || 4) + '"/>');
      if (pt.label) {
        out.push('<text class="fig-val" x="' + round1(px + (pt.dx === undefined ? 8 : pt.dx)) +
          '" y="' + round1(py + (pt.dy === undefined ? -7 : pt.dy)) + '">' + esc(pt.label) + "</text>");
      }
    });

    (spec.arrows || []).forEach(function (ar) {
      var x0 = sx(ar.x0), y0 = sy(ar.y0), x1 = sx(ar.x1), y1 = sy(ar.y1);
      if (!isFinite(x0) || !isFinite(y0) || !isFinite(x1) || !isFinite(y1)) return;
      var mk = ar.head === "none" ? "" : ' marker-end="url(#' + (ar.marker || "fig-arrow") + ') "';
      out.push('<line class="' + (ar.cls || "fig-line") + '" x1="' + round1(x0) + '" y1="' + round1(y0) +
        '" x2="' + round1(x1) + '" y2="' + round1(y1) + '"' + mk + "/>");
      if (ar.label) {
        out.push('<text class="fig-label" x="' + round1((x0 + x1) / 2 + 6) + '" y="' + round1((y0 + y1) / 2 - 4) + '">' + esc(ar.label) + "</text>");
      }
    });

    (spec.labels || []).forEach(function (lb) {
      var lx = lb.x !== undefined ? sx(lb.x) : plot_l + (lb.left || 0);
      var ly = lb.y !== undefined ? sy(lb.y) : plot_t + (lb.top || 0);
      if (!isFinite(lx) || !isFinite(ly)) return;
      out.push('<text class="' + (lb.cls || "fig-label") + '" x="' + round1(lx) + '" y="' + round1(ly) +
        '" text-anchor="' + (lb.anchor || "start") + '">' + esc(lb.text) + "</text>");
    });

    if (spec.vlines) {
      spec.vlines.forEach(function (v) {
        var px = sx(v.x);
        if (!isFinite(px)) return;
        out.push('<line class="fig-guide" x1="' + round1(px) + '" y1="' + plot_t + '" x2="' + round1(px) + '" y2="' + plot_b + '"/>');
        if (v.label) out.push('<text class="fig-label" x="' + round1(px + 4) + '" y="' + round1(plot_t + 11) + '">' + esc(v.label) + "</text>");
      });
    }

    if (spec.hlines) {
      spec.hlines.forEach(function (v) {
        var py = sy(v.y);
        if (!isFinite(py)) return;
        out.push('<line class="fig-guide" x1="' + plot_l + '" y1="' + round1(py) + '" x2="' + plot_r + '" y2="' + round1(py) + '"/>');
        if (v.label) out.push('<text class="fig-label" x="' + round1(plot_r - 4) + '" y="' + round1(py - 4) + '" text-anchor="end">' + esc(v.label) + "</text>");
      });
    }

    if (spec.marker) {
      var mx = sx(spec.marker.x);
      var my = (spec.marker.y2 !== undefined && sy2) ? sy2(spec.marker.y2) : sy(spec.marker.y);
      if (isFinite(mx) && isFinite(my)) {
        if (spec.marker.crosshair !== false) {
          out.push('<line class="fig-guide" x1="' + round1(mx) + '" y1="' + plot_t + '" x2="' + round1(mx) + '" y2="' + plot_b + '"/>');
          out.push('<line class="fig-guide" x1="' + plot_l + '" y1="' + round1(my) + '" x2="' + plot_r + '" y2="' + round1(my) + '"/>');
        }
        out.push('<circle class="fig-dot" cx="' + round1(mx) + '" cy="' + round1(my) + '" r="4"/>');
        if (spec.marker.label) {
          out.push('<text class="fig-val" x="' + round1(mx + 8) + '" y="' + round1(my - 7) + '">' + esc(spec.marker.label) + "</text>");
        }
      }
    }

    var ly = plot_t + 6;
    if (spec.y2 && spec.y2.label) {
      out.push(axis_title("", "", 0, 0, "fig-label"));
    }
    if (spec.x && (spec.x.label || spec.x.unit)) {
      out.push(axis_title(spec.x.label, spec.x.unit, (plot_l + plot_r) / 2, h - 6, "fig-label"));
    }
    if (spec.y && (spec.y.label || spec.y.unit)) {
      out.push('<text class="fig-label" x="' + round1(plot_l - 40) + '" y="' + round1(plot_t - 5) + '" text-anchor="start">' + esc(spec.y.label + (spec.y.unit ? " (" + spec.y.unit + ")" : "")) + "</text>");
    }
    if (y2_spec && (y2_spec.label || y2_spec.unit)) {
      out.push('<text class="fig-label" x="' + round1(plot_r) + '" y="' + round1(plot_t - 5) + '" text-anchor="end">' + esc(y2_spec.label + (y2_spec.unit ? " (" + y2_spec.unit + ")" : "")) + "</text>");
    }

    if (legend_plan.length) out.push(legend_block(legend_plan, plot_l, 8, plot_r - plot_l).svg);

    out.push("</svg>");
    return { svg: out.join(""), geom: { w: w, h: h, plot_l: plot_l, plot_r: plot_r, plot_t: plot_t, plot_b: plot_b }, x_spec: x_spec, y_spec: y_spec, y2_spec: y2_spec, sx: sx, sy: sy, sy2: sy2 };
  }

  function container_el(key) {
    if (typeof key === "string") return document.getElementById(key);
    return key;
  }

  function make_controller(container, spec) {
    var ctl = {
      container: container,
      spec: spec,
      geo: null,
      draw: function (next_spec) {
        if (next_spec) ctl.spec = next_spec;
        var res = render_plot(container, ctl.spec);
        ctl.geo = res.geom;
        ctl.spec = ctl.spec;
        ctl.res = res;
        container.innerHTML = res.svg;
        ctl.bind_marker(res);
      },
      bind_marker: function (res) {
        if (!ctl.drag_ready && (ctl.spec.marker || ctl.spec.drag_anywhere) && container.addEventListener) {
          ctl.drag_ready = true;
          container.addEventListener("pointerdown", function (ev) {
            if (!ctl.spec.marker) return;
            if (ctl.spec.driver) {
              if (!ctl.inside_plot(ev)) return;
              ctl.start_drag(ev);
            } else if (ctl.near_marker(ev)) {
              ctl.start_drag(ev);
            }
          });
        }
      },
      inside_plot: function (ev) {
        var geo = ctl.res.geom;
        var rect = container.getBoundingClientRect ? container.getBoundingClientRect() : null;
        if (!rect) return true;
        var scale = rect.width ? rect.width / geo.w : 1;
        var px = (ev.clientX - rect.left) / scale;
        var py = (ev.clientY - rect.top) / scale;
        return px >= geo.plot_l - 12 && px <= geo.plot_r + 12 && py >= geo.plot_t - 12 && py <= geo.plot_b + 12;
      },
      near_marker: function (ev) {
        var m = ctl.spec.marker;
        var res = ctl.res;
        var rect = container.getBoundingClientRect ? container.getBoundingClientRect() : null;
        if (!rect) return true;
        var scale = rect.width ? res.geom.w / rect.width : 1;
        var mx = res.sx(m.x);
        var my = res.sy(m.y);
        var px = (ev.clientX - rect.left) * scale;
        var py = (ev.clientY - rect.top) * scale;
        var rad = 16;
        return Math.hypot(px - mx, py - my) <= rad;
      },
      pixel_threshold: function (res) {
        return 18 * (res.geom.w / 560);
      },
      data_at: function (ev) {
        var res = ctl.res;
        var rect = container.getBoundingClientRect ? container.getBoundingClientRect() : null;
        var scale = rect && rect.width ? rect.width / res.geom.w : 1;
        var px = (ev.clientX - (rect ? rect.left : 0)) / scale;
        var py = (ev.clientY - (rect ? rect.top : 0)) / scale;
        return {
          px: px,
          py: py,
          x: unscale(ctl.spec.x || {}, res.x_spec.domain[0], res.x_spec.domain[1], res.geom.plot_l, res.geom.plot_r, px),
          y: unscale(ctl.spec.y || {}, res.y_spec.domain[0], res.y_spec.domain[1], res.geom.plot_b, res.geom.plot_t, py)
        };
      },
      start_drag: function (ev) {
        ctl.dragging = true;
        if (ev.preventDefault) ev.preventDefault();
        if (ev.stopPropagation) ev.stopPropagation();
        var move = function (e) {
          if (!ctl.dragging) return;
          var hit = ctl.data_at(e);
          if (ctl.spec.on_drag) ctl.spec.on_drag(hit.x, hit.y, e);
        };
        var up = function () {
          ctl.dragging = false;
          global.removeEventListener("pointermove", move);
          global.removeEventListener("pointerup", up);
        };
        global.addEventListener("pointermove", move);
        global.addEventListener("pointerup", up);
      }
    };
    ctl.draw();
    return ctl;
  }

  function plot(container_or_id, spec) {
    var container = container_el(container_or_id);
    if (!container) return null;
    var key = container.id || "_anon_" + Object.keys(controllers).length;
    var ctl = controllers[key];
    if (!ctl) {
      ctl = make_controller(container, spec);
      controllers[key] = ctl;
    } else {
      ctl.draw(spec);
    }
    return ctl;
  }

  function clear(container_or_id) {
    var container = container_el(container_or_id);
    if (!container) return;
    container.innerHTML = "";
    if (container.id) delete controllers[container.id];
  }

  function on_tab_click(tabs_id, fn_ref) {
    var tabs = document.getElementById(tabs_id || "tabs");
    if (!tabs || !tabs.addEventListener) return;
    if (tabs.getAttribute("data-fig-watch") === "1") return;
    tabs.setAttribute("data-fig-watch", "1");
    tabs.addEventListener("click", function () {
      var fn = typeof fn_ref === "string" ? global[fn_ref] : fn_ref;
      if (typeof fn === "function") {
        if (global.setTimeout) global.setTimeout(fn, 0);
        else fn();
      }
    });
  }

  function on_change(callback) {
    if (!document.querySelectorAll) return;
    var nodes = document.querySelectorAll("input, select, textarea");
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].addEventListener("change", callback);
      nodes[i].addEventListener("input", callback);
    }
  }

  function auto_draw(callback) {
    if (typeof callback !== "function") return;
    var run = function () {
      try {
        callback();
      } catch (err) {
        if (global.console && console.warn) console.warn("figure draw failed", err);
      }
    };
    if (document.readyState === "complete" || document.readyState === "interactive") {
      if (global.setTimeout) global.setTimeout(run, 0);
    } else if (document.addEventListener) {
      document.addEventListener("DOMContentLoaded", run);
    }
    on_change(run);
  }

  function scene(container_or_id, opts) {
    var container = container_el(container_or_id);
    if (!container) return null;
    var w = (opts && opts.width) || 560;
    var h = (opts && opts.height) || 330;
    var parts = [];

    function attr(o) {
      var out = "";
      for (var k in o) {
        if (!Object.prototype.hasOwnProperty.call(o, k)) continue;
        out += " " + k + '="' + esc(String(o[k])) + '"';
      }
      return out;
    }

    var s = {
      width: w,
      height: h,
      line: function (x1, y1, x2, y2, cls, extra) {
        parts.push('<line class="' + (cls || "fig-line") + '" x1="' + round1(x1) + '" y1="' + round1(y1) + '" x2="' + round1(x2) + '" y2="' + round1(y2) + '"' + (extra ? attr(extra) : "") + "/>");
        return s;
      },
      circle: function (cx, cy, r, cls, extra) {
        parts.push('<circle class="' + (cls || "fig-line") + '" cx="' + round1(cx) + '" cy="' + round1(cy) + '" r="' + round1(r) + '"' + (extra ? attr(extra) : "") + "/>");
        return s;
      },
      rect: function (x, y, rw, rh, cls, extra) {
        parts.push('<rect class="' + (cls || "fig-band") + '" x="' + round1(x) + '" y="' + round1(y) + '" width="' + round1(rw) + '" height="' + round1(rh) + '"' + (extra ? attr(extra) : "") + "/>");
        return s;
      },
      path: function (d, cls, extra) {
        parts.push('<path class="' + (cls || "fig-line") + '" d="' + d + '"' + (extra ? attr(extra) : "") + "/>");
        return s;
      },
      poly: function (pts, cls, extra) {
        var d = "";
        for (var i = 0; i < pts.length; i++) {
          d += (i ? "L" : "M") + round1(pts[i][0]) + "," + round1(pts[i][1]);
        }
        parts.push('<path class="' + (cls || "fig-line") + '" d="' + d + '"' + (extra ? attr(extra) : "") + "/>");
        return s;
      },
      text: function (x, y, str, o) {
        o = o || {};
        var extra = { "text-anchor": o.anchor || "middle" };
        if (o.rotate) extra.transform = "rotate(" + o.rotate + " " + round1(x) + " " + round1(y) + ")";
        parts.push('<text class="' + (o.cls || "fig-label") + '" x="' + round1(x) + '" y="' + round1(y) + '"' + attr(extra) + ">" + esc(str) + "</text>");
        return s;
      },
      arrow: function (x1, y1, x2, y2, cls, extra) {
        var e = { "marker-end": "url(#fig-arrow)" };
        if (extra) for (var k in extra) e[k] = extra[k];
        parts.push('<line class="' + (cls || "fig-line") + '" x1="' + round1(x1) + '" y1="' + round1(y1) + '" x2="' + round1(x2) + '" y2="' + round1(y2) + '"' + attr(e) + "/>");
        return s;
      },
      defs: function () {
        parts.unshift('<defs><marker id="fig-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="#e0a458"/></marker></defs>');
        return s;
      },
      commit: function () {
        container.innerHTML = svg_open(w, h) + parts.join("") + "</svg>";
        return s;
      }
    };
    s.defs();
    return s;
  }


  function bars(container_or_id, spec) {
    var container = container_el(container_or_id);
    if (!container) return null;
    var cats = spec.categories || [];
    var series = spec.series || [];
    if (!cats.length || !series.length) return null;

    var w = spec.width || 560;
    var h = spec.height || 290;
    var pad = spec.pad || { l: 54, r: 14, t: 22, b: 44 };
    var plot_l = pad.l, plot_r = w - pad.r, plot_t = pad.t, plot_b = h - pad.b;

    var vals = [];
    series.forEach(function (s) { (s.values || []).forEach(function (v) { if (isFinite(v)) vals.push(v); }); });
    var y_max = spec.y && spec.y.max !== undefined ? spec.y.max : Math.max.apply(null, vals.concat([1]));
    var y_min = spec.y && spec.y.min !== undefined ? spec.y.min : 0;
    var y_dom = [y_min, y_max];

    var out = [svg_open(w, h)];
    out.push('<line class="fig-axis" x1="' + plot_l + '" y1="' + plot_b + '" x2="' + plot_r + '" y2="' + plot_b + '"/>');
    out.push('<line class="fig-axis" x1="' + plot_l + '" y1="' + plot_t + '" x2="' + plot_l + '" y2="' + plot_b + '"/>');

    var ticks = lin_ticks(y_dom[0], y_dom[1], 5);
    ticks.forEach(function (tv) {
      var ty = plot_b - ((tv - y_dom[0]) / (y_dom[1] - y_dom[0])) * (plot_b - plot_t);
      out.push('<line class="fig-grid" x1="' + plot_l + '" y1="' + round1(ty) + '" x2="' + plot_r + '" y2="' + round1(ty) + '"/>');
      out.push('<text class="fig-label" x="' + (plot_l - 6) + '" y="' + round1(ty + 3.5) + '" text-anchor="end">' + esc(num_fmt(tv)) + "</text>");
    });

    var slot = (plot_r - plot_l) / cats.length;
    var bw = Math.min(slot * 0.72 / series.length, 46);
    cats.forEach(function (cat, ci) {
      var cx = plot_l + slot * (ci + 0.5);
      series.forEach(function (s, si) {
        var v = (s.values || [])[ci];
        if (!isFinite(v)) return;
        var vy = plot_b - ((v - y_dom[0]) / (y_dom[1] - y_dom[0])) * (plot_b - plot_t);
        var bx = cx - (bw * series.length) / 2 + si * bw;
        out.push('<rect class="' + (s.cls || "fig-bar") + '" x="' + round1(bx + 1) + '" y="' + round1(vy) +
          '" width="' + round1(bw - 2) + '" height="' + round1(Math.max(plot_b - vy, 0.5)) + '"/>');
        if (s.show_values) {
          out.push('<text class="fig-val" x="' + round1(bx + bw / 2) + '" y="' + round1(vy - 4) + '" text-anchor="middle">' + esc(num_fmt(v)) + "</text>");
        }
      });
      out.push('<text class="fig-label" x="' + round1(cx) + '" y="' + (plot_b + 14) + '" text-anchor="middle">' + esc(cat) + "</text>");
    });

    if (spec.y && spec.y.label) {
      out.push('<text class="fig-label" x="' + plot_l + '" y="' + (plot_t - 6) + '">' + esc(spec.y.label + (spec.y.unit ? " (" + spec.y.unit + ")" : "")) + "</text>");
    }
    var leg = series.filter(function (s) { return s.label; })
      .map(function (s) { return { label: s.label, cls: s.cls || "fig-bar" }; });
    if (leg.length) out.push(legend_block(leg, plot_r - 90, plot_t + 4));

    out.push("</svg>");
    container.innerHTML = out.join("");
    return true;
  }



  function clear_result_dom(cfg) {
    var ids = [cfg.lines || "lines"];
    if (cfg.extra_lines) ids = ids.concat(cfg.extra_lines);
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.innerHTML = "";
    });
    var err = document.getElementById("err");
    if (err) err.textContent = "";
  }



  function ledger(container_or_id, spec) {
    var container = container_el(container_or_id);
    if (!container) return null;
    var entries = (spec && spec.entries) || [];
    if (!entries.length) return null;

    var w = (spec && spec.width) || 560;
    var h = (spec && spec.height) || 240;
    var lab_w = (spec && spec.label_width) || 132;
    var val_w = (spec && spec.value_width) || 92;
    var top = (spec && spec.top) || 30;
    var row_h = (spec && spec.row_height) || 30;
    var bar_l = lab_w + 8;
    var bar_r = w - val_w;
    var bar_area = Math.max(bar_r - bar_l, 40);

    var lo = 0, hi = 0;
    entries.forEach(function (e) {
      var v = e.value;
      if (!isFinite(v)) return;
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    });
    var span_hi = hi > 0 ? hi : 1;
    var span_lo = lo < 0 ? -lo : 0;
    var total = span_hi + span_lo;
    if (!(total > 0)) total = 1;
    // the zero line sits where the negative share ends, so positive bars grow
    // rightward from it and negative bars grow leftward
    var zero_x = bar_l + span_lo / total * bar_area;

    var out = [svg_open(w, h)];
    out.push('<line class="fig-axis" x1="' + round1(zero_x) + '" y1="' + (top - 10) +
      '" x2="' + round1(zero_x) + '" y2="' + (top + entries.length * row_h) + '"/>');
    out.push('<text class="fig-label" x="' + round1(zero_x) + '" y="' + (top - 16) +
      '" text-anchor="middle">' + esc(((spec && spec.zero_label) || "zero")) + "</text>");

    entries.forEach(function (e, i) {
      var y = top + i * row_h;
      var v = e.value;
      out.push('<text class="fig-label" x="' + (lab_w - 10) + '" y="' + round1(y + 4) +
        '" text-anchor="end">' + esc(e.label) + "</text>");
      if (isFinite(v)) {
        var frac = v / total;
        var len = Math.abs(frac) * bar_area;
        var x = frac >= 0 ? zero_x : zero_x - len;
        out.push('<rect class="' + (e.cls || (v >= 0 ? "fig-bar" : "fig-bar-alt")) +
          '" x="' + round1(x) + '" y="' + round1(y - 9) + '" width="' + round1(Math.max(len, 1)) +
          '" height="13" rx="0"/>');
      }
      out.push('<text class="fig-val" x="' + (bar_r + 8) + '" y="' + round1(y + 4) + '">' +
        esc(isFinite(v) ? (spec && spec.format ? spec.format(v) : num_fmt(v)) : (e.text || "-")) + "</text>");
    });

    out.push("</svg>");
    container.innerHTML = out.join("");
    return true;
  }

  function with_values(values, fn) {
    var restore = [];
    Object.keys(values || {}).forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      restore.push([el, el.value]);
      el.value = String(values[id]);
    });
    try {
      return fn();
    } finally {
      for (var i = 0; i < restore.length; i++) restore[i][0].value = restore[i][1];
    }
  }

  function seeded(defaults, fn) {
    var restore = [];
    Object.keys(defaults || {}).forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      if (el.value !== "" && el.value !== undefined) return;
      restore.push([el, el.value]);
      el.value = String(defaults[id]);
    });
    try {
      fn();
    } finally {
      for (var i = 0; i < restore.length; i++) restore[i][0].value = restore[i][1];
    }
  }

  function show_default_placeholders(defaults) {
    Object.keys(defaults || {}).forEach(function (id) {
      var el = document.getElementById(id);
      if (!el || el.tagName !== "INPUT") return;
      if (el.value !== "" && el.value !== undefined) return;
      var old_placeholder = el.getAttribute("data-unit-placeholder") || el.getAttribute("placeholder") || "";
      if (old_placeholder) el.setAttribute("data-unit-placeholder", old_placeholder);
      el.setAttribute("placeholder", String(defaults[id]) + (old_placeholder ? " · " + old_placeholder : ""));
    });
  }

  function harvest(solve_fn, defaults, lines_id) {
    var lid = lines_id || "lines";
    show_default_placeholders(defaults);
    var err_el = document.getElementById("err");

    function collect() {
      var rows = results_rows(lid);
      return rows;
    }

    var rows = [];
    var used_default = false;
    var values = {};
    var line_el = document.getElementById(lid);
    var results_el = document.getElementById("results");
    var saved_lines = line_el ? line_el.innerHTML : "";
    var saved_err = err_el ? err_el.textContent : "";
    var saved_display = results_el ? results_el.style.display : "";
    if (line_el) line_el.innerHTML = "";
    if (err_el) err_el.textContent = "";
    try {
      if (typeof solve_fn === "string") solve_fn = global[solve_fn];
      solve_fn();
    } catch (e) { /* fall through to defaults */ }
    rows = collect();
    values = page_inputs();
    var solve_error = err_el ? err_el.textContent : "";

    if (!rows.length && defaults) {
      var snapshot = null;
      var changed = [];
      Object.keys(defaults).forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) return;
        if (!field_untouched(el)) return;
        if (snapshot === null) snapshot = {};
        snapshot[id] = el.value;
        el.value = String(defaults[id]);
        changed.push(id);
      });
      try {
        solve_fn();
        rows = collect();
        values = page_inputs();
        used_default = rows.length > 0;
      } catch (e2) {
        rows = [];
      } finally {
        changed.forEach(function (id) {
          var el = document.getElementById(id);
          if (el && snapshot) el.value = snapshot[id];
        });
      }
    }

    if (line_el) line_el.innerHTML = saved_lines;
    if (err_el) err_el.textContent = saved_err;
    if (results_el) results_el.style.display = saved_display;

    return { rows: rows, defaults_used: used_default, values: values, error: solve_error };
  }

  function demo(defaults, fn) {
    var saved = {};
    Object.keys(defaults || {}).forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      saved[id] = el.value;
      el.value = String(defaults[id]);
    });
    var out;
    try {
      out = fn();
    } finally {
      Object.keys(saved).forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.value = saved[id];
      });
    }
    return out;
  }

  function drive(input_id, solve_fn, opts) {
    opts = opts || {};
    return function (x_value) {
      var el = document.getElementById(input_id);
      if (!el) return;
      var v = x_value;
      if (opts.step) v = Math.round(v / opts.step) * opts.step;
      if (opts.min !== undefined) v = Math.max(opts.min, v);
      if (opts.max !== undefined) v = Math.min(opts.max, v);
      if (opts.decimals !== undefined) v = Number(v.toFixed(opts.decimals));
      el.value = String(v);
      if (solve_fn) solve_fn();
    };
  }


  function scan(cfg) {
    var solve_fn = cfg.solve;
    if (typeof solve_fn === "string") solve_fn = global[solve_fn];
    if (typeof solve_fn !== "function") return [];

    var lid = cfg.lines || "lines";
    var lines_el = document.getElementById(lid);
    var err_el = document.getElementById("err");
    var res_el = document.getElementById("results");
    var saved_lines = lines_el ? lines_el.innerHTML : "";
    var saved_err = err_el ? err_el.textContent : "";
    var saved_display = res_el ? res_el.style.display : "";

    var out = [];
    (cfg.points || []).forEach(function (vals) {
      var rec = { values: vals, rows: [] };
      with_values(vals || {}, function () {
        if (lines_el) lines_el.innerHTML = "";
        if (err_el) err_el.textContent = "";
        try { solve_fn(); } catch (e) { rec.failed = true; }
        rec.rows = results_rows(lid);
      });
      if (rec.rows.length && cfg.pick) {
        var picked = cfg.pick(rec.rows, vals);
        if (picked) Object.keys(picked).forEach(function (k) { rec[k] = picked[k]; });
      }
      out.push(rec);
    });

    if (lines_el) lines_el.innerHTML = saved_lines;
    if (err_el) err_el.textContent = saved_err;
    if (res_el) res_el.style.display = saved_display;
    return out;
  }

    var ENTITY_MAP = {
    "delta": "\u0394", "Delta": "\u0394", "nbsp": " ", "minus": "\u2212",
    "ndash": "\u2013", "mdash": "\u2014", "times": "\u00d7", "middot": "\u00b7",
    "deg": "\u00b0", "mu": "\u03bc", "nu": "\u03bd", "xi": "\u03be",
    "pi": "\u03c0", "rho": "\u03c1", "sigma": "\u03c3", "tau": "\u03c4",
    "phi": "\u03d5", "omega": "\u03c9", "Omega": "\u03a9", "kappa": "\u03ba",
    "epsilon": "\u03b5", "lambda": "\u03bb", "alpha": "\u03b1", "beta": "\u03b2",
    "gamma": "\u03b3", "theta": "\u03b8", "psi": "\u03c8", "eta": "\u03b7",
    "zeta": "\u03b6", "Alpha": "\u0391", "Beta": "\u0392", "Gamma": "\u0393",
    "Theta": "\u0398", "Lambda": "\u039b", "Sigma": "\u03a3", "Phi": "\u03a6",
    "Psi": "\u03a8", "prime": "\u2032", "Prime": "\u2033", "le": "\u2264",
    "ge": "\u2265", "cdot": "\u22c5", "divide": "\u00f7", "ne": "\u2260",
    "radic": "\u221a", "trade": "\u2122", "copy": "\u00a9", "reg": "\u00ae",
    "bull": "\u2022", "hellip": "\u2026", "permil": "\u2030", "dagger": "\u2020"
  };

  function decode_entities(str) {
    return String(str).replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, function (whole, ent) {
      if (ent.charAt(0) === "#") {
        var hex = ent.charAt(1) === "x" || ent.charAt(1) === "X";
        var code = parseInt(hex ? ent.slice(2) : ent.slice(1), hex ? 16 : 10);
        if (isFinite(code) && code > 0 && code < 0x110000) {
          try { return String.fromCodePoint(code); } catch (e) { return whole; }
        }
        return whole;
      }
      if (ENTITY_MAP[ent]) return ENTITY_MAP[ent];
      return whole;
    });
  }

function results_rows(container_id) {
    var el = document.getElementById(container_id || "lines");
    if (!el) return [];
    var nodes = el.querySelectorAll ? el.querySelectorAll(".result-line") : [];
    var out = [];
    for (var i = 0; i < nodes.length; i++) {
      var kids = nodes[i].children || [];
      var label = kids[0] ? (kids[0].textContent || "") : "";
      var text = kids[1] ? (kids[1].textContent || "") : (nodes[i].textContent || "");
      var nums = String(text).match(/-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g) || [];
      out.push({ label: label, text: text, num: nums.length ? parseFloat(nums[0]) : NaN, nums: nums.map(parseFloat) });
    }
    return out;
  }

  function result_number(container_id, label_match, index) {
    var rows = results_rows(container_id);
    var want = index || 0;
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].label.toLowerCase().indexOf(decode_entities(String(label_match)).toLowerCase()) >= 0) {
        var arr = rows[i].nums;
        return arr.length > want ? arr[want] : rows[i].num;
      }
    }
    return NaN;
  }


  function page_inputs() {
    var out = {};
    if (!document.querySelectorAll) return out;
    var nodes = document.querySelectorAll("input, select, textarea");
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].id) out[nodes[i].id] = nodes[i].type === "checkbox" ? nodes[i].checked : nodes[i].value;
    }
    return out;
  }

// a field the visitor has not touched still carries whatever the page shipped,
// so it may take a figure demo default; anything typed by hand never does
function field_untouched(el) {
    if (!el) return false;
    if (el.tagName === "SELECT") {
      if (el.value === el.defaultValue && el.defaultValue !== "") return true;
      if (!el.options || !el.options.length) return el.value === "" || el.value === undefined;
      if (el.selectedIndex !== undefined) return el.selectedIndex === 0;
      return el.value === el.options[0].value;
    }
    if (el.type === "checkbox" || el.type === "radio") return false;
    var dv = el.defaultValue;
    if (dv === undefined || dv === null) return el.value === "" || el.value === undefined;
    return el.value === dv;
  }

  function set_input_value(id, v) {
    var el = document.getElementById(id);
    if (el) el.value = String(v);
  }

  var sweep_cache = {};

  function sweep(container_or_id, cfg) {
    var container = container_el(container_or_id);
    if (!container) return null;
    var solve_fn = cfg.solve;
    if (typeof solve_fn === "string") solve_fn = global[solve_fn];
    if (typeof solve_fn !== "function") return null;

    var input_id = cfg.input;
    var min = cfg.min, max = cfg.max;
    var steps = cfg.steps || 48;
    var outputs = cfg.outputs || [];

    var inputs_now = page_inputs();
    var defaults = cfg.defaults || {};
    show_default_placeholders(defaults);
    // some solvers accept one field combination only, so a sweep can blank
    // competing fields while sampling and restore them afterwards
    var clear_ids = (cfg.clear || []).slice();

    var lines_el = document.getElementById(cfg.lines || "lines");
    var results_box = document.getElementById("results");
    var err_box = document.getElementById("err");
    var saved_lines = lines_el ? lines_el.innerHTML : "";
    var saved_err = err_box ? err_box.textContent : "";
    var saved_display = results_box ? results_box.style.display : "";

    var seeded = {};
    Object.keys(defaults).forEach(function (id) {
      if (id === input_id) return;
      var el = document.getElementById(id);
      if (!field_untouched(el)) return;
      seeded[id] = defaults[id];
    });

    var original = inputs_now[input_id];
    var cur = parseFloat(original);
    if (!isFinite(cur)) cur = parseFloat(defaults[input_id]);
    // with no value in the field the left edge of the range is a poor stand-in,
    // so the readout describes a point halfway through the sweep instead
    if (!isFinite(cur)) {
      if (isFinite(cfg.representative)) cur = cfg.representative;
      else cur = cfg.x_log && min > 0 && max > 0 ? Math.sqrt(min * max) : (min + max) / 2;
    }

    var sig_parts = [];
    for (var k in inputs_now) {
      if (k === input_id) continue;
      sig_parts.push(k + "=" + (seeded[k] !== undefined ? seeded[k] : inputs_now[k]));
    }
    var sig = sig_parts.join("|");
    var key = (container.id || "fig") + "::" + (cfg.cache_tag || "") + "::" + sig + "::" + min + ":" + max + ":" + steps + ":" +
      outputs.map(function (o) { return o.match + "@" + (o.num_index || 0); }).join(",") +
      "::clear=" + clear_ids.join(",");

    var cache_hit = sweep_cache[key];

    function sample_point(xv) {
      set_input_value(input_id, xv);
      Object.keys(seeded).forEach(function (sid) { set_input_value(sid, seeded[sid]); });
      clear_ids.forEach(function (cid) { if (cid !== input_id) set_input_value(cid, ""); });
      clear_result_dom(cfg);
      try {
        solve_fn();
      } catch (e) {
        return null;
      }
      var rr = results_rows(cfg.lines || "lines");
      var point = { x: xv, vals: {} };
      for (var o = 0; o < outputs.length; o++) {
        var spec = outputs[o];
        var found = NaN;
        for (var q = 0; q < rr.length; q++) {
          var lab = rr[q].label.toLowerCase().trim();
          var pat = decode_entities(String(spec.match)).toLowerCase().trim();
          var hit = spec.exact ? lab === pat : lab.indexOf(pat) >= 0;
          if (hit) {
            var arr = rr[q].nums;
            found = arr.length > (spec.num_index || 0) ? arr[spec.num_index || 0] : rr[q].num;
            if (spec.unit === undefined && rr[q].text) {
              var ut = rr[q].text.replace(/\([^()]*\d[^()]*\)/g, " ");
              var um = ut.replace(/-?[\d.,]+(?:[eE][+-]?\d+)?/g, "").trim();
              um = decode_entities(um).replace(/[;,]$/, "").trim();
              if (um) spec.unit = um;
            }
            break;
          }
        }
        point.vals[spec.name || spec.match] = found;
      }
      return point;
    }

    function restore_panel() {
      set_input_value(input_id, original === undefined ? cur : original);
      Object.keys(seeded).forEach(function (sid) { set_input_value(sid, inputs_now[sid]); });
      clear_ids.forEach(function (cid) { if (inputs_now[cid] !== undefined) set_input_value(cid, inputs_now[cid]); });
      if (lines_el) lines_el.innerHTML = saved_lines;
      if (err_box) err_box.textContent = saved_err;
      if (results_box) results_box.style.display = saved_display;
    }

    if (!cache_hit) {
      var rows = [];
      for (var i = 0; i <= steps; i++) {
        var xv;
        if (cfg.x_log) xv = min * Math.pow(max / min, i / steps);
        else xv = min + (max - min) * (i / steps);
        rows.push(sample_point(xv));
      }
      restore_panel();
      cache_hit = { rows: rows, outputs: outputs };
      sweep_cache[key] = cache_hit;
    }

    var series = [];
    var used_units = {};
    cache_hit.rows.forEach(function (rp) {
      if (!rp) return;
      series.push(rp);
    });

    var pl_series = [];
    outputs.forEach(function (spec, idx) {
      var pts = [];
      cache_hit.rows.forEach(function (rp) {
        if (!rp) return;
        var v = rp.vals[spec.name || spec.match];
        if (isFinite(v)) pts.push([rp.x, v]);
      });
      if (!pts.length) return;
      used_units[spec.name || spec.match] = spec.unit;
      var ser = {
        pts: pts,
        cls: spec.cls || (idx === 0 ? "fig-line" : idx === 1 ? "fig-third" : "fig-alt"),
        label: spec.label || spec.match
      };
      if (spec.axis === "y2") ser.axis = "y2";
      pl_series.push(ser);
    });

    var first_name = outputs.length ? (outputs[0].name || outputs[0].match) : null;
    function row_has_value(rp) {
      if (!rp) return false;
      if (!first_name) return true;
      return isFinite(rp.vals[first_name]);
    }
    var cur_row = null;
    var grid_row = null;
    var best_row = null;
    var best_dist = Infinity;
    for (var ri = 0; ri < cache_hit.rows.length; ri++) {
      var rr2 = cache_hit.rows[ri];
      if (!row_has_value(rr2)) continue;
      var d2 = Math.abs(rr2.x - cur);
      if (d2 < best_dist) { best_dist = d2; best_row = rr2; }
      if (Math.abs(rr2.x - cur) < (max - min) / steps * 0.6 && !grid_row) grid_row = rr2;
    }
    // the readout has to describe the value the page actually holds, so solve
    // once more at the live input instead of borrowing the nearest grid row
    if (isFinite(cur) && cur >= min && cur <= max) {
      var on_grid = false;
      cache_hit.rows.forEach(function (rp) {
        if (rp && Math.abs(rp.x - cur) < 1e-9) on_grid = true;
      });
      if (!on_grid) {
        var exact = sample_point(cur);
        if (row_has_value(exact)) cur_row = exact;
        restore_panel();
      }
    }
    if (!cur_row) cur_row = grid_row;
    // a solver that refuses the live input still deserves a usable reading, so
    // fall back to the closest sample the solver did accept
    if (!cur_row) cur_row = best_row;
    var marker = null;
    if (cur_row) {
      var mv = cur_row.vals[outputs[0].name || outputs[0].match];
      marker = { x: cur, y: mv, label: cfg.marker_label };
    }

    var y2_outputs = outputs.filter(function (sp) { return sp.axis === "y2"; });
    var y2_axis = null;
    if (y2_outputs.length) {
      y2_axis = {
        label: cfg.y2_label || "",
        unit: cfg.y2_unit || used_units[y2_outputs[0].name || y2_outputs[0].match] || ""
      };
    }

    fig.plot(container, {
      width: cfg.width || 560,
      height: cfg.height || 310,
      x: { label: cfg.x_label || "", unit: cfg.x_unit || "", min: min, max: max, log: !!cfg.x_log },
      y: { label: cfg.y_label || "", unit: cfg.y_unit || used_units[outputs[0] && (outputs[0].name || outputs[0].match)] || "" },
      y2: y2_axis,
      series: pl_series,
      marker: marker,
      driver: cfg.driver !== false,
      on_drag: function (x) {
        var el = document.getElementById(input_id);
        if (!el) return;
        var v = x;
        if (cfg.step) v = Math.round(v / cfg.step) * cfg.step;
        if (cfg.min !== undefined) v = Math.max(cfg.min, v);
        if (cfg.max !== undefined) v = Math.min(cfg.max, v);
        el.value = String(v);
        try { solve_fn(); } catch (e) { /* figure stays on last good state */ }
        sweep(container, cfg);
      }
    });

    if (cfg.note) {
      var note_el = null;
      var note_txt = "";
      if (typeof cfg.note === "function") {
        note_el = document.getElementById(cfg.note_id ||
          ((container.id || "") + "-note"));
        var note_ctx = { min: min, max: max, x: cur, samples: cache_hit.rows };
        try { note_txt = String(cfg.note(cur, cur_row, note_ctx)); } catch (e) { note_txt = ""; }
      } else {
        note_el = document.getElementById(cfg.note);
        note_txt = String(cfg.note_text || "");
      }
      if (note_el) note_el.textContent = note_txt;
    }
    return { rows: cache_hit.rows, series: pl_series };
  }

  global.fig = {
    plot: plot,
    scene: scene,
    clear: clear,
    drive: drive,
    on_change: on_change,
    on_tab_click: on_tab_click,
    auto_draw: auto_draw,
    num_fmt: num_fmt,
    esc: esc,
    results_rows: results_rows,
    result_number: result_number,
    scan: scan,
    sweep: sweep,
    bars: bars,
    ledger: ledger,
    demo: demo,
    seeded: seeded,
    with_values: with_values,
    harvest: harvest,
    spans: { span_of: span_of, pad_span: pad_span, lin_ticks: lin_ticks, log_ticks: log_ticks },
    internals: { make_scale: make_scale, unscale: unscale, path_d: path_d, series_points: series_points }
  };

  if (typeof module !== "undefined" && module.exports) module.exports = global.fig;
})(typeof globalThis !== "undefined" ? globalThis : this);
