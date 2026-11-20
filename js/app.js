/* =========================================================
   ゆめかわ星占い — app.js
   No framework, no build. Reads window.HOROSCOPE.
   ========================================================= */
(function () {
  "use strict";

  var H = window.HOROSCOPE;
  if (!H) { console.error("horoscope_data.js が読み込まれていません"); return; }

  var ORDER = H.order;
  var SIGNS = H.signs;
  var COMPAT = H.compat;
  var BP = H.bloodPair;
  var ELEMENTS = H.elements;

  /* 共有用の公開URL（GitHub Pages） */
  var SITE_BASE = "https://koki839.github.io/yumekawa-uranai/";

  var RELATIONS = {
    love:   { label: "恋愛", frame: "恋として近づくなら" },
    friend: { label: "友達", frame: "友達として付き合うなら" },
    work:   { label: "仕事", frame: "仕事で組むなら" },
    reconn: { label: "復縁", frame: "もう一度やり直すなら" }
  };

  var state = {
    sign: null,
    blood: "",
    partner: null,
    partnerBlood: "",
    tab: "divination",
    loveMode: "single",
    relation: "love"
  };

  /* ---------------- utils ---------------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }
  function esc(str) {
    return String(str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function starRow(n) {
    var out = "";
    for (var i = 1; i <= 5; i++) {
      out += '<span class="' + (i <= n ? "on" : "off") + '">★</span>';
    }
    return out;
  }
  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function store(key, val) {
    try { window.localStorage.setItem("yumekawa:" + key, val); } catch (e) {}
  }
  function read(key) {
    try { return window.localStorage.getItem("yumekawa:" + key); } catch (e) { return null; }
  }

  /* ---------------- analytics (GA4) ---------------- */
  /* gtag が無い・ブロックされた環境でもサイトを壊さない */
  function trackEvent(name, params) {
    try {
      if (typeof window.gtag === "function") {
        window.gtag("event", name, params || {});
      }
    } catch (e) { /* analytics 失敗は無視 */ }
  }
  function resultTypeOf(el) {
    try {
      return el && el.closest && el.closest("#compat-result") ? "compat" : "divination";
    } catch (e) { return "divination"; }
  }

  /* ---------------- 星座判定 ---------------- */
  var RANGES = [
    { m: 1,  d: 20, s: "aquarius" },
    { m: 2,  d: 19, s: "pisces" },
    { m: 3,  d: 21, s: "aries" },
    { m: 4,  d: 20, s: "taurus" },
    { m: 5,  d: 21, s: "gemini" },
    { m: 6,  d: 22, s: "cancer" },
    { m: 7,  d: 23, s: "leo" },
    { m: 8,  d: 23, s: "virgo" },
    { m: 9,  d: 23, s: "libra" },
    { m: 10, d: 24, s: "scorpio" },
    { m: 11, d: 22, s: "sagittarius" },
    { m: 12, d: 22, s: "capricorn" }
  ];
  function zodiacOf(month, day) {
    var found = null;
    for (var i = 0; i < RANGES.length; i++) {
      var r = RANGES[i];
      if (month > r.m || (month === r.m && day >= r.d)) { found = r.s; }
    }
    return found || "capricorn"; // 1/1 – 1/19
  }

  /* ---------------- score helpers ---------------- */
  function bloodKey(a, b) {
    if (!a || !b) { return null; }
    var x = [a, b].sort();
    var key = x[0] + "-" + x[1];
    return BP[key] ? key : null;
  }
  function compatScore(a, b) {
    var base = COMPAT[a] && COMPAT[a][b] ? COMPAT[a][b].s : 60;
    var bk = bloodKey(state.blood, state.partnerBlood);
    var add = bk ? BP[bk].add : 0;
    return { base: base, add: add, total: Math.max(20, Math.min(100, base + add)) };
  }
  function scoreComment(total) {
    if (total >= 92) { return "運命レベル"; }
    if (total >= 84) { return "とても good"; }
    if (total >= 74) { return "good"; }
    if (total >= 64) { return "まずまず"; }
    if (total >= 54) { return "努力しだい"; }
    return "遠い二人";
  }

  /* ---------------- build date selects ---------------- */
  function buildDateSelects() {
    var yearSel = $("#birth-year");
    var monthSel = $("#birth-month");
    var daySel = $("#birth-day");
    var thisYear = new Date().getFullYear();
    var html = '<option value="">年</option>';
    for (var y = thisYear; y >= 1920; y--) { html += '<option value="' + y + '">' + y + "</option>"; }
    yearSel.innerHTML = html;

    html = '<option value="">月</option>';
    for (var m = 1; m <= 12; m++) { html += '<option value="' + m + '">' + m + "月</option>"; }
    monthSel.innerHTML = html;

    fillDays(31);
    yearSel.addEventListener("change", onDateChange);
    monthSel.addEventListener("change", onDateChange);
    daySel.addEventListener("change", onDateChange);
  }
  function fillDays(max, keep) {
    var daySel = $("#birth-day");
    var html = '<option value="">日</option>';
    for (var d = 1; d <= max; d++) { html += '<option value="' + d + '">' + d + "日</option>"; }
    daySel.innerHTML = html;
    if (keep) { daySel.value = String(keep); }
  }
  function onDateChange() {
    var y = parseInt($("#birth-year").value, 10);
    var m = parseInt($("#birth-month").value, 10);
    var d = parseInt($("#birth-day").value, 10);
    var auto = $("#auto-sign");

    if (m) {
      var daysInMonth = (y && m) ? new Date(y, m, 0).getDate() : 31;
      var current = $("#birth-day").value;
      if (parseInt(current, 10) > daysInMonth) { current = ""; }
      fillDays(daysInMonth, current);
    }
    if (m && d) {
      var signKey = zodiacOf(m, d);
      setSign(signKey, { silent: true, scroll: false });
      auto.innerHTML = "あなたの星座は <b>" + SIGNS[signKey].symbol + " " + SIGNS[signKey].name + "</b> です";
      renderDivination(true);
      trackEvent("divination_lookup", { method: "birthdate", sign: signKey });
    } else {
      auto.textContent = "星座はまだ選ばれていません";
    }
  }

  /* ---------------- sign buttons ---------------- */
  function signButtonHTML(key, small) {
    var s = SIGNS[key];
    return '<button type="button" class="sign-btn" data-sign="' + key + '" aria-pressed="false" title="' + esc(s.name) + '">' +
      '<span class="sym" aria-hidden="true">' + s.symbol + "</span>" +
      '<span class="nm">' + esc(s.name) + "</span>" +
      "</button>";
  }
  function buildSignGrid(container, onPick) {
    container.innerHTML = ORDER.map(function (k) { return signButtonHTML(k); }).join("");
    container.addEventListener("click", function (e) {
      var btn = e.target.closest(".sign-btn");
      if (!btn || !container.contains(btn)) { return; }
      onPick(btn.getAttribute("data-sign"));
    });
  }
  function markSelected(container, key) {
    $all(".sign-btn", container).forEach(function (b) {
      var on = b.getAttribute("data-sign") === key;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function setSign(key, opts) {
    opts = opts || {};
    state.sign = key;
    markSelected($("#sign-grid"), key);
    if (!opts.silent) {
      renderDivination(false);
      trackEvent("divination_lookup", { method: opts.method || "sign", sign: key, blood: state.blood || "none" });
    }
    store("sign", key);
  }

  /* ---------------- blood segmented ---------------- */
  function markBlood(container, value) {
    if (!container) { return; }
    $all(".seg", container).forEach(function (b) {
      b.classList.toggle("is-on", (b.getAttribute("data-blood") || "") === (value || ""));
    });
  }
  function bindBlood(container, key) {
    container.addEventListener("click", function (e) {
      var btn = e.target.closest(".seg");
      if (!btn || !container.contains(btn)) { return; }
      $all(".seg", container).forEach(function (b) { b.classList.remove("is-on"); });
      btn.classList.add("is-on");
      state[key] = btn.getAttribute("data-blood") || "";
    });
  }

  /* ---------------- share (X / LINE / copy) ---------------- */
  function shareURLSign(key) {
    var u = SITE_BASE + "?sign=" + encodeURIComponent(key);
    if (state.blood) { u += "&blood=" + encodeURIComponent(state.blood); }
    return u;
  }
  function shareURLCompat(a, b) {
    var u = SITE_BASE + "?sign=" + encodeURIComponent(a) + "&partner=" + encodeURIComponent(b);
    if (state.blood) { u += "&blood=" + encodeURIComponent(state.blood); }
    if (state.partnerBlood) { u += "&pblood=" + encodeURIComponent(state.partnerBlood); }
    return u + "#compat";
  }
  function starMarks(n) {
    var out = "";
    for (var i = 1; i <= 5; i++) { out += (i <= n ? "★" : "☆"); }
    return out;
  }
  function divinationShareText(key) {
    var s = SIGNS[key];
    return "私の今週の運勢は【" + s.name + "】" + s.symbol + "✨ 総合運" + starMarks(s.rates.overall) +
      "、ラッキーカラーは「" + s.lucky.colorName + "」。\n" +
      "「" + s.weekly.headline + "」\n" +
      "#ゆめかわ星占い #12星座占い";
  }
  function compatShareText(myKey, ptKey) {
    var mine = SIGNS[myKey];
    var theirs = SIGNS[ptKey];
    var entry = COMPAT[myKey][ptKey];
    var total = compatScore(myKey, ptKey).total;
    return "【" + mine.name + " × " + theirs.name + "】相性 " + total + "%" +
      "「" + entry.t + "」💞\n" +
      "#ゆめかわ星占い #12星座占い #相性占い";
  }
  function shareHTML(opts) {
    var text = opts.text;
    var url = opts.url;
    var encText = encodeURIComponent(text);
    var encUrl = encodeURIComponent(url);
    var xHref = "https://twitter.com/intent/tweet?text=" + encText + "&url=" + encUrl;
    var lineHref = "https://social-plugins.line.me/lineit/share?url=" + encUrl + "&text=" + encText;

    var html = '<div class="share-box' + (opts.compact ? " share-box-compact" : "") + '" role="group" aria-label="占い結果をシェア">';
    html += '<p class="share-head">' + (opts.compact ? "✦ シェアする" : "✦ この結果をシェアする") + "</p>";
    html += '<div class="share-btns">';
    html += '<a class="share-btn share-x" href="' + esc(xHref) + '" target="_blank" rel="noopener noreferrer" aria-label="X（Twitter）でシェアする">' +
      '<span class="sb-ico" aria-hidden="true">𝕏</span>' + opts.xLabel + "</a>";
    html += '<a class="share-btn share-line" href="' + esc(lineHref) + '" target="_blank" rel="noopener noreferrer" aria-label="LINEで送る">' +
      '<span class="sb-ico sb-ico-line" aria-hidden="true">LINE</span>で送る</a>';
    html += '<button type="button" class="share-btn share-copy" data-copy-url="' + esc(url) + '">' +
      '<span class="sb-ico" aria-hidden="true">🔗</span>URLをコピー</button>';
    html += "</div>";
    if (!opts.compact) {
      html += '<p class="share-hint">シェアしたリンクをひらくと、同じ結果がそのまま見られます。</p>';
    }
    html += "</div>";
    return html;
  }
  function divinationShare(compact) {
    var key = state.sign;
    if (!key) { return ""; }
    return shareHTML({
      text: divinationShareText(key),
      url: shareURLSign(key),
      xLabel: "でシェア",
      compact: !!compact
    });
  }
  function compatShare(compact) {
    if (!state.sign || !state.partner) { return ""; }
    return shareHTML({
      text: compatShareText(state.sign, state.partner),
      url: shareURLCompat(state.sign, state.partner),
      xLabel: "で相性をシェア",
      compact: !!compact
    });
  }

  /* ---------------- toast & clipboard ---------------- */
  function toast(msg) {
    var el = document.getElementById("yk-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "yk-toast";
      el.className = "yk-toast";
      el.setAttribute("role", "status");
      el.setAttribute("aria-live", "polite");
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("is-on");
    if (toast._t) { clearTimeout(toast._t); }
    toast._t = setTimeout(function () { el.classList.remove("is-on"); }, 2200);
  }
  function legacyCopy(text) {
    try {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "-2000px";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, text.length);
      var ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch (e) { return false; }
  }
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(
        function () { return true; },
        function () { return legacyCopy(text); }
      );
    }
    return Promise.resolve(legacyCopy(text));
  }

  /* ---------------- render: divination ---------------- */
  function divinationHTML() {
    var key = state.sign;
    if (!key) {
      return '<div class="result-card"><p class="prose"><strong>上のフォームから星座をえらんでください。</strong><br>生年月日を選ぶと自動で星座が決まります。ボタンを押さなくても、えらんだ瞬間に結果が出ます。</p></div>';
    }
    var s = SIGNS[key];
    var el = ELEMENTS[s.element];
    var blood = state.blood ? s.blood[state.blood] : "";
    var liveLove = state.loveMode === "couple" ? s.weekly.couple : s.weekly.single;
    var liveLabel = state.loveMode === "couple" ? "カップルの今週" : "片思いの今週";

    var top3 = ORDER.filter(function (k) { return k !== key; })
      .map(function (k) { return { k: k, sc: COMPAT[key][k].s }; })
      .sort(function (a, b) { return b.sc - a.sc; })
      .slice(0, 3);

    var html = "";

    /* --- hero --- */
    html += '<div class="result-card">';
    html += '<div class="sign-hero">';
    html += '<div class="sign-hero-top">';
    html += '<div class="sign-badge" aria-hidden="true">' + s.symbol + "</div>";
    html += '<div class="sign-title"><h3>' + esc(s.name) + "</h3>";
    html += '<span class="sign-en">' + esc(s.en) + " / " + esc(s.dates) + "</span>";
    html += '<div class="sign-meta">';
    html += '<span class="chip chip-element" style="background:' + el.color + '">' + el.ja + "の星座</span>";
    html += '<span class="chip">守護星 ' + esc(s.ruler) + "</span>";
    html += '<span class="chip">' + esc(s.keyword) + "</span>";
    html += "</div></div></div>";
    html += '<p class="sign-catch">「' + esc(s.catch) + "」</p>";
    html += '<div class="rate-list" aria-label="今週の5段階評価">';
    [["総合運", s.rates.overall], ["恋愛運", s.rates.love], ["仕事運", s.rates.work], ["金運", s.rates.money], ["体調", s.rates.health]].forEach(function (r) {
      html += '<div class="rate-row"><span>' + r[0] + '</span><span class="stars" aria-label="5段階中' + r[1] + '">' + starRow(r[1]) + "</span></div>";
    });
    html += "</div></div>";
    html += divinationShare(true);

    /* --- personality --- */
    html += '<div class="sect"><h3 class="sect-title">性格と、隠れた魅力 <small>PERSONALITY</small></h3>';
    html += '<div class="prose">' + s.personality.map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("") + "</div>";
    html += '<p class="sub-title">あなたの、隠れた魅力</p><ul class="bullets">' +
      s.charm.map(function (c) { return "<li>" + esc(c) + "</li>"; }).join("") + "</ul>";
    html += '<div class="like-box">' +
      '<div class="like-item"><b>好きなタイプ</b><span>' + esc(s.likes) + "</span></div>" +
      '<div class="like-item"><b>苦手なタイプ</b><span>' + esc(s.dislikes) + "</span></div>" +
      "</div></div></div>";

    /* --- love --- */
    html += '<div class="result-card">';
    html += '<h3 class="sect-title">恋愛のクセ <small>LOVE STYLE</small></h3>';
    html += '<div class="prose">' + s.loveTrend.map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("") + "</div>";
    html += '<p class="sub-title">沼ってしまう相手</p><div class="prose">' +
      s.loveSwoon.map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("") + "</div>";
    html += '<p class="sub-title">別れと、復縁のパターン</p><div class="prose">' +
      s.loveBreakup.map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("") + "</div>";
    html += "</div>";

    /* --- weekly --- */
    html += '<div class="result-card">';
    html += '<h3 class="sect-title">今週の運勢 <small>THIS WEEK</small></h3>';
    html += '<p class="sign-catch">' + esc(s.weekly.headline) + "</p>";
    html += '<p class="sub-title">総合運</p><div class="prose">' +
      s.weekly.overall.map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("") + "</div>";
    html += '<div id="love-week"><p class="sub-title">恋愛運</p>' +
      '<div class="mini-toggle" role="group" aria-label="恋愛運の切り替え">' +
      '<button type="button" data-mode="single" class="' + (state.loveMode === "single" ? "is-on" : "") + '">片思い</button>' +
      '<button type="button" data-mode="couple" class="' + (state.loveMode === "couple" ? "is-on" : "") + '">カップル</button>' +
      "</div>" +
      '<p class="sub-title" style="margin-top:0;color:var(--muted);font-weight:400">' + liveLabel + "</p>" +
      '<div class="prose">' + liveLove.map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("") + "</div></div>";
    html += '<p class="sub-title">仕事運と、お金の流れ</p><div class="prose">' +
      s.weekly.work.map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("") + "</div>";
    html += "</div>";

    /* --- lucky + blood + top3 --- */
    html += '<div class="result-card">';
    html += '<div class="lucky-card"><p class="lucky-head">✦ LUCKY CHARM ✦</p><div class="lucky-grid">';
    html += '<div class="lucky-item"><span class="k">ラッキーカラー</span><span class="v"><span class="color-dot" style="background:' + s.lucky.color + '"></span>' + esc(s.lucky.colorName) + "</span></div>";
    html += '<div class="lucky-item"><span class="k">ラッキーナンバー</span><span class="v">' + s.lucky.number + "</span></div>";
    html += '<div class="lucky-item"><span class="k">ラッキーアイテム</span><span class="v">' + esc(s.lucky.item) + "</span></div>";
    html += "</div>";
    html += '<p class="advice-line">「' + esc(s.lucky.advice) + "」</p></div>";

    html += '<div class="blood-card"><p class="bt">' + (blood ? state.blood + "型のあなたへ" : "血液型のひとこと") + "</p><p>" +
      (blood ? esc(blood) : "血液型をえらぶと、あなた専用のひとことがここに出ます。上のフォームから選んでみてください。") +
      "</p></div>";

    html += '<div class="sect"><h3 class="sect-title">相性のいい星座 <small>TOP 3</small></h3><div class="top3">';
    top3.forEach(function (t) {
      var ts = SIGNS[t.k];
      html += '<div class="top3-item"><span class="sym" aria-hidden="true">' + ts.symbol + "</span>" +
        '<span class="nm">' + esc(ts.name) + "</span>" +
        '<span class="sc">' + t.sc + "%</span></div>";
    });
    html += "</div>";
    html += '<button type="button" class="inline-link" data-goto-compat="' + key + '">この星座で相性をしらべる →</button>';
    html += "</div></div>";

    html += '<div class="result-card share-card">' + divinationShare(false) + "</div>";

    return html;
  }

  function renderDivination(soft) {
    var area = $("#divination-result");
    area.innerHTML = divinationHTML();
    var loveToggle = $("#love-week .mini-toggle");
    if (loveToggle) {
      loveToggle.addEventListener("click", function (e) {
        var b = e.target.closest("button[data-mode]");
        if (!b) { return; }
        state.loveMode = b.getAttribute("data-mode");
        renderDivination(true);
        var lw = $("#love-week");
        if (lw && !soft) { lw.scrollIntoView({ behavior: "smooth", block: "center" }); }
      });
    }
  }

  /* ---------------- render: compatibility ---------------- */
  function relationParagraphs(myKey, ptKey, rel) {
    var mine = SIGNS[myKey];
    var theirs = SIGNS[ptKey];
    var entry = COMPAT[myKey][ptKey];
    var score = compatScore(myKey, ptKey).total;
    var elMine = ELEMENTS[mine.element];
    var elTheirs = ELEMENTS[theirs.element];
    var p1 = "あなたからは、" + mine.approach[rel];
    var p2 = "相手（" + theirs.name + "）は、" + theirs.approach[rel];
    var p3;
    if (score >= 86) {
      p3 = "この組み合わせは、放っておいてもうまく回るタイプ。だからこそ油断すると「いてくれて当たり前」になりがち。月に一度でいいので、感謝を言葉にすると、この相性は何年でも続きます。";
    } else if (score >= 72) {
      p3 = "十分にいい相性です。ただし " + elMine.ja + "のあなたと " + elTheirs.ja + "の相手では、テンポが少し違う。予定は早めに、結論は急がない。それだけで、すれ違いのほとんどは消えます。";
    } else if (score >= 58) {
      p3 = "悪くはないけれど、放っておくとすれ違う相性。" + mine.name + "の「" + mine.tags[0] + "」と" + theirs.name + "の「" + theirs.tags[0] + "」が噛み合わない瞬間があるので、そのときは正しさより、相手の気持ちを先に聞くこと。";
    } else {
      p3 = "かなり違う二人です。だからこそ、相手の中に自分にないものを見つけられる。無理に合わせようとせず、違いを面白がれるかどうかが分かれ道になります。";
    }
    return [p1, p2, p3];
  }

  function compatHTML() {
    var myKey = state.sign;
    var ptKey = state.partner;
    if (!myKey || !ptKey) {
      return '<div class="result-card"><p class="prose"><strong>あなたの星座と、相手の星座をえらんでください。</strong><br>ふたりのスコアと、関係別の攻略法が出ます。血液型は任意で、選ぶと少しだけ補正が入ります。</p></div>';
    }
    var mine = SIGNS[myKey];
    var theirs = SIGNS[ptKey];
    var entry = COMPAT[myKey][ptKey];
    var sc = compatScore(myKey, ptKey);
    var bk = bloodKey(state.blood, state.partnerBlood);
    var rel = RELATIONS[state.relation];
    var paras = relationParagraphs(myKey, ptKey, state.relation);

    var html = '<div class="result-card">';
    html += '<div class="compat-hero">';
    html += '<div class="compat-pair">';
    html += '<div class="who"><span class="sym" aria-hidden="true">' + mine.symbol + "</span><span class=\"nm\">" + esc(mine.name) + "</span><span class=\"bt\">" + (state.blood ? state.blood + "型" : "あなた") + "</span></div>";
    html += '<span class="heart" aria-hidden="true">💞</span>';
    html += '<div class="who"><span class="sym" aria-hidden="true">' + theirs.symbol + "</span><span class=\"nm\">" + esc(theirs.name) + "</span><span class=\"bt\">" + (state.partnerBlood ? state.partnerBlood + "型" : "相手") + "</span></div>";
    html += "</div>";

    html += '<div class="gauge" style="--p:' + sc.total + '" role="img" aria-label="相性スコア' + sc.total + 'パーセント">' +
      '<div class="gauge-inner"><span class="gauge-num">' + sc.total + "<small>%</small></span>" +
      '<span class="gauge-label">MATCH</span></div></div>';
    html += '<p class="score-scale"><span>20</span><span>' + scoreComment(sc.total) + "</span><span>100</span></p>";
    html += '<p class="score-note">※ スコアは「あなたの星座」から見た相性です</p>';
    html += '<h3 class="compat-title">' + esc(entry.t) + "</h3>";
    html += '<div class="keywords">' + entry.k.map(function (k) { return "<span>" + esc(k) + "</span>"; }).join("") + "</div>";
    html += "</div>";
    html += compatShare(true);

    html += '<div class="sect"><h3 class="sect-title">ふたりの読み解き <small>READING</small></h3><div class="prose">' +
      entry.b.map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("") + "</div></div>";

    html += '<div class="sect"><h3 class="sect-title">関係別の攻略法 <small>HOW TO</small></h3>';
    html += '<div class="relation-tabs" role="group" aria-label="関係の種類">';
    Object.keys(RELATIONS).forEach(function (k) {
      html += '<button type="button" data-relation="' + k + '" class="' + (state.relation === k ? "is-on" : "") + '">' + RELATIONS[k].label + "</button>";
    });
    html += "</div>";
    html += '<div class="relation-box" id="relation-box">';
    html += '<p class="hint" style="margin-bottom:8px">' + esc(rel.frame) + "</p>";
    html += paras.map(function (p, i) { return "<p>" + esc(p) + "</p>"; }).join("");
    html += "</div></div>";

    html += '<div class="blood-note"><p class="bt">血液型の補正' +
      (bk ? '<span class="diff ' + (sc.add > 0 ? "plus" : sc.add < 0 ? "minus" : "zero") + '">' + (sc.add > 0 ? "+" : "") + sc.add + "</span>" : "") +
      "</p><p>" +
      (bk ? esc(BP[bk].note) + "（星座スコア " + sc.base + " → " + sc.total + "）"
          : "ふたりの血液型をえらぶと、相性にひとこと補正が入ります。") +
      "</p></div>";

    html += '<button type="button" class="inline-link" data-goto-div="' + ptKey + '">' + esc(theirs.name) + "の運勢を見る →</button>";
    html += "</div>";

    html += '<div class="result-card share-card">' + compatShare(false) + "</div>";
    return html;
  }

  function renderCompat() {
    var area = $("#compat-result");
    area.innerHTML = compatHTML();
    var tabs = $(".relation-tabs", area);
    if (tabs) {
      tabs.addEventListener("click", function (e) {
        var b = e.target.closest("button[data-relation]");
        if (!b) { return; }
        state.relation = b.getAttribute("data-relation");
        renderCompat();
        trackEvent("relation_change", { relation: state.relation, my_sign: state.sign, partner_sign: state.partner });
      });
    }
  }

  /* ---------------- render: 12 list ---------------- */
  function renderList() {
    var host = $("#sign-cards");
    host.innerHTML = ORDER.map(function (k) {
      var s = SIGNS[k];
      var el = ELEMENTS[s.element];
      var html = '<button type="button" class="sign-card" data-sign="' + k + '">';
      html += '<div class="sc-top"><span class="sym" aria-hidden="true">' + s.symbol + "</span>";
      html += '<span><span class="nm">' + esc(s.name) + "</span><br><span class=\"dt\">" + esc(s.dates) + " / " + el.ja + " / " + esc(s.ruler) + "</span></span></div>";
      html += '<p class="cch">' + esc(s.catch) + "</p>";
      html += '<div class="sc-bot"><span>総合</span>';
      html += '<span class="stars" aria-label="総合5段階中' + s.rates.overall + '">' + starRow(s.rates.overall) + "</span></div>";
      html += "</button>";
      return html;
    }).join("");

    host.addEventListener("click", function (e) {
      var card = e.target.closest(".sign-card");
      if (!card) { return; }
      var key = card.getAttribute("data-sign");
      setSign(key);
      switchTab("divination");
      window.scrollTo({ top: $("#panel-divination").offsetTop - 90, behavior: "smooth" });
    });
  }

  /* ---------------- tabs ---------------- */
  function switchTab(name) {
    var prevTab = state.tab;
    state.tab = name;
    $all(".tab").forEach(function (t) {
      var on = t.getAttribute("data-tab") === name;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
    });
    $all(".panel").forEach(function (p) {
      var on = p.id === "panel-" + name;
      p.classList.toggle("is-active", on);
      if (on) { p.removeAttribute("hidden"); } else { p.setAttribute("hidden", ""); }
    });
    try { history.replaceState(null, "", "#" + name); } catch (err) {}
    if (prevTab !== name) { trackEvent("tab_change", { tab: name, from: prevTab || "none" }); }
  }

  /* ---------------- init ---------------- */
  function init() {
    buildDateSelects();

    /* initial selections from storage / hash */
    var hash = (window.location.hash || "").replace("#", "");
    var savedSign = read("sign");
    if (hash === "compat" || hash === "list" || hash === "divination") { state.tab = hash; }

    buildSignGrid($("#sign-grid"), function (key) {
      setSign(key);
      $("#auto-sign").innerHTML = "あなたの星座は <b>" + SIGNS[key].symbol + " " + SIGNS[key].name + "</b> です";
    });
    buildSignGrid($("#my-sign-grid"), function (key) {
      state.sign = key;
      markSelected($("#my-sign-grid"), key);
      markSelected($("#sign-grid"), key);
      store("sign", key);
    });
    buildSignGrid($("#partner-sign-grid"), function (key) {
      state.partner = key;
      markSelected($("#partner-sign-grid"), key);
    });

    bindBlood($(".segmented[aria-labelledby='blood-label']"), "blood");
    bindBlood($("#my-blood"), "blood");
    bindBlood($("#partner-blood"), "partnerBlood");

    /* re-render blood-dependent parts */
    $("#blood-label") && $(".segmented[aria-labelledby='blood-label']").addEventListener("click", function () {
      if (state.sign) { renderDivination(true); }
    });
    $("#my-blood").addEventListener("click", function () {
      markSelected($("#my-sign-grid"), state.sign);
      if (state.sign) { renderDivination(true); }
    });

    /* deep link ?sign=leo or #sign=leo */
    var params = new URLSearchParams(window.location.search);
    var qSign = params.get("sign");
    var qPartner = params.get("partner");
    var qBlood = params.get("blood");
    var qPBlood = params.get("pblood");
    var BLOOD_OK = /^(A|B|O|AB)$/;
    var arrivedByShare = false;

    if (qBlood && qBlood !== "none" && BLOOD_OK.test(qBlood)) {
      state.blood = qBlood;
      markBlood($(".segmented[aria-labelledby='blood-label']"), qBlood);
      markBlood($("#my-blood"), qBlood);
    }
    if (qPBlood && BLOOD_OK.test(qPBlood)) {
      state.partnerBlood = qPBlood;
      markBlood($("#partner-blood"), qPBlood);
    }
    if (qSign && SIGNS[qSign]) { savedSign = qSign; }
    var m = (window.location.hash || "").match(/sign=([a-z]+)/);
    if (m && SIGNS[m[1]]) { savedSign = m[1]; }
    if (savedSign && SIGNS[savedSign]) {
      state.sign = savedSign;
      markSelected($("#sign-grid"), savedSign);
      markSelected($("#my-sign-grid"), savedSign);
      renderDivination(true);
    }

    /* 相性の共有リンク（?sign=leo&partner=sagittarius#compat）を復元 */
    if (qPartner && SIGNS[qPartner]) {
      state.partner = qPartner;
      markSelected($("#partner-sign-grid"), qPartner);
      if (state.sign) {
        renderCompat();
        switchTab("compat");
        arrivedByShare = true;
      }
    } else if (qSign && SIGNS[qSign]) {
      arrivedByShare = true;
    }

    if (arrivedByShare) {
      trackEvent("share_landing", { content_type: state.partner ? "compat" : "divination", sign: state.sign || "none" });
      var revealTarget = $("#" + (state.partner ? "compat" : "divination") + "-result");
      if (revealTarget) {
        setTimeout(function () {
          var tabsEl = $(".tabs");
          var tabsTop = tabsEl ? (parseInt(window.getComputedStyle(tabsEl).top, 10) || 0) : 0;
          var offset = tabsTop + (tabsEl ? tabsEl.offsetHeight : 0) + 12;
          var top = revealTarget.getBoundingClientRect().top + window.pageYOffset - offset;
          window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
        }, 150);
      }
    }

    /* buttons */
    $("#btn-divine").addEventListener("click", function () {
      if (!state.sign) {
        var auto = $("#auto-sign");
        auto.textContent = "先に星座をえらんでください（生年月日でもOK）";
        $("#sign-grid").scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      renderDivination(false);
      trackEvent("divination_lookup", { method: "button", sign: state.sign, blood: state.blood || "none" });
      $("#divination-result").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    $("#btn-compat").addEventListener("click", function () {
      if (!state.sign || !state.partner) {
        var hint = document.createElement("p");
        hint.className = "auto-sign";
        hint.textContent = !state.sign ? "あなたの星座をえらんでください" : "相手の星座をえらんでください";
        var box = $(".compat-pickers");
        var old = $(".compat-hint");
        if (old) { old.remove(); }
        hint.classList.add("compat-hint");
        hint.style.textAlign = "center";
        box.insertAdjacentElement("afterend", hint);
        return;
      }
      var old2 = $(".compat-hint");
      if (old2) { old2.remove(); }
      renderCompat();
      trackEvent("compat_lookup", {
        my_sign: state.sign,
        partner_sign: state.partner,
        relation: state.relation,
        score: compatScore(state.sign, state.partner).total
      });
      $("#compat-result").scrollIntoView({ behavior: "smooth", block: "start" });
    });

    /* header / hero jump links */
    $all("[data-jump]").forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        switchTab(a.getAttribute("data-jump"));
        window.scrollTo({ top: $("#tabs").offsetTop - 70, behavior: "smooth" });
      });
    });

    /* delegated result links */
    document.addEventListener("click", function (e) {
      /* 共有クリック（X / LINE） */
      var shareX = e.target.closest(".share-x");
      var shareLine = e.target.closest(".share-line");
      if (shareX || shareLine) {
        trackEvent("share_click", { method: shareX ? "x" : "line", content_type: resultTypeOf(e.target) });
      }
      /* PayPal プレミアム鑑定ボタン */
      if (e.target.closest(".btn-paypal")) {
        trackEvent("premium_click", { item_name: "1:1 Premium Reading (PDF)", value: 1500, currency: "JPY" });
      }
      var copyBtn = e.target.closest("[data-copy-url]");
      if (copyBtn) {
        var urlToCopy = copyBtn.getAttribute("data-copy-url") || "";
        var copyType = resultTypeOf(copyBtn);
        copyText(urlToCopy).then(function (ok) {
          trackEvent("share_click", { method: "copy", content_type: copyType, success: !!ok });
          toast(ok ? "コピーしました！" : "コピーできませんでした。URLを長押しでコピーしてね");
        });
        return;
      }
      var toCompat = e.target.closest("[data-goto-compat]");
      if (toCompat) {
        var key = toCompat.getAttribute("data-goto-compat");
        markSelected($("#my-sign-grid"), key);
        state.partner = state.partner || null;
        switchTab("compat");
        window.scrollTo({ top: $("#tabs").offsetTop - 70, behavior: "smooth" });
        return;
      }
      var toDiv = e.target.closest("[data-goto-div]");
      if (toDiv) {
        var k2 = toDiv.getAttribute("data-goto-div");
        setSign(k2);
        switchTab("divination");
        window.scrollTo({ top: $("#tabs").offsetTop - 70, behavior: "smooth" });
      }
    });

    /* hash change (back/forward, in-page links) */
    window.addEventListener("hashchange", function () {
      var h = (window.location.hash || "").replace("#", "");
      if (h === "divination" || h === "compat" || h === "list") { switchTab(h); }
    });

    /* tab clicks */
    $all(".tab").forEach(function (t) {
      t.addEventListener("click", function () { switchTab(t.getAttribute("data-tab")); });
    });

    renderList();

    if (state.sign) {
      autoMessage();
    }
    if (state.tab === "compat" || hash === "compat") { switchTab("compat"); }

    function autoMessage() {
      if (!state.sign) { return; }
      $("#auto-sign").innerHTML = "あなたの星座は <b>" + SIGNS[state.sign].symbol + " " + SIGNS[state.sign].name + "</b> です";
    }
    autoMessage();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
