import type { Member } from './types';
import { COPY } from './copy.ts';
const src = (label: string, url: string) => ({ label, url });
const BASE_MEMBERS: Member[] = [
  { slug: 'karina', theme: { a: '#0F2A5F', b: '#4DA3FF', glow: '#FFFFFF', ink: '#F3EFE6', mode: 0 }, name: 'Karina', hangul: '카리나', born: '2000-04-11', birthplace: 'Suwon', position: 'leader, dancer, rapper, vocalist',
    loreRole: 'Rocket Puncher', loreNote: 'In the Black Mamba MV, æ-Karina is the avatar the Black Mamba corrupts, cutting the SYNK.',
    fanSourced: { symbol: 'heart', color: 'blue', animal: 'whale' },
    solo: [ { title: 'Up', date: '2024-10-09', note: 'SYNK : PARALLEL LINE. First solo top ten on Circle Digital.', spotifyTrack: '5sjnkOfTLCLNfkkchI2re2' }, { title: 'GOOD STUFF', date: '2025-11-17', note: 'SYNK : aeXIS LINE, co-written.', spotifyTrack: '19iJj3pCMwGxrA6pltPat3' }, { title: '16 Bit', date: '2026-09-14', note: 'SYNK : COMPLæXITY.', spotifyTrack: '5XwL05UFnI8UwaxMl2UzlC' }, { title: 'Serenade, with Winter', date: '2026-08-09', note: 'SYNK : aeXIS LINE sub-unit single.', spotifyTrack: '2h81piRbzIJmjpxR4qnM2o' } ],
    moments: ['Opening theme stage at the 2024 MAMA Awards in Osaka.', 'Nike global ambassador from July 2025, the first Korean celebrity in the role.', 'Member of SM supergroup Got the Beat.'],
    sources: [src('Wikipedia, Karina', 'https://en.wikipedia.org/wiki/Karina_(South_Korean_singer)'), src('Good Morning America on the lore roles', 'https://www.goodmorningamerica.com/culture/story/what-to-know-about-aespa-the-latest-kpop-girl-group-taking-the-world-by-storm-86215881')] },
  { slug: 'giselle', theme: { a: '#000000', b: '#8A8F99', glow: '#DDE2EA', ink: '#F3EFE6', mode: 2 }, name: 'Giselle', hangul: '지젤', born: '2000-10-30', birthplace: 'Seoul, raised in Tokyo', position: 'rapper, vocalist',
    loreRole: 'Xenoglossy', loreNote: 'The ability to understand unlearned languages. First member shown in ep1. Black Mamba.',
    fanSourced: { symbol: 'crescent moon', color: 'black', animal: 'unicorn' },
    solo: [ { title: 'Dopamine', date: '2024-10-09', note: 'SYNK : PARALLEL LINE. Introspective R&B.', spotifyTrack: '6pIuPm3u7QgUFAX1V0D9wY' }, { title: 'Tornado', date: '2025-11-17', note: 'SYNK : aeXIS LINE. Tropical dance.', spotifyTrack: '09mT11oYwaa8geGu4UHpzL' }, { title: 'BYEB4HELLO', date: '2026-09-14', note: 'SYNK : COMPLæXITY.', spotifyTrack: '1fKmAGbPcYIA9lZXC73lwK' }, { title: 'Lollipop, with Ningning', date: '2026-08-09', note: 'SYNK : aeXIS LINE sub-unit single, co-written.', spotifyTrack: '1j2fdmjSCJZkfCLFKZTOpd' } ],
    moments: ['The "don\'t you know I\'m a savage" intro.', 'Loewe ambassador from 2024.', 'Trained only eleven months before debut.'],
    sources: [src('Wikipedia, Giselle', 'https://en.wikipedia.org/wiki/Giselle_(singer)')] },
  { slug: 'winter', theme: { a: '#F3EFE6', b: '#A9D6FF', glow: '#FFFFFF', ink: '#1A1A1E', mode: 3 }, name: 'Winter', hangul: '윈터', born: '2001-01-01', birthplace: 'Busan', position: 'vocalist, dancer',
    loreRole: 'Armamenter', loreNote: 'The one skilled in weaponry. æ-Winter wore silver-white hair in the ice-blue arena of the debut MV.',
    fanSourced: { symbol: 'star', color: 'ivory', animal: 'Siberian husky' },
    solo: [ { title: 'Spark', date: '2024-10-09', note: 'SYNK : PARALLEL LINE, co-written. Ethereal EDM.', spotifyTrack: '2xoA126GEgFhrYzRaTH7E4' }, { title: 'BLUE', date: '2025-11-17', note: 'SYNK : aeXIS LINE, co-written pop-rock.', spotifyTrack: '58awxGcVt7bQ9bahX7yWxt' }, { title: 'Speed of Summer', date: '2026-08-27', note: 'Dingo single, alternative punk rock, mastered at Abbey Road.', spotifyTrack: '3Aljxc4MlI98oUcPJrBwUD' }, { title: 'Saddle Up', date: '2026-09-14', note: 'SYNK : COMPLæXITY.', spotifyTrack: '7G8Ycb0hYdQ7cgjVvZ9fAL' }, { title: 'Serenade, with Karina', date: '2026-08-09', note: 'SYNK : aeXIS LINE sub-unit single.', spotifyTrack: '2h81piRbzIJmjpxR4qnM2o' }, { title: 'Once Again, with Ningning', date: '2022-05-22', note: 'Our Blues OST.' }, { title: 'With You', date: '2023-12-08', note: 'My Demon OST.' }, { title: 'Voyage', date: '2023-11-19', note: 'Castaway Diva OST.' } ],
    moments: ['Got the Beat "Step Back" fancam reached ten million views in 25 days.', 'Opened SYNK : Hyper Line (2023) with an electric guitar solo.', 'Best Popular Solo Female at the 2026 KM Chart Awards.'],
    sources: [src('Wikipedia, Winter (singer)', 'https://en.wikipedia.org/wiki/Winter_(singer)'), src('PAPER cover story', 'https://www.papermag.com/aespa-winter-cover')] },
  { slug: 'ningning', theme: { a: '#3B0F6B', b: '#C77DFF', glow: '#FFD6F5', ink: '#F3EFE6', mode: 0 }, name: 'Ningning', hangul: '닝닝', born: '2002-10-23', birthplace: 'Harbin', position: 'vocalist, dancer, maknae',
    loreRole: 'e.D Hacker', loreNote: 'The hacker. Her powers vary across fan sources, so only the role title is stated here.',
    fanSourced: { symbol: 'butterfly', color: 'purple', animal: 'tiger' },
    solo: [ { title: 'Bored!', date: '2024-10-09', note: 'SYNK : PARALLEL LINE. R&B dance.', spotifyTrack: '44qlcokPO2RjD8791ohJFR' }, { title: 'Ketchup And Lemonade', date: '2025-11-17', note: 'SYNK : aeXIS LINE. Soft R&B.', spotifyTrack: '1D1cBWh7IJ5DqOIYqCtqZa' }, { title: 'I Love You But I Gotta Let You Go', date: '2026-09-14', note: 'SYNK : COMPLæXITY.', spotifyTrack: '4VHu6TXzapvQG6tURPVRXj' }, { title: 'Lollipop, with Giselle', date: '2026-08-09', note: 'SYNK : aeXIS LINE sub-unit single.', spotifyTrack: '1j2fdmjSCJZkfCLFKZTOpd' } ],
    moments: ['Coachella 2022 high notes went viral.', 'Versace (2024) and Gucci (2026) global ambassador.', 'Revealed as the third member on October 28, 2020.'],
    sources: [src('Wikipedia, Ningning', 'https://en.wikipedia.org/wiki/Ningning')] },
];
const copyFor = (slug: string) => (COPY.members as Record<string, { intro: string; loreNote: string; moments: readonly string[] } | undefined>)[slug];
export const MEMBERS: Member[] = BASE_MEMBERS.map(m => { const c = copyFor(m.slug); return c ? { ...m, intro: c.intro, loreNote: c.loreNote, moments: [...c.moments] } : m; });

export function memberBySlug(slug: string): Member | undefined { return MEMBERS.find(m => m.slug === slug); }
