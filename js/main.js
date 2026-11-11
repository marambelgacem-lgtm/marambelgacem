/* Static content and anchor links work without JavaScript. */
(() => {
  'use strict';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function setupNavigation() {
    const header = document.querySelector('.site-header');
    const toggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('#primary-nav');
    if (!header || !toggle || !nav) return; // Article pages use a simpler header.
    const mobile = window.matchMedia('(max-width: 850px)');
    const links = [...nav.querySelectorAll('a[href^="#"]')];
    const sections = links.map(link => document.querySelector(link.hash)).filter(Boolean);
    function setMenu(open, restoreFocus = false) {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.querySelector('.menu-label').textContent = open ? 'Close' : 'Menu';
      nav.classList.toggle('is-open', open);
      if (restoreFocus) toggle.focus();
    }
    toggle.hidden = false;
    header.classList.add('nav-enhanced');
    toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') setMenu(false, true);
    });
    document.addEventListener('click', event => { if (!header.contains(event.target)) setMenu(false); });
    header.addEventListener('focusout', event => {
      if (event.relatedTarget && !header.contains(event.relatedTarget)) setMenu(false);
    });
    mobile.addEventListener('change', () => setMenu(false));
    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', event => {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || !link.hash) return;
        const target = document.getElementById(link.hash.slice(1));
        setMenu(false);
        if (target?.hasAttribute('tabindex')) target.focus({ preventScroll: true });
      });
    });
    let scrollPending = false;
    function updateCurrent() {
      const offset = header.getBoundingClientRect().height + 95;
      let current = sections[0];
      sections.forEach(section => { if (section.getBoundingClientRect().top <= offset) current = section; });
      if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4) current = sections[sections.length - 1];
      if (current) links.forEach(link => {
        if (link.hash === `#${current.id}`) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
      scrollPending = false;
    }
    window.addEventListener('scroll', () => {
      if (!scrollPending) { scrollPending = true; window.requestAnimationFrame(updateCurrent); }
    }, { passive: true });
    window.addEventListener('resize', updateCurrent);
    window.addEventListener('load', updateCurrent);
    updateCurrent();
  }

  function setupReveals() {
    if (!('IntersectionObserver' in window) || !('animate' in Element.prototype)) return;
    const running = new Set();
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        if (!reducedMotion.matches) {
          const animation = entry.target.animate([
            { opacity: .5, transform: 'translateY(12px)' },
            { opacity: 1, transform: 'translateY(0)' }
          ], { duration: 500, easing: 'cubic-bezier(.2,.65,.3,1)' });
          running.add(animation);
          animation.finished.then(() => running.delete(animation)).catch(() => {});
        }
        observer.unobserve(entry.target);
      });
    }, { threshold: .08 });
    document.querySelectorAll('.reveal').forEach(element => observer.observe(element));
    reducedMotion.addEventListener('change', () => {
      if (reducedMotion.matches) { running.forEach(animation => animation.cancel()); running.clear(); }
    });
  }

  function setupPointer() {
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    const forcedColors = window.matchMedia('(forced-colors: active)');
    const root = document.documentElement;
    const visual = document.createElement('div');
    visual.className = 'pointer-visual';
    visual.setAttribute('aria-hidden', 'true');
    visual.hidden = true;
    const ring = document.createElement('span');
    ring.className = 'pointer-ring';
    const dot = document.createElement('span');
    dot.className = 'pointer-dot';
    visual.append(ring, dot);
    document.body.append(visual);
    let visible = false, frame = 0, previousTime = 0;
    let targetX = 0, targetY = 0, ringX = 0, ringY = 0;
    const allowed = () => finePointer.matches && !reducedMotion.matches && !forcedColors.matches;
    const position = (element, x, y) => {
      element.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
    };
    function hide() {
      visible = false;
      visual.hidden = true;
      visual.classList.remove('is-hovering', 'is-pressing');
      root.classList.remove('pointer-enhanced');
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      previousTime = 0;
    }
    function follow(time) {
      if (!visible || !allowed()) { hide(); return; }
      const delta = previousTime ? Math.min(time - previousTime, 40) : 16;
      previousTime = time;
      const easing = 1 - Math.exp(-delta / 70);
      ringX += (targetX - ringX) * easing;
      ringY += (targetY - ringY) * easing;
      position(ring, ringX, ringY);
      if (Math.abs(targetX - ringX) + Math.abs(targetY - ringY) > .15) {
        frame = window.requestAnimationFrame(follow);
      } else {
        position(ring, targetX, targetY);
        frame = 0;
        previousTime = 0;
      }
    }
    document.addEventListener('pointermove', event => {
      if (!allowed() || event.pointerType !== 'mouse') { hide(); return; }
      targetX = event.clientX;
      targetY = event.clientY;
      position(dot, targetX, targetY);
      if (!visible) {
        ringX = targetX; ringY = targetY;
        position(ring, ringX, ringY);
        visible = true; visual.hidden = false;
        root.classList.add('pointer-enhanced');
      }
      visual.classList.toggle('is-hovering', Boolean(event.target.closest('a, button, input, textarea, select, summary, [role="button"]')));
      if (!frame) frame = window.requestAnimationFrame(follow);
    }, { passive: true });
    document.addEventListener('pointerout', event => { if (!event.relatedTarget) hide(); });
    document.addEventListener('pointerdown', event => {
      if (event.pointerType !== 'mouse') { hide(); return; }
      if (visible) visual.classList.add('is-pressing');
    });
    document.addEventListener('pointerup', () => visual.classList.remove('is-pressing'));
    document.addEventListener('keydown', event => { if (event.key === 'Tab') hide(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) hide(); });
    window.addEventListener('blur', hide);
    finePointer.addEventListener('change', hide);
    reducedMotion.addEventListener('change', hide);
    forcedColors.addEventListener('change', hide);
  }

  setupNavigation();
  setupReveals();
  setupPointer();
  const year = document.querySelector('#current-year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
