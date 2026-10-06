export type Mode = 0 | 1 | 2 | 3; // chrome, matte, mono, candy
export interface EraTheme { a: string; b: string; glow: string; ink: string; mode: Mode }
export interface Era {
  slug: string; title: string; shortTitle: string; releaseDate: string; year: string; type: string;
  kicker: string; concept: string; theme: EraTheme;
  spotify: { album?: string; tracks?: { id: string; title: string }[] };
  story: { text: string[]; sources: { label: string; url: string }[]; loreStatus: 'season-1' | 'season-2' | 'none' };
  membersEra: boolean; // false for winter-solo
  tier: 'era' | 'release'; // 'era' = mini album, album or a single that carried a full promotion cycle; 'release' = everything else
}
export interface Member { slug: 'karina'|'giselle'|'winter'|'ningning'; name: string; hangul: string; born: string; birthplace: string; position: string; loreRole: string; loreNote: string; intro?: string; theme: EraTheme; fanSourced: { symbol: string; color: string; animal: string }; solo: { title: string; date: string; note: string; spotifyTrack?: string }[]; moments: string[]; sources: { label: string; url: string }[] }
