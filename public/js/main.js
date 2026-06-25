(function () {
  // ========== Fetch Data ==========
  let siteData = null;

  async function loadData() {
    try {
      const res = await fetch('/api/site');
      siteData = await res.json();
      applySiteData();
      renderSections();
      renderChats();
      renderProgressDots();
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

  // ========== Render Chat Wall ==========
  function renderChats() {
    const container = document.getElementById('chatContainer');
    const empty = document.getElementById('chatEmpty');
    if (!siteData || !siteData.chats || siteData.chats.length === 0) {
      if (empty) empty.style.display = 'block';
      return;
    }
    if (empty) empty.style.display = 'none';

    const chats = siteData.chats;
    let html = '';
    let lastDate = '';

    chats.forEach(msg => {
      const d = new Date(msg.timestamp);
      const dateStr = d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
      const timeStr = d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

      if (dateStr !== lastDate) {
        html += `<div class="chat-date-divider"><span>${dateStr}</span></div>`;
        lastDate = dateStr;
      }

      const senderClass = msg.sender === 'him' ? 'him' : 'her';
      const avatar = msg.sender === 'him' ? '🧑' : '👧';

      html += `
        <div class="chat-msg ${senderClass}">
          <div class="chat-avatar">${avatar}</div>
          <div class="chat-bubble-wrap">
            ${msg.note ? `<span class="chat-note">${msg.note}</span>` : ''}
            ${msg.favorite ? `<span class="chat-favorite">❤️</span>` : ''}
            <div class="chat-bubble">${msg.content}</div>
            ${msg.image ? `<img class="chat-image" src="${msg.image}" alt="聊天图片" loading="lazy">` : ''}
            <span class="chat-time">${timeStr}</span>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
    container.scrollTop = container.scrollHeight;
  }

  // ========== Progress Dots ==========
  let sectionIds = [];

  function renderProgressDots() {
    const dotsContainer = document.getElementById('progressDots');
    sectionIds = ['section-cover'];
    if (siteData && siteData.sections) {
      siteData.sections.forEach(s => sectionIds.push('section-' + s.id));
    }
    sectionIds.push('section-chats', 'section-ending');

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
    const maxParticles = 80;
    let mouseX = -1000, mouseY = -1000;

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = document.documentElement.scrollHeight;
    }

    function createParticle() {
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        size: Math.random() * 3 + 1,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: (Math.random() - 0.5) * 0.3,
        opacity: Math.random() * 0.5 + 0.2,
        color: Math.random() > 0.5 ? '#FF6B6B' : '#FFD93D',
        phase: Math.random() * Math.PI * 2,
      };
    }

    for (let i = 0; i < maxParticles; i++) {
      particles.push(createParticle());
    }

    window.addEventListener('mousemove', e => {
      mouseX = e.clientX;
      mouseY = e.clientY + window.scrollY;
    });

    window.addEventListener('touchmove', e => {
      mouseX = e.touches[0].clientX;
      mouseY = e.touches[0].clientY + window.scrollY;
    });

    function animate() {
      ctx.clearRect(0, 0, w, h);
      particles.forEach(p => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.phase += 0.01;

        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        const dx = mouseX - p.x;
        const dy = mouseY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          p.x -= dx * 0.01;
          p.y -= dy * 0.01;
        }

        const pulse = Math.sin(p.phase) * 0.3 + 0.7;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * pulse, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity * pulse;
        ctx.fill();
      });

      // Draw connection lines for nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = 'rgba(255,107,107,0.06)';
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      ctx.globalAlpha = 1;
      requestAnimationFrame(animate);
    }

    window.addEventListener('resize', resize);
    resize();
    animate();

    // Update canvas height on DOM change
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
    observeReveal();

    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();
  });
})();
