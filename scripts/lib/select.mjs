// Pure selection logic: raw manifest entries + curator decisions -> what an era page shows.
export const MEMBERS = ['karina', 'giselle', 'winter', 'ningning', 'group'];
const EXCLUDE = new Set(['small', 'dupe', 'blurry', 'member-mismatch', 'era-mismatch']);
const SOURCE_RANK = { official: 0, commons: 1, pinterest: 2, other: 3 };

function shape(i, extra = {}) {
  const local = i.source === 'official' || i.source === 'commons' || !!extra.src;
  return {
    file: i.file, member: extra.member || i.member || 'group',
    kind: local ? 'local' : 'remote',
    ...(local ? { src: extra.src } : { remote: i.sourceUrl }),
    pageUrl: i.pageUrl ?? null, credit: i.credit ?? null, width: i.width ?? null, height: i.height ?? null,
    tags: extra.tags ?? [], ...(i.license ? { license: i.license, licenseUrl: i.licenseUrl ?? null } : {}),
  };
}

// A kept item whose file left the raw manifest (re-fetch, rename) still renders from the fields the curator saved.
function fromDecision(d) {
  return { file: d.file, source: d.source, sourceUrl: d.sourceUrl, pageUrl: d.pageUrl, credit: d.credit, width: d.width, height: d.height, member: d.member };
}

export function selectImages(manifestImages, curation, { member, limit = 24 }) {
  const byFile = new Map(manifestImages.map(i => [i.file, i]));
  const decisions = curation?.images ?? [];
  const kept = decisions
    .filter(d => d.state === 'keep' && (d.member || byFile.get(d.file)?.member || 'group') === member)
    .sort((a, b) => (a.order ?? 1e9) - (b.order ?? 1e9));
  if (kept.length) return kept.map(d => shape(byFile.get(d.file) ?? fromDecision(d), d));
  const rejected = new Set(decisions.filter(d => d.state === 'reject').map(d => d.file));
  return manifestImages
    .filter(i => i.file && (i.member || 'group') === member && !rejected.has(i.file) && !(i.qc?.flags ?? []).some(f => EXCLUDE.has(f)))
    .sort((a, b) => (SOURCE_RANK[a.source] ?? 3) - (SOURCE_RANK[b.source] ?? 3) || (b.width ?? 0) - (a.width ?? 0))
    .slice(0, limit)
    .map(i => shape(i));
}

export function selectVideos(manifestVideos, curation, { limit = 12 }) {
  const byId = new Map(manifestVideos.map(v => [v.id, v]));
  const decisions = curation?.videos ?? [];
  const kept = decisions.filter(d => d.state === 'keep').sort((a, b) => (a.order ?? 1e9) - (b.order ?? 1e9));
  const toOut = v => ({ ytId: v.id, title: v.title, channel: v.channel ?? null, kind: v.kind, views: v.viewCount ?? 0, member: v.member ?? null });
  if (kept.length) return kept.map(d => byId.get(d.id)).filter(Boolean).map(toOut);
  const rejected = new Set(decisions.filter(d => d.state === 'reject').map(d => d.id));
  return manifestVideos
    .filter(v => !rejected.has(v.id) && (v.kind !== 'fancam' || v.member))
    .sort((a, b) => (a.kind === 'mv' ? 0 : 1) - (b.kind === 'mv' ? 0 : 1) || (b.viewCount ?? 0) - (a.viewCount ?? 0))
    .slice(0, limit).map(toOut);
}

export function eraContent(eraManifest, curation, opts = {}) {
  const images = {};
  for (const m of MEMBERS) images[m] = selectImages(eraManifest.images ?? [], curation, { member: m, limit: opts.limit });
  return { slug: eraManifest.slug, videos: selectVideos(eraManifest.videos ?? [], curation, {}), images };
}
