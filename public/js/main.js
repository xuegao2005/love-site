(function () {
  // ========== Fetch Data ==========
  let siteData = null;

  async function loadData() {
    try {
      const res = await fetch('/api/site');
      siteData = await res.json();
      applySiteData();
      renderSections();
      renderNotes();
      renderMemorialCount();
      renderProgressDots();
      initMusicPlayer();
    } catch (e) {
      console.error('加载数据失败:', e);
    }
  }

  function applySiteData() {
    if (!siteData) return;
    const s = siteData.site;
    document.getElementById('coverTitle').textContent = s.title;
    document.getElementById('coverSubtitle').textContent = s.subtitle;
    document.getElementById('coverGreeting').textContent = s.greeting;
    document.getElementById('endingTitle').textContent = s.ending;
    document.getElementById('endingNote').textContent = `From ${s.boyName} · ${new Date().getFullYear()}`;
    document.title = s.title;
  }

  // ========== Render Story Sections ==========
  function renderSections() {
    const container = document.getElementById('sectionsContainer');
    if (!siteData || !siteData.sections) return;
    container.innerHTML = '';

    function formatDate(dateStr) {
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth() + 1;
      return dateStr.replace(/现在/g, `${y}年${m}月`);
    }

    siteData.sections.forEach((sec, i) => {
      const el = document.createElement('section');
      el.className = 'story-section';
      el.dataset.theme = i % 4;
      el.id = 'section-' + sec.id;
      el.innerHTML = `
        <div class="timeline-dot"></div>
        <div class="section-inner">
          ${sec.date ? `<p class="section-date reveal">${formatDate(sec.date)}</p>` : ''}
          <h2 class="section-title reveal">${sec.title}</h2>
          <p class="section-content reveal">${sec.content}</p>
          ${sec.image ? `<div class="section-image reveal"><img src="${sec.image}" alt="${sec.title}"></div>` : ''}
        </div>
      `;
      container.appendChild(el);
    });

    observeReveal();
  }

  // ========== Render Notes Wall ==========
  function renderNotes() {
    const container = document.getElementById('notesWall');
    const empty = document.getElementById('notesEmpty');
    if (!siteData || !siteData.notes || siteData.notes.length === 0) {
      if (empty) empty.style.display = 'block';
      return;
    }
    if (empty) empty.style.display = 'none';

    const colors = ['note-pink', 'note-yellow', 'note-blue', 'note-green', 'note-purple'];
    const html = siteData.notes.map(n => `
      <div class="note-card ${n.color || colors[Math.floor(Math.random() * colors.length)]} reveal">
        ${n.content}
      </div>
    `).join('');
    container.innerHTML = html;
    observeReveal();
  }

  // ========== Memorial Day Counter ==========
  let memorialInterval = null;

  function renderMemorialCount() {
    if (!siteData || !siteData.settings) return;
    const dateStr = siteData.settings.memorialDate || '2026-04-25';
    const startDate = new Date(dateStr + 'T00:00:00');
    if (isNaN(startDate.getTime())) return;

    const daysEl = document.getElementById('memorialDays');
    const dateTextEl = document.getElementById('memorialDateText');
    if (!daysEl) return;

    function update() {
      const now = new Date();
      const diff = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diff >= 0) {
        daysEl.textContent = diff;
      }
    }

    if (dateTextEl) {
      const y = startDate.getFullYear();
      const m = startDate.getMonth() + 1;
      const d = startDate.getDate();
      dateTextEl.textContent = `从 ${y}年${m}月${d}日 起`;
    }

    update();
    if (memorialInterval) clearInterval(memorialInterval);
    memorialInterval = setInterval(update, 1000);
  }

  // ========== Progress Dots ==========
  let sectionIds = [];

  function renderProgressDots() {
    const dotsContainer = document.getElementById('progressDots');
    sectionIds = ['section-cover'];
    if (siteData && siteData.sections) {
      siteData.sections.forEach(s => sectionIds.push('section-' + s.id));
    }
    sectionIds.push('section-music', 'section-memorial', 'section-notes', 'section-ending');

    dotsContainer.innerHTML = '';
    sectionIds.forEach((id, i) => {
      const dot = document.createElement('div');
      dot.className = 'progress-dot';
      dot.title = id;
      dot.addEventListener('click', () => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      });
      dotsContainer.appendChild(dot);
    });
  }

  // ========== Quick Navigation ==========
  function initQuickNav() {
    const nav = document.getElementById('quickNav');
    const cover = document.getElementById('section-cover');
    if (!nav || !cover) return;

    const navBtns = nav.querySelectorAll('.nav-btn');

    // Show nav after scrolling past cover
    function updateNavVisibility() {
      const coverBottom = cover.getBoundingClientRect().bottom;
      if (coverBottom < 100) {
        nav.classList.add('visible');
      } else {
        nav.classList.remove('visible');
      }
    }

    // Highlight active nav button
    function updateNavActive() {
      const ids = Array.from(navBtns).map(b => b.dataset.target);
      let activeId = null;
      for (const id of ids) {
        const el = id === 'sections' ? document.querySelector('.story-section[data-theme]') : document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= window.innerHeight * 0.5) activeId = id;
        }
      }
      navBtns.forEach(b => {
        b.classList.toggle('active', b.dataset.target === activeId);
      });
    }

    // Click to scroll
    navBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.target;
        let el;
        if (targetId === 'sections') {
          el = document.querySelector('.story-section[data-theme]');
        } else {
          el = document.getElementById(targetId);
        }
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      });
    });

    window.addEventListener('scroll', () => {
      updateNavVisibility();
      updateNavActive();
    }, { passive: true });

    updateNavVisibility();
    updateNavActive();
  }

  function updateProgress() {
    const dots = document.querySelectorAll('.progress-dot');
    const bar = document.querySelector('.progress-fill');
    const totalH = document.documentElement.scrollHeight - window.innerHeight;
    const scrolled = window.scrollY;
    if (bar) bar.style.width = totalH > 0 ? (scrolled / totalH * 100) + '%' : '0%';

    let activeIdx = 0;
    sectionIds.forEach((id, i) => {
      const el = document.getElementById(id);
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.top <= window.innerHeight * 0.5) activeIdx = i;
      }
    });

    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === activeIdx);
    });
  }

  // ========== Reveal on Scroll ==========
  function observeReveal() {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.2 });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  }

  // ========== Particles Canvas ==========
  function initParticles() {
    const canvas = document.getElementById('particles');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let w, h;
    const particles = [];
    const shootingStars = [];
    const maxParticles = 100;
    let mouseX = -1000, mouseY = -1000;

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = document.documentElement.scrollHeight;
    }

    function createParticle() {
      const colors = ['#FF6B6B', '#FFD93D', '#FFB8B8', '#FFA07A', '#FFE4B5', '#DDA0DD'];
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        size: Math.random() * 3 + 1,
        speedX: (Math.random() - 0.5) * 0.4,
        speedY: (Math.random() - 0.5) * 0.4,
        opacity: Math.random() * 0.6 + 0.2,
        color: colors[Math.floor(Math.random() * colors.length)],
        phase: Math.random() * Math.PI * 2,
        twinkleSpeed: Math.random() * 0.02 + 0.005,
      };
    }

    function createShootingStar() {
      return {
        x: Math.random() * w * 0.8,
        y: Math.random() * h * 0.3,
        len: Math.random() * 80 + 40,
        speed: Math.random() * 6 + 4,
        angle: Math.PI / 4 + (Math.random() - 0.5) * 0.3,
        opacity: 0,
        life: 0,
        maxLife: Math.random() * 0.5 + 0.5,
        delay: Math.random() * 15,
      };
    }

    for (let i = 0; i < maxParticles; i++) {
      particles.push(createParticle());
    }

    for (let i = 0; i < 4; i++) {
      const star = createShootingStar();
      star.delay = i * 4 + Math.random() * 5;
      shootingStars.push(star);
    }

    window.addEventListener('mousemove', e => {
      mouseX = e.clientX;
      mouseY = e.clientY + window.scrollY;
    });

    window.addEventListener('touchmove', e => {
      mouseX = e.touches[0].clientX;
      mouseY = e.touches[0].clientY + window.scrollY;
    });

    let time = 0;

    function animate() {
      time += 0.016;
      ctx.clearRect(0, 0, w, h);

      // Draw and update particles
      particles.forEach(p => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.phase += p.twinkleSpeed;

        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;

        const dx = mouseX - p.x;
        const dy = mouseY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 140) {
          p.x -= dx * 0.015;
          p.y -= dy * 0.015;
        }

        const twinkle = Math.sin(p.phase) * 0.5 + 0.5;
        const size = p.size * (twinkle * 0.5 + 0.75);

        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity * (twinkle * 0.4 + 0.6);
        ctx.fill();

        // Draw glow for brighter particles
        if (twinkle > 0.7 && p.opacity > 0.4) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, size * 2, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.opacity * 0.08;
          ctx.fill();
        }
      });

      // Draw connection lines for nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 110) {
            const alpha = (1 - dist / 110) * 0.06;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(255,107,107,${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // Draw shooting stars
      shootingStars.forEach(star => {
        if (time < star.delay) return;
        star.life += 0.016;
        if (star.life > star.maxLife) {
          star.life = 0;
          star.x = Math.random() * w * 0.7;
          star.y = Math.random() * h * 0.3;
          star.delay = time + Math.random() * 8 + 4;
          star.len = Math.random() * 80 + 40;
          star.speed = Math.random() * 6 + 4;
          return;
        }

        const progress = star.life / star.maxLife;
        star.x += Math.cos(star.angle) * star.speed;
        star.y += Math.sin(star.angle) * star.speed;

        const tailX = star.x - Math.cos(star.angle) * star.len;
        const tailY = star.y - Math.sin(star.angle) * star.len;

        const gradient = ctx.createLinearGradient(star.x, star.y, tailX, tailY);
        gradient.addColorStop(0, 'rgba(255,255,255,0)');
        gradient.addColorStop(0.3, 'rgba(255,255,255,0.1)');
        gradient.addColorStop(1, 'rgba(255,255,255,0.7)');

        ctx.beginPath();
        ctx.moveTo(star.x, star.y);
        ctx.lineTo(tailX, tailY);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = progress < 0.15 ? progress / 0.15 : (1 - progress) / 0.85;
        ctx.stroke();

        // Star head glow
        ctx.beginPath();
        ctx.arc(star.x, star.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = (progress < 0.15 ? progress / 0.15 : (1 - progress) / 0.85) * 0.8;
        ctx.fill();
      });

      ctx.globalAlpha = 1;
      requestAnimationFrame(animate);
    }

    window.addEventListener('resize', resize);
    resize();
    animate();

    const observer = new ResizeObserver(() => resize());
    observer.observe(document.body);
  }

  // ========== Ending Hearts ==========
  function initEndingHearts() {
    const container = document.getElementById('endingHearts');
    if (!container) return;
    const hearts = ['💕', '💗', '💖', '💝', '💘'];
    container.innerHTML = hearts.map(h => `<span class="ending-heart">${h}</span>`).join('');
  }

  // ========== Init ==========
  document.addEventListener('DOMContentLoaded', () => {
    loadData();
    initParticles();
    initEndingHearts();
    initQuickNav();
    observeReveal();

    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();
  });

  // ========== Music Player (global scope for onclick) ==========
  let musicAudio = null;
  let musicRecord = null;
  let musicProgressFill = null;
  let musicTimeEl = null;
  let musicPlayBtn = null;
  let musicTitleEl = null;
  let musicArtistEl = null;
  let musicPlayer = null;
  let musicEmpty = null;

  function initMusicPlayer() {
    musicAudio = document.getElementById('musicAudio');
    musicRecord = document.getElementById('musicRecord');
    musicProgressFill = document.getElementById('musicProgressFill');
    musicTimeEl = document.getElementById('musicTime');
    musicPlayBtn = document.getElementById('musicPlayBtn');
    musicTitleEl = document.getElementById('musicTitle');
    musicArtistEl = document.getElementById('musicArtist');
    musicPlayer = document.getElementById('musicPlayer');
    musicEmpty = document.getElementById('musicEmpty');

    if (!musicAudio || !siteData || !siteData.settings) return;

    if (siteData.settings.musicUrl) {
      musicAudio.src = siteData.settings.musicUrl;
      musicTitleEl.textContent = siteData.settings.musicTitle || '未知歌曲';
      musicArtistEl.textContent = siteData.settings.musicArtist || '';
      musicPlayer.style.display = '';
      musicEmpty.style.display = 'none';
    } else {
      musicPlayer.style.display = 'none';
      musicEmpty.style.display = 'block';
      return;
    }

    musicAudio.addEventListener('timeupdate', () => {
      if (musicAudio.duration) {
        const pct = (musicAudio.currentTime / musicAudio.duration) * 100;
        musicProgressFill.style.width = pct + '%';
        const m = Math.floor(musicAudio.currentTime / 60);
        const s = Math.floor(musicAudio.currentTime % 60);
        musicTimeEl.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      }
    });

    musicAudio.addEventListener('ended', () => {
      musicRecord.classList.remove('playing');
      musicRecord.classList.add('paused');
      musicPlayBtn.querySelector('.play-icon').textContent = '▶';
    });

    // Click on progress bar to seek
    document.getElementById('musicProgress').addEventListener('click', (e) => {
      const rect = e.target.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      musicAudio.currentTime = pct * musicAudio.duration;
    });

    // Auto-play
    if (siteData.settings.enableMusic && siteData.settings.musicUrl) {
      musicAudio.play().catch(() => {});
      musicRecord.classList.add('playing');
      musicPlayBtn.querySelector('.play-icon').textContent = '⏸';
    }
  }

  window.toggleMusic = function() {
    if (!musicAudio) return;
    if (musicAudio.paused) {
      musicAudio.play();
      musicRecord.classList.remove('paused');
      musicRecord.classList.add('playing');
      musicPlayBtn.querySelector('.play-icon').textContent = '⏸';
    } else {
      musicAudio.pause();
      musicRecord.classList.remove('playing');
      musicRecord.classList.add('paused');
      musicPlayBtn.querySelector('.play-icon').textContent = '▶';
    }
  };
})();
