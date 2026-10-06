// Pinterest serves resized copies of every pin at /236x/, /474x/, /736x/ and /1200x/, always as JPEG,
// at the same hash path as the original. Non-Pinterest URLs are returned unchanged.
const ORIGINALS = /^https:\/\/i\.pinimg\.com\/originals\/(.+)\.[a-z0-9]+$/i;

export function pinVariant(url: string, width: 236 | 474 | 736 | 1200): string {
  const m = url.match(ORIGINALS);
  return m ? `https://i.pinimg.com/${width}x/${m[1]}.jpg` : url;
}

export function pinSrcset(url: string, widths: (236 | 474 | 736 | 1200)[]): string {
  return widths.map(w => `${pinVariant(url, w)} ${w}w`).join(', ');
}

export const isPin = (url: string | undefined | null): boolean => !!url && ORIGINALS.test(url);
