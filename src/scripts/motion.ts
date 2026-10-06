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
  lenis?.scrollTo(0, { immediate: true });
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
  gsap.to(track, { x: () => -(track.scrollWidth - innerWidth), ease: 'none', scrollTrigger: { trigger: rail, pin: true, scrub: reduced ? false : .8, end: () => '+=' + (track.scrollWidth - innerWidth), invalidateOnRefresh: true } });
}

function tilt(off: boolean) {
  if (off) return;
  document.querySelectorAll<HTMLElement>('.card').forEach(card => {
    card.addEventListener('pointerenter', () => card.classList.add('active'));
    card.addEventListener('pointermove', ev => {
      const r = card.getBoundingClientRect(); const px = (ev.clientX - r.left) / r.width, py = (ev.clientY - r.top) / r.height;
      card.style.setProperty('--mx', (px * 100).toFixed(1) + '%'); card.style.setProperty('--my', (py * 100).toFixed(1) + '%');
      card.style.setProperty('--ry', ((px - .5) * 22).toFixed(2) + 'deg'); card.style.setProperty('--rx', ((.5 - py) * 22).toFixed(2) + 'deg');
    }, { passive: true });
    card.addEventListener('pointerleave', () => { card.classList.remove('active'); for (const v of ['--rx', '--ry']) card.style.setProperty(v, '0deg'); for (const v of ['--mx', '--my']) card.style.setProperty(v, '50%'); });
  });
}

function tabs() {
  document.querySelectorAll<HTMLElement>('[data-tabs]').forEach(root => {
    const buttons = root.querySelectorAll<HTMLButtonElement>('[role=tab]');
    const panels = root.querySelectorAll<HTMLElement>('[role=tabpanel]');
    const key = root.dataset.tabs!;
    const select = (id: string) => { buttons.forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === id))); panels.forEach(p => p.hidden = p.dataset.panel !== id); try { sessionStorage.setItem('tab:' + key, id); } catch {} ScrollTrigger.refresh(); };
    buttons.forEach(b => b.addEventListener('click', () => select(b.dataset.tab!)));
    let initial = buttons[0]?.dataset.tab; try { initial = sessionStorage.getItem('tab:' + key) || initial; } catch {}
    if (initial && Array.from(buttons).some(b => b.dataset.tab === initial)) select(initial);
  });
}
