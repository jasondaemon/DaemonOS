export function createApp() {
  const content = document.createElement("div");
  content.className = "musicplayer-app";

  const controller = new AbortController();
  const { signal } = controller;

  const header = document.createElement("div");
  header.className = "musicplayer-header";

  const display = document.createElement("div");
  display.className = "musicplayer-display";
  display.innerHTML = `
    <div class="musicplayer-title">Daemonamp</div>
    <div class="musicplayer-track">No track loaded</div>
    <div class="musicplayer-meta">--:--</div>
  `;

  const controls = document.createElement("div");
  controls.className = "musicplayer-controls";

  const btnPrev = document.createElement("button");
  btnPrev.className = "menu-button";
  btnPrev.textContent = "◀◀";

  const btnPlay = document.createElement("button");
  btnPlay.className = "menu-button";
  btnPlay.textContent = "Play";

  const btnNext = document.createElement("button");
  btnNext.className = "menu-button";
  btnNext.textContent = "▶▶";

  const btnStop = document.createElement("button");
  btnStop.className = "menu-button";
  btnStop.textContent = "Stop";

  const btnShuffle = document.createElement("button");
  btnShuffle.className = "menu-button";
  btnShuffle.textContent = "Shuffle";

  const btnRepeat = document.createElement("button");
  btnRepeat.className = "menu-button";
  btnRepeat.textContent = "Repeat";

  const progress = document.createElement("input");
  progress.type = "range";
  progress.min = "0";
  progress.max = "100";
  progress.value = "0";
  progress.className = "musicplayer-progress";

  const visualToggle = document.createElement("label");
  visualToggle.className = "musicplayer-toggle";
  visualToggle.innerHTML = `<input type="checkbox" checked /> Visualizer`;
  const visualCheckbox = visualToggle.querySelector("input");

  const visualSelect = document.createElement("select");
  visualSelect.className = "musicplayer-visual-select";
  const visualModes = [
    { id: "bars", label: "Spectrum Bars" },
    { id: "wave", label: "Waveform" },
    { id: "dots", label: "Neon Dots" },
    { id: "stack", label: "Stacked Columns" },
    { id: "scan", label: "Spectrum Line" },
    { id: "waterfall", label: "Waterfall Glow" },
    { id: "vu", label: "VU Blocks" },
  ];
  visualModes.forEach((mode) => {
    const option = document.createElement("option");
    option.value = mode.id;
    option.textContent = mode.label;
    visualSelect.appendChild(option);
  });

  controls.append(btnPrev, btnPlay, btnNext, btnStop, btnShuffle, btnRepeat);

  const playlistWrap = document.createElement("div");
  playlistWrap.className = "musicplayer-playlist";
  const playlistTitle = document.createElement("div");
  playlistTitle.className = "musicplayer-section-title";
  playlistTitle.textContent = "Playlist";
  const playlist = document.createElement("div");
  playlist.className = "musicplayer-list";
  const playlistHint = document.createElement("div");
  playlistHint.className = "menu-hint";
  playlistHint.textContent = "Drop tracks into /site/media/music and update playlist.json.";
  playlistWrap.append(playlistTitle, playlist, playlistHint);

  const visualizer = document.createElement("canvas");
  visualizer.className = "musicplayer-visualizer";

  header.append(display, controls, progress, visualToggle, visualSelect, visualizer);
  content.append(header, playlistWrap);

  const audio = new Audio();
  audio.preload = "metadata";

  let audioContext = null;
  let analyser = null;
  let animationId = null;
  let playlistData = [];
  let currentIndex = -1;
  let shuffleEnabled = false;
  let repeatEnabled = false;
  let isPlaying = false;
  let visualMode = "bars";

  const updateDisplay = () => {
    const trackEl = display.querySelector(".musicplayer-track");
    const metaEl = display.querySelector(".musicplayer-meta");
    const track = playlistData[currentIndex];
    if (!track) {
      trackEl.textContent = "No track loaded";
      metaEl.textContent = "--:--";
      return;
    }
    trackEl.textContent = `${track.title || track.file} ${track.artist ? `• ${track.artist}` : ""}`;
    metaEl.textContent = formatTime(audio.currentTime) + " / " + formatTime(audio.duration || 0);
  };

  const formatTime = (value) => {
    if (!Number.isFinite(value)) return "--:--";
    const minutes = Math.floor(value / 60);
    const seconds = Math.floor(value % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const setActiveItem = () => {
    Array.from(playlist.children).forEach((item, idx) => {
      item.classList.toggle("active", idx === currentIndex);
    });
  };

  const loadTrack = (index) => {
    if (!playlistData.length) return;
    const safeIndex = (index + playlistData.length) % playlistData.length;
    const track = playlistData[safeIndex];
    currentIndex = safeIndex;
    audio.src = track.file;
    audio.currentTime = 0;
    updateDisplay();
    setActiveItem();
  };

  const startPlayback = async () => {
    if (!audio.src) return;
    try {
      await audio.play();
      isPlaying = true;
      btnPlay.textContent = "Pause";
      setupVisualizer();
    } catch {
      // ignore autoplay restrictions
    }
  };

  const pausePlayback = () => {
    audio.pause();
    isPlaying = false;
    btnPlay.textContent = "Play";
  };

  const stopPlayback = () => {
    audio.pause();
    audio.currentTime = 0;
    isPlaying = false;
    btnPlay.textContent = "Play";
    updateDisplay();
  };

  const nextTrack = () => {
    if (!playlistData.length) return;
    if (shuffleEnabled && playlistData.length > 1) {
      let next = currentIndex;
      while (next === currentIndex) {
        next = Math.floor(Math.random() * playlistData.length);
      }
      loadTrack(next);
    } else {
      loadTrack(currentIndex + 1);
    }
    if (isPlaying) startPlayback();
  };

  const prevTrack = () => {
    if (!playlistData.length) return;
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    loadTrack(currentIndex - 1);
    if (isPlaying) startPlayback();
  };

  btnPlay.addEventListener("click", () => {
    if (isPlaying) {
      pausePlayback();
    } else {
      startPlayback();
    }
  }, { signal });
  btnPrev.addEventListener("click", prevTrack, { signal });
  btnNext.addEventListener("click", nextTrack, { signal });
  btnStop.addEventListener("click", stopPlayback, { signal });
  btnShuffle.addEventListener("click", () => {
    shuffleEnabled = !shuffleEnabled;
    btnShuffle.classList.toggle("active", shuffleEnabled);
  }, { signal });
  btnRepeat.addEventListener("click", () => {
    repeatEnabled = !repeatEnabled;
    btnRepeat.classList.toggle("active", repeatEnabled);
  }, { signal });

  progress.addEventListener("input", () => {
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
    const pct = Number(progress.value) / 100;
    audio.currentTime = pct * audio.duration;
    updateDisplay();
  }, { signal });

  audio.addEventListener("timeupdate", () => {
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
    progress.value = String(Math.min(100, (audio.currentTime / audio.duration) * 100));
    updateDisplay();
  }, { signal });

  audio.addEventListener("ended", () => {
    if (repeatEnabled) {
      nextTrack();
    } else if (currentIndex < playlistData.length - 1) {
      nextTrack();
    } else {
      stopPlayback();
    }
  }, { signal });

  const setupVisualizer = () => {
    if (!visualCheckbox.checked) {
      stopVisualizer();
      return;
    }
    if (!audioContext) {
      audioContext = new AudioContext();
      const source = audioContext.createMediaElementSource(audio);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyser.connect(audioContext.destination);
    }
    audioContext.resume();
    startVisualizer();
  };

  const startVisualizer = () => {
    stopVisualizer();
    const ctx = visualizer.getContext("2d");
    const buffer = new Uint8Array(analyser.frequencyBinCount);
    const timeBuffer = new Uint8Array(analyser.fftSize);
    const draw = () => {
      if (!visualCheckbox.checked || !analyser) return;
      const w = visualizer.width;
      const h = visualizer.height;
      ctx.clearRect(0, 0, w, h);
      if (visualMode === "wave") {
        analyser.getByteTimeDomainData(timeBuffer);
        const grad = ctx.createLinearGradient(0, 0, w, 0);
        grad.addColorStop(0, "rgba(120, 255, 224, 0.9)");
        grad.addColorStop(0.5, "rgba(120, 180, 255, 0.9)");
        grad.addColorStop(1, "rgba(255, 120, 180, 0.9)");
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        timeBuffer.forEach((value, idx) => {
          const x = (idx / (timeBuffer.length - 1)) * w;
          const y = (value / 255) * h;
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      } else {
        analyser.getByteFrequencyData(buffer);
        const barWidth = Math.max(2, (w / buffer.length) * 2);
        if (visualMode === "bars") {
          buffer.forEach((value, idx) => {
            const height = (value / 255) * h;
            const hue = (idx / buffer.length) * 300 + 40;
            ctx.fillStyle = `hsla(${hue}, 80%, 65%, 0.9)`;
            ctx.fillRect(idx * barWidth, h - height, barWidth - 1, height);
          });
        } else if (visualMode === "dots") {
          buffer.forEach((value, idx) => {
            const x = idx * barWidth;
            const y = h - (value / 255) * h;
            const radius = Math.max(2, (value / 255) * 5);
            const hue = 200 + (value / 255) * 120;
            ctx.fillStyle = `hsla(${hue}, 85%, 70%, 0.9)`;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
          });
        } else if (visualMode === "stack") {
          const segments = 6;
          buffer.forEach((value, idx) => {
            const height = (value / 255) * h;
            const segmentHeight = height / segments;
            for (let i = 0; i < segments; i += 1) {
              const y = h - (i + 1) * segmentHeight;
              const hue = 180 + i * 18 + (idx / buffer.length) * 120;
              ctx.fillStyle = `hsla(${hue}, 80%, 60%, ${0.25 + i * 0.1})`;
              ctx.fillRect(idx * barWidth, y, barWidth - 2, segmentHeight - 2);
            }
          });
        } else if (visualMode === "scan") {
          const grad = ctx.createLinearGradient(0, 0, 0, h);
          grad.addColorStop(0, "rgba(255, 214, 102, 0.9)");
          grad.addColorStop(1, "rgba(255, 120, 180, 0.85)");
          ctx.strokeStyle = grad;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          buffer.forEach((value, idx) => {
            const x = idx * barWidth;
            const y = h - (value / 255) * h;
            if (idx === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.stroke();
        } else if (visualMode === "waterfall") {
          buffer.forEach((value, idx) => {
            const height = (value / 255) * h;
            const glow = Math.max(2, height * 0.08);
            const hue = 260 - (idx / buffer.length) * 160;
            ctx.fillStyle = `hsla(${hue}, 85%, 60%, 0.9)`;
            ctx.fillRect(idx * barWidth, h - height, barWidth - 1, height);
            ctx.fillStyle = `hsla(${hue}, 90%, 70%, 0.35)`;
            ctx.fillRect(idx * barWidth, h - height - glow, barWidth - 1, glow);
          });
        } else if (visualMode === "vu") {
          const blockSize = Math.max(6, Math.floor(h / 10));
          buffer.forEach((value, idx) => {
            const levels = Math.floor((value / 255) * (h / blockSize));
            for (let l = 0; l < levels; l += 1) {
              const y = h - (l + 1) * blockSize;
              const hue = 120 + l * 12;
              ctx.fillStyle = `hsla(${hue}, 90%, 55%, 0.95)`;
              ctx.fillRect(idx * barWidth, y, barWidth - 2, blockSize - 2);
            }
          });
        }
      }
      animationId = requestAnimationFrame(draw);
    };
    draw();
  };

  const stopVisualizer = () => {
    if (animationId) cancelAnimationFrame(animationId);
    animationId = null;
    const ctx = visualizer.getContext("2d");
    ctx.clearRect(0, 0, visualizer.width, visualizer.height);
  };

  visualCheckbox.addEventListener("change", () => {
    if (visualCheckbox.checked && isPlaying) {
      setupVisualizer();
    } else {
      stopVisualizer();
    }
  }, { signal });

  visualSelect.addEventListener("change", () => {
    visualMode = visualSelect.value;
    if (visualCheckbox.checked && isPlaying) {
      startVisualizer();
    }
  }, { signal });

  const resizeObserver = new ResizeObserver(() => {
    const rect = visualizer.getBoundingClientRect();
    visualizer.width = Math.max(1, Math.floor(rect.width));
    visualizer.height = Math.max(1, Math.floor(rect.height));
  });
  resizeObserver.observe(visualizer);

  const renderPlaylist = () => {
    playlist.innerHTML = "";
    playlistData.forEach((track, idx) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "musicplayer-item";
      item.textContent = `${idx + 1}. ${track.title || track.file}${track.artist ? ` — ${track.artist}` : ""}`;
      item.addEventListener("click", () => {
        loadTrack(idx);
        startPlayback();
      }, { signal });
      playlist.appendChild(item);
    });
    setActiveItem();
  };

  fetch("/media/music/playlist.json")
    .then((res) => (res.ok ? res.json() : []))
    .then((data) => {
      playlistData = Array.isArray(data) ? data : [];
      if (playlistData.length) {
        loadTrack(0);
      }
      renderPlaylist();
    })
    .catch(() => {
      playlistData = [];
      renderPlaylist();
    });

  const observer = new MutationObserver(() => {
    if (!content.isConnected) {
      observer.disconnect();
      controller.abort();
      stopVisualizer();
      resizeObserver.disconnect();
      audio.pause();
      audio.src = "";
      if (audioContext) {
        audioContext.close();
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  return {
    title: "Music Player",
    width: 640,
    height: 520,
    content,
  };
}
