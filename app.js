(function () {
  const DATA = window.__SHARE_DATA__;
  if (!DATA) return;

  const THEME_COLORS = {
    studio: "#080a0f",
    americana: "#0f0c09",
    lsu: "#140824",
  };
  const THEME_ALIASES = {
    studio: "studio",
    cyan: "studio",
    studio_cyan: "studio",
    "studio-cyan": "studio",
    americana: "americana",
    gold: "americana",
    americana_gold: "americana",
    "americana-gold": "americana",
    lsu: "lsu",
    purple: "lsu",
    gameday: "lsu",
    lsu_gameday: "lsu",
    "lsu-gameday": "lsu",
  };

  function normalizeTheme(val) {
    const key = String(val || "").trim().toLowerCase().replace(/\s+/g, "_");
    return THEME_ALIASES[key] || DATA.default_theme || "studio";
  }

  function applyTheme(themeId, updateUrl) {
    const t = normalizeTheme(themeId);
    document.body.dataset.theme = t;
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute("content", THEME_COLORS[t] || "#080a0f");
    document.querySelectorAll("[data-set-theme]").forEach((btn) => {
      const active = btn.dataset.setTheme === t;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
    if (updateUrl && window.history && window.history.replaceState) {
      try {
        const u = new URL(window.location.href);
        u.searchParams.set("theme", t);
        window.history.replaceState(null, "", u.toString());
      } catch (_) {}
    }
  }

  const params = new URLSearchParams(window.location.search);
  const initialTheme = params.get("theme") ? normalizeTheme(params.get("theme")) : (DATA.default_theme || "studio");
  applyTheme(initialTheme, false);

  document.querySelectorAll("[data-set-theme]").forEach((btn) => {
    btn.addEventListener("click", () => applyTheme(btn.dataset.setTheme, true));
  });

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // Persistent Audio Dock
  const dock = document.getElementById("audioDock");
  const dockAudio = document.getElementById("dockAudio");
  const dockTitle = document.getElementById("dockTitle");
  const dockMode = document.getElementById("dockMode");
  const dockDl = document.getElementById("dockDl");
  let activePlayBtn = null;
  let hookTimer = null;

  function clearPlayingMarkers() {
    if (activePlayBtn) activePlayBtn.classList.remove("is-playing");
    activePlayBtn = null;
  }

  function pauseHeroMedia() {
    const hv = document.getElementById("heroVideoEl");
    if (hv && typeof hv.pause === "function") hv.pause();
  }

  function playInDock({ title, modeLabel, url, seekSec = 0, autoStopSec = 0, dlUrl = "", dlName = "track.mp3", btn = null }) {
    if (!url) return;
    clearTimeout(hookTimer);
    clearPlayingMarkers();
    pauseHeroMedia();
    if (btn) {
      activePlayBtn = btn;
      btn.classList.add("is-playing");
    }
    dock.classList.add("show");
    dockTitle.textContent = title;
    dockMode.textContent = modeLabel;
    if (dlUrl || url) {
      dockDl.href = dlUrl || url;
      dockDl.download = dlName || "track.mp3";
      dockDl.style.display = "inline-flex";
    } else {
      dockDl.style.display = "none";
    }
    dockAudio.src = url;
    if (seekSec > 0) {
      dockAudio.addEventListener("loadedmetadata", () => {
        try { dockAudio.currentTime = seekSec; } catch (_) {}
        dockAudio.play().catch(() => {});
      }, { once: true });
    } else {
      dockAudio.addEventListener("canplay", () => {
        dockAudio.play().catch(() => {});
      }, { once: true });
    }
    dockAudio.load();
    dockAudio.play().catch(() => {});
    if (autoStopSec > 0) {
      hookTimer = setTimeout(() => {
        dockAudio.pause();
        dockMode.textContent = "Hook clip ended — tap Full Song or Download MP3";
        clearPlayingMarkers();
      }, autoStopSec * 1000);
    }
  }

  dockAudio.addEventListener("ended", clearPlayingMarkers);
  dockAudio.addEventListener("pause", () => clearTimeout(hookTimer));

  // Hero inline playback (YouTube embed or local Studio MP4)
  const heroStage = document.getElementById("heroStage");
  const heroInlineBtn = document.getElementById("heroWatchInlineBtn");
  const heroPosterBtn = document.getElementById("heroPosterBtn");

  function playHeroInline() {
    const h = DATA.hero;
    dockAudio.pause();
    clearPlayingMarkers();
    if (h.youtube_embed_url) {
      heroStage.innerHTML = `<iframe src="${esc(h.youtube_embed_url)}" title="${esc(h.title)} video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
      return;
    }
    if (h.mp4_url) {
      heroStage.innerHTML = `<video id="heroVideoEl" controls autoplay playsinline poster="${esc(h.poster_url || "")}" src="${esc(h.mp4_url)}"></video>`;
      const hv = document.getElementById("heroVideoEl");
      if (hv) hv.play().catch(() => {});
      return;
    }
    if (h.hook_audio_url || h.full_audio_url) {
      playInDock({
        title: `${h.title} · Audio Preview`,
        modeLabel: h.hook_audio_url ? "Video Cut Audio" : "Full Track",
        url: h.hook_audio_url || h.full_audio_url,
        dlUrl: h.full_audio_url || h.hook_audio_url,
        dlName: h.full_dl_name || "track.mp3",
      });
    }
  }

  if (heroInlineBtn) heroInlineBtn.addEventListener("click", playHeroInline);
  if (heroPosterBtn) heroPosterBtn.addEventListener("click", playHeroInline);

  const heroHookBtn = document.getElementById("heroPlayHookBtn");
  if (heroHookBtn) {
    heroHookBtn.addEventListener("click", () => {
      const h = DATA.hero;
      const hookUrl = h.hook_audio_url || h.full_audio_url;
      playInDock({
        title: `${h.title} · ${h.duration_sec}s Video Cut`,
        modeLabel: `${h.duration_sec}s Cut Audio`,
        url: hookUrl,
        dlUrl: h.full_audio_url || hookUrl,
        dlName: h.full_dl_name || "Moonbeam_Full.mp3",
        btn: heroHookBtn,
      });
    });
  }

  const heroFullBtn = document.getElementById("heroPlayFullBtn");
  if (heroFullBtn) {
    heroFullBtn.addEventListener("click", () => {
      const h = DATA.hero;
      const fullUrl = h.full_audio_url || h.hook_audio_url;
      playInDock({
        title: `${h.title} · Full Song (${h.full_duration_label || "Full"})`,
        modeLabel: "Full Track",
        url: fullUrl,
        dlUrl: fullUrl,
        dlName: h.full_dl_name || "Moonbeam_Full.mp3",
        btn: heroFullBtn,
      });
    });
  }

  // Video Modal Dialog (native <dialog> + closedby fallback)
  const vidModal = document.getElementById("vidModal");
  const vidModalStage = document.getElementById("vidModalStage");
  const vidModalTitle = document.getElementById("vidModalTitle");
  const vidModalYt = document.getElementById("vidModalYt");
  const vidModalDlMp3 = document.getElementById("vidModalDlMp3");
  const vidModalDlMp4 = document.getElementById("vidModalDlMp4");

  if (vidModal && !("closedBy" in HTMLDialogElement.prototype)) {
    const outside = (e) => {
      const r = vidModal.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };
    let pressedOutside = false;
    vidModal.addEventListener("pointerdown", (e) => { pressedOutside = outside(e); });
    vidModal.addEventListener("pointerup", (e) => { if (pressedOutside && outside(e)) vidModal.close(); });
  }

  function resetVidModal() {
    vidModalStage.innerHTML = "";
    vidModal.returnValue = "";
  }
  if (vidModal) vidModal.addEventListener("close", resetVidModal);
  const vidModalClose = document.getElementById("vidModalClose");
  if (vidModalClose) vidModalClose.addEventListener("click", () => vidModal.close());

  function openVideoCard(v) {
    pauseHeroMedia();
    dockAudio.pause();
    clearPlayingMarkers();
    vidModalTitle.textContent = v.artist ? `${v.title} · ${v.artist}` : v.title;

    if (v.youtube_url) {
      vidModalYt.href = v.youtube_url;
      vidModalYt.style.display = "inline-flex";
    } else {
      vidModalYt.style.display = "none";
    }

    if (v.audio_url) {
      vidModalDlMp3.href = v.audio_url;
      vidModalDlMp3.download = v.dl_name || "track.mp3";
      vidModalDlMp3.style.display = "inline-flex";
    } else {
      vidModalDlMp3.style.display = "none";
    }

    if (DATA.allow_mp4_download && v.mp4_url) {
      vidModalDlMp4.href = v.mp4_url;
      vidModalDlMp4.download = v.mp4_dl_name || "video.mp4";
      vidModalDlMp4.style.display = "inline-flex";
    } else {
      vidModalDlMp4.style.display = "none";
    }

    if (v.youtube_embed_url) {
      vidModalStage.innerHTML = `<iframe src="${esc(v.youtube_embed_url)}" title="${esc(v.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
    } else if (v.mp4_url) {
      vidModalStage.innerHTML = `<video controls autoplay playsinline poster="${esc(v.poster_url || "")}" src="${esc(v.mp4_url)}"></video>`;
    } else {
      vidModalStage.innerHTML = `<div class="modal-fallback"><div><strong>YouTube link not added yet.</strong><br>Use Listen / Download MP3 below to hear the track now.</div></div>`;
    }
    vidModal.showModal();
  }

  // Render Video Grid inside Listen to More
  const vGrid = document.getElementById("videoGrid");
  if (vGrid) {
    const videos = DATA.videos || [];
    const videoSectionHead = document.getElementById("videosSectionHead");
    if (!videos.length && videoSectionHead) videoSectionHead.style.display = "none";
    vGrid.innerHTML = videos.map((v, i) => {
      const sourceLabel = v.youtube_url ? "YouTube" : (v.mp4_url ? "Studio Video" : "Audio + Art");
      const watchActionHtml = v.youtube_url
        ? `<a class="btn sm primary" href="${esc(v.youtube_url)}" target="_blank" rel="noopener">▶ Watch on YouTube ↗</a>`
        : `<button type="button" class="btn sm primary" data-play-vid="${i}">▶ Watch</button>`;
      const shortBtnHtml = v.youtube_short_url
        ? `<a class="btn sm" href="${esc(v.youtube_short_url)}" target="_blank" rel="noopener">📱 9:16 Short ↗</a>`
        : "";
      const dlMp4Html = DATA.allow_mp4_download && v.mp4_url
        ? `<a class="btn sm" href="${esc(v.mp4_url)}" download="${esc(v.mp4_dl_name || "video.mp4")}">DL MP4 ↓</a>`
        : "";
      const audioBtnsHtml = v.audio_url
        ? `
          <button type="button" class="btn sm" data-vlisten="${i}">♫ Listen MP3</button>
          <a class="btn sm" href="${esc(v.audio_url)}" download="${esc(v.dl_name || "track.mp3")}">DL MP3 ↓</a>
        `
        : "";
      return `
        <article class="vcard">
          <button type="button" class="vcard-thumb" data-play-vid="${i}" aria-label="Watch ${esc(v.title)}">
            ${v.poster_url ? `<img src="${esc(v.poster_url)}" alt="${esc(v.title)}" loading="lazy">` : ""}
            <span class="source-tag">${esc(sourceLabel)}</span>
            <span class="play-badge">▶ Watch · ${esc(v.dur || "Video")}</span>
          </button>
          <div class="vcard-body">
            <h3>${esc(v.title)}</h3>
            <p>${v.artist ? `<strong>${esc(v.artist)}</strong> — ` : ""}${esc(v.desc || "")}</p>
            <div class="vcard-actions">
              ${watchActionHtml}
              ${shortBtnHtml}
              ${audioBtnsHtml}
              ${dlMp4Html}
            </div>
          </div>
        </article>`;
    }).join("");

    vGrid.querySelectorAll("[data-play-vid]").forEach((el) => {
      el.addEventListener("click", () => {
        const v = videos[Number(el.dataset.playVid)];
        if (v) openVideoCard(v);
      });
    });
    vGrid.querySelectorAll("[data-vlisten]").forEach((el) => {
      el.addEventListener("click", () => {
        const v = videos[Number(el.dataset.vlisten)];
        if (v && v.audio_url) {
          playInDock({
            title: v.title,
            modeLabel: v.artist ? `Full Track · ${v.artist}` : "Full Track",
            url: v.audio_url,
            dlUrl: v.audio_url,
            dlName: v.dl_name || "track.mp3",
            btn: el,
          });
        }
      });
    });
  }

  // Render Layered Song Catalog inside Listen to More
  const tList = document.getElementById("trackList");
  if (tList) {
    const tracks = DATA.tracks || [];
    const trackSectionHead = document.getElementById("tracksSectionHead");
    if (!tracks.length && trackSectionHead) trackSectionHead.style.display = "none";
    tList.innerHTML = tracks.map((t, i) => {
      const hookSecs = t.hook_duration_sec || 30;
      const ytBtns = [
        t.youtube_url ? `<a class="btn sm" href="${esc(t.youtube_url)}" target="_blank" rel="noopener">▶ Video ↗</a>` : "",
        t.youtube_short_url ? `<a class="btn sm" href="${esc(t.youtube_short_url)}" target="_blank" rel="noopener">📱 Short ↗</a>` : "",
        t.youtube_lyric_url ? `<a class="btn sm" href="${esc(t.youtube_lyric_url)}" target="_blank" rel="noopener">▶ Lyric Video ↗</a>` : "",
      ].filter(Boolean).join("");
      return `
        <div class="trow">
          ${t.cover_url ? `<img src="${esc(t.cover_url)}" alt="${esc(t.title)}" loading="lazy">` : `<div></div>`}
          <div>
            <div class="trow-title">${esc(t.title)}</div>
            <div class="trow-sub">${esc(t.artist)}</div>
            ${t.hook_quote ? `<div class="trow-hook">${esc(t.hook_quote)}</div>` : ""}
          </div>
          <div class="trow-actions">
            <button type="button" class="btn sm primary" data-hook="${i}">▶ ${hookSecs}s Clip</button>
            <button type="button" class="btn sm" data-full="${i}">♫ Full Song</button>
            <a class="btn sm" href="${esc(t.full_audio_url || t.hook_audio_url)}" download="${esc(t.dl_name || "track.mp3")}">DL MP3 ↓</a>
            ${ytBtns}
          </div>
        </div>
      `;
    }).join("");

    tList.querySelectorAll("[data-hook]").forEach((b) => {
      b.addEventListener("click", () => {
        const t = tracks[Number(b.dataset.hook)];
        if (!t) return;
        const hookSecs = t.hook_duration_sec || 30;
        const isDedicatedHook = t.hook_audio_asset && t.hook_audio_asset !== t.full_audio_asset;
        playInDock({
          title: t.title,
          modeLabel: `${hookSecs}s Smart Hook Clip`,
          url: t.hook_audio_url || t.full_audio_url,
          seekSec: isDedicatedHook ? 0 : (t.hook_start_sec || 0),
          autoStopSec: isDedicatedHook ? 0 : hookSecs,
          dlUrl: t.full_audio_url || t.hook_audio_url,
          dlName: t.dl_name || "track.mp3",
          btn: b,
        });
      });
    });

    tList.querySelectorAll("[data-full]").forEach((b) => {
      b.addEventListener("click", () => {
        const t = tracks[Number(b.dataset.full)];
        if (!t) return;
        playInDock({
          title: t.title,
          modeLabel: "Full Song",
          url: t.full_audio_url || t.hook_audio_url,
          dlUrl: t.full_audio_url || t.hook_audio_url,
          dlName: t.dl_name || "track.mp3",
          btn: b,
        });
      });
    });
  }

  // Copy Link button
  const copyTimers = new WeakMap();
  let lastAnnounced = "";
  function reportCopy(btn, ok) {
    const tip = btn.nextElementSibling;
    if (!tip) return;
    clearTimeout(copyTimers.get(btn));
    btn.removeAttribute("data-copied");
    btn.removeAttribute("data-failed");
    let msg = ok ? "Copied!" : "Copy failed";
    if (msg === lastAnnounced) msg += "\u00A0";
    lastAnnounced = msg;
    tip.textContent = "";
    void btn.offsetWidth;
    btn.setAttribute(ok ? "data-copied" : "data-failed", "");
    requestAnimationFrame(() => { tip.textContent = msg; });
    copyTimers.set(btn, setTimeout(() => {
      btn.removeAttribute("data-copied");
      btn.removeAttribute("data-failed");
      tip.textContent = "";
    }, 2200));
  }
  function legacyCopy(text) {
    const ta = Object.assign(document.createElement("textarea"), { value: text });
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;inset-block-start:0;opacity:0";
    document.body.append(ta);
    ta.select();
    try { return document.execCommand("copy"); } finally { ta.remove(); }
  }
  const shareBtn = document.getElementById("visitorShareBtn");
  if (shareBtn) {
    shareBtn.addEventListener("click", async () => {
      const shareUrl = window.location.href;
      if (navigator.share) {
        try {
          await navigator.share({
            title: `${DATA.brand_name} · ${DATA.hero.title}`,
            text: `Check out "${DATA.hero.title}" by ${DATA.hero.artist}:`,
            url: shareUrl,
          });
          return;
        } catch (_) {}
      }
      try {
        await navigator.clipboard.writeText(shareUrl);
        reportCopy(shareBtn, true);
      } catch (_) {
        reportCopy(shareBtn, legacyCopy(shareUrl));
      }
    });
  }
})();
