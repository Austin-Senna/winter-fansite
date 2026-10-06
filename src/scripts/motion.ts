// Page motion: Lenis smooth scroll, GSAP reveals, pinned rails, holo tilt, tabs. Idempotent per page load.
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin);
const CHARS = '01æÆ∆SYNK<>/|';
let lenis: Lenis | null = null;

export function initMotion() {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(pointer: coarse)').matches;
  ScrollTrigger.getAll().forEach(t => t.kill());
  if (!lenis && !reduced && !coarse) {
    lenis = new Lenis({ autoRaf: false, lerp: .09 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis!.raf(t * 1000)); gsap.ticker.lagSmoothing(0);
  }
  if (!(history.state && 'scrollY' in history.state)) lenis?.scrollTo(0, { immediate: true }); // let the router restore scroll on back/forward
  progress(); hero(reduced); rail(reduced); tilt(reduced || coarse); tabs();
  ScrollTrigger.refresh();
}

function progress() {
  const bar = document.getElementById('synkbar'), pct = document.getElementById('synkpct');
  if (!bar || !pct) return;
  ScrollTrigger.create({ trigger: 'main', start: 'top top', end: 'bottom bottom', onUpdate: s => { bar.style.setProperty('--p', s.progress.toFixed(3)); pct.textContent = 'synk ' + String(Math.round(s.progress * 100)).padStart(3, '0'); } });
}

function hero(reduced: boolean) {
  const title = document.querySelector<HTMLElement>('[data-decode]');
  const lines = Array.from(document.querySelectorAll<HTMLElement>('[data-synk]'));
  if (reduced || !title) return;
  const text = title.textContent || ''; title.textContent = '';
  const splits = lines.map(el => SplitText.create(el, { type: 'lines', mask: 'lines' }));
  gsap.set(splits.flatMap(s => s.lines), { yPercent: 110 });
  gsap.timeline({ delay: .15 })
    .to(title, { duration: 1.0, scrambleText: { text, chars: CHARS, speed: .4, revealDelay: .25 } })
    .to(splits.flatMap(s => s.lines), { yPercent: 0, duration: .8, ease: 'power3.out', stagger: .05 }, '-=.6')
    .add(() => splits.forEach(s => s.revert()));
}

function rail(reduced: boolean) {
  const rail = document.querySelector<HTMLElement>('.rail'), track = document.querySelector<HTMLElement>('.rail .track');
  if (!rail || !track) return;
  if (reduced) { rail.style.overflowX = 'auto'; rail.style.height = 'auto'; rail.style.padding = '24px 0'; return; } // native horizontal scroll, no pin, no tween
  gsap.to(track, { x: () => -(track.scrollWidth - innerWidth), ease: 'none', scrollTrigger: { trigger: rail, pin: true, scrub: .8, end: () => '+=' + (track.scrollWidth - innerWidth), invalidateOnRefresh: true } });
}

function tilt(off: boolean) {
  if (off) return;
  const rects = new WeakMap<HTMLElement, DOMRect>();
  const clear = () => { document.querySelectorAll<HTMLElement>('.card.active').forEach(c => rects.set(c, c.getBoundingClientRect())); };
  addEventListener('scroll', clear, { passive: true }); addEventListener('resize', clear);
  document.querySelectorAll<HTMLElement>('.card').forEach(card => {
    card.addEventListener('pointerenter', () => { card.classList.add('active'); rects.set(card, card.getBoundingClientRect()); }); // one layout read per hover, none per move
    card.addEventListener('pointermove', ev => {
      const r = rects.get(card); if (!r) return;
      const px = (ev.clientX - r.left) / r.width, py = (ev.clientY - r.top) / r.height;
      card.style.setProperty('--mx', (px * 100).toFixed(1) + '%'); card.style.setProperty('--my', (py * 100).toFixed(1) + '%');
      card.style.setProperty('--ry', ((px - .5) * 22).toFixed(2) + 'deg'); card.style.setProperty('--rx', ((.5 - py) * 22).toFixed(2) + 'deg');
    }, { passive: true });
    card.addEventListener('pointerleave', () => { card.classList.remove('active'); for (const v of ['--rx', '--ry']) card.style.setProperty(v, '0deg'); for (const v of ['--mx', '--my']) card.style.setProperty(v, '50%'); });
  });
}

function tabs() {
  document.querySelectorAll<HTMLElement>('[data-tabs]').forEach(root => {
    const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('[role=tab]'));
    const panels = Array.from(root.querySelectorAll<HTMLElement>('[role=tabpanel]'));
    const key = root.dataset.tabs!;
    const hasContent = (id: string) => !!panels.find(p => p.dataset.panel === id)?.querySelector('.card');
    const select = (id: string, focus = false) => {
      buttons.forEach(b => { const on = b.dataset.tab === id; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; if (on && focus) b.focus(); });
      panels.forEach(p => p.hidden = p.dataset.panel !== id);
      try { sessionStorage.setItem('tab:' + key, id); } catch {}
      ScrollTrigger.refresh();
    };
    buttons.forEach((b, i) => {
      b.addEventListener('click', () => select(b.dataset.tab!));
      b.addEventListener('keydown', e => { // ARIA tabs pattern: arrows move, Home/End jump
        const n = buttons.length; let j = i;
        if (e.key === 'ArrowRight') j = (i + 1) % n; else if (e.key === 'ArrowLeft') j = (i - 1 + n) % n; else if (e.key === 'Home') j = 0; else if (e.key === 'End') j = n - 1; else return;
        e.preventDefault(); select(buttons[j].dataset.tab!, true);
      });
    });
    // Default to the server-chosen tab (the first with photos); restore a remembered tab only when it has photos here.
    const server = buttons.find(b => b.getAttribute('aria-selected') === 'true')?.dataset.tab ?? buttons[0]?.dataset.tab;
    let initial = server; try { const stored = sessionStorage.getItem('tab:' + key); if (stored && hasContent(stored)) initial = stored; } catch {}
    if (initial) select(initial);
  });
}
