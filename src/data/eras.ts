import type { Era } from './types';
import { COPY } from './copy.ts';

const src = (label: string, url: string) => ({ label, url });

const BASE_ERAS: Era[] = [
  { slug: 'black-mamba', tier: 'era', title: 'Black Mamba', shortTitle: 'Black Mamba', releaseDate: '2020-11-17', year: '2020', type: 'debut single',
    kicker: 'Debut. Four members, four æ, one villain.', concept: 'hyperreal æ arena',
    theme: { a: '#0A1E3F', b: '#A9D6FF', glow: '#FFFFFF', ink: '#F3EFE6', mode: 0 },
    spotify: { album: '3syEYrKIsgxaZMB5t1dVG7', tracks: [{ id: '1t2qYCAjUAoGfeFeoBlK51', title: 'Black Mamba' }] },
    story: { loreStatus: 'season-1', text: [
      'aespa debuted on November 17, 2020. The members meet their æ, digital counterparts generated from their data, through an app called SYNK.',
      'The Black Mamba, a shape-shifting entity in KWANGYA, interferes with the connection. The MV ends on a glitching, distorted figure: æ-Karina has been corrupted and the SYNK is severed.',
      'SM later released the ten-minute film "ep1. Black Mamba", which assigns each member a role in the story.' ],
      sources: [src('Wikipedia, Black Mamba (song)', 'https://en.wikipedia.org/wiki/Black_Mamba_(song)'), src('Good Morning America on ep1. Black Mamba', 'https://www.goodmorningamerica.com/culture/story/what-to-know-about-aespa-the-latest-kpop-girl-group-taking-the-world-by-storm-86215881')] },
    membersEra: true },
  { slug: 'forever', tier: 'release', title: 'Forever', shortTitle: 'Forever', releaseDate: '2021-02-05', year: '2021', type: 'digital single',
    kicker: 'A remake of a 2000 SM winter ballad.', concept: 'soft white and blue',
    theme: { a: '#E8EEF5', b: '#9EC1E8', glow: '#FFFFFF', ink: '#1A1A1E', mode: 3 },
    spotify: { album: '3CExk4WgPxe0lOwoOhuMWj', tracks: [{ id: '26YNVqHuwAPeBVfDscTPds', title: 'Forever' }] },
    story: { loreStatus: 'none', text: [
      'Forever (약속) is a remake of Yoo Young-jin\'s 2000 SM winter song, released as a digital single on February 5, 2021.',
      'It sits outside the SMCU storyline. The video is a soft, pale interlude between Black Mamba and Next Level.' ],
      sources: [src('Wikipedia, aespa discography', 'https://en.wikipedia.org/wiki/Aespa_discography')] },
    membersEra: true },
  { slug: 'next-level', tier: 'era', title: 'Next Level', shortTitle: 'Next Level', releaseDate: '2021-05-17', year: '2021', type: 'digital single',
    kicker: 'The road into KWANGYA.', concept: 'desert highway, Y2K cyber',
    theme: { a: '#C9A86A', b: '#1C6E73', glow: '#DDE2EA', ink: '#F3EFE6', mode: 0 },
    spotify: { album: '2CzbrboOLzeRoaaH1N5K0N', tracks: [{ id: '2zrhoHlFKxFTRF5aMyxMoQ', title: 'Next Level' }] },
    story: { loreStatus: 'season-1', text: [
      'SM called Next Level a sequel to Black Mamba, set after the connection to the æ was cut off. The members travel into the wilderness of KWANGYA to find the Black Mamba.',
      'The song remakes A$ton Wyld\'s track from Hobbs & Shaw. Lee Soo-man directed the performance and camera work.' ],
      sources: [src('Wikipedia, Next Level (aespa song)', 'https://en.wikipedia.org/wiki/Next_Level_(Aespa_song)')] },
    membersEra: true },
  { slug: 'savage', tier: 'era', title: 'Savage', shortTitle: 'Savage', releaseDate: '2021-10-05', year: '2021', type: '1st mini album',
    kicker: 'First mini album. nævis opens the Port of Soul.', concept: 'liquid chrome, the P.O.S opens',
    theme: { a: '#3B0F6B', b: '#B6FF3B', glow: '#C9CED6', ink: '#F3EFE6', mode: 0 },
    spotify: { album: '3vyyDkvYWC36DwgZCYd3Wu', tracks: [{ id: '3dbLT62Cvs46Ju7a8gpr36', title: 'Savage' }] },
    story: { loreStatus: 'season-1', text: [
      'aespa enters KWANGYA with the help of nævis and faces the Black Mamba directly. The physical album versions were named P.O.S, Synk Dive and Hallucination Quest after the lore devices.',
      'Inside KWANGYA the members face hallucinations induced by the Black Mamba, and nævis makes sacrifices to guide them.',
      'The wormhole-shaped album case won the iF Design Award 2022 for packaging UX. Scanning the CD opened the P.O.S in AR.' ],
      sources: [src('Wikipedia, Savage (aespa EP)', 'https://en.wikipedia.org/wiki/Savage_(Aespa_EP)'), src('Korea JoongAng Daily, iF Design Award', 'https://www.koreajoongangdaily.com/entertainment/aespa-wins-user-experience-category-at-if-design-award/11260551')] },
    membersEra: true },
  { slug: 'dreams-come-true', tier: 'release', title: 'Dreams Come True', shortTitle: 'Dreams', releaseDate: '2021-12-20', year: '2021', type: 'SM STATION single',
    kicker: 'A 1998 S.E.S. song, remade.', concept: 'retro 90s, gold on navy',
    theme: { a: '#1B1F3B', b: '#C9A24A', glow: '#F2E6C8', ink: '#F3EFE6', mode: 1 },
    spotify: { album: '4Jzx0XAORPKQ3v7EaL8Ful', tracks: [{ id: '6rVCUwfnuYTAsX4P9fIdIu', title: 'Dreams Come True' }] },
    story: { loreStatus: 'none', text: [
      'A remake of S.E.S.\'s 1998 song, released through SM STATION on December 20, 2021.',
      'No lore. The video plays the 1990s SM look straight: retro sets, soft focus, gold against navy.' ],
      sources: [src('Wikipedia, aespa discography', 'https://en.wikipedia.org/wiki/Aespa_discography')] },
    membersEra: true },
  { slug: 'girls', tier: 'era', title: 'Girls', shortTitle: 'Girls', releaseDate: '2022-07-08', year: '2022', type: '2nd mini album',
    kicker: 'Second mini album. The Season 1 battle.', concept: 'glitch, digital landscapes, combat',
    theme: { a: '#FF2BD6', b: '#22E1FF', glow: '#FFFFFF', ink: '#F3EFE6', mode: 0 },
    spotify: { album: '4w1dbvUy1crv0knXQvcSeY', tracks: [{ id: '2WTHLEVjfefbGoW7F3dXIg', title: 'Girls' }, { id: '396FqjKmViUZ92Wmm4rx3i', title: 'Illusion' }] },
    story: { loreStatus: 'season-1', text: [
      'Girls closes Season 1 of the SM Culture Universe. The lyrics follow aespa and æ-aespa continuing their journey with nævis, and the MV stages the battle against the Black Mamba at full scale.',
      'Illusion, the pre-release, and the English single Life\'s Too Short are not lore tracks.' ],
      sources: [src('Bandwagon, Girls release', 'https://bandwagon.asia/articles/aespa-release-second-mini-album-girls-music-video-sm-entertainment-2022-smcu-listen'), src('Wikipedia, Girls (aespa EP)', 'https://en.wikipedia.org/wiki/Girls_(Aespa_EP)')] },
    membersEra: true },
  { slug: 'my-world', tier: 'era', title: 'MY WORLD', shortTitle: 'MY WORLD', releaseDate: '2023-05-08', year: '2023', type: '3rd mini album',
    kicker: 'Third mini album. Spicy. The lore goes quiet.', concept: 'Y2K campus, cherry red, candy',
    theme: { a: '#FF3D7F', b: '#FFE066', glow: '#7CC6FF', ink: '#1A1A1E', mode: 3 },
    spotify: { album: '69xF8jTd0c4Zoo7DT3Rwrn', tracks: [{ id: '1ULdASrNy5rurl1TZfFaMP', title: 'Spicy' }, { id: '3q5qpprtugUIEPExuI7tRD', title: 'Welcome To MY World' }] },
    story: { loreStatus: 'season-2', text: [
      'SM framed MY WORLD as Season 2: the members travel from KWANGYA to the real world. Karina described it as going from warriors in a virtual world to looking like their peers.',
      'The pre-release Welcome To MY World invites nævis into the real world, after which an anomaly keeps occurring. That track is the only one that carries story.',
      'Spicy itself is a high-teen confidence anthem. Explicit lore stops here; from this point the concepts are theme-driven.' ],
      sources: [src('Korea Times, Welcome to MY World', 'https://www.koreatimes.co.kr/amp/entertainment/k-pop/20230509/welcome-to-my-world-aespa-invites-people-to-real-world'), src('Wikipedia, My World (aespa EP)', 'https://en.wikipedia.org/wiki/My_World_(Aespa_EP)')] },
    membersEra: true },
  { slug: 'better-things', tier: 'release', title: 'Better Things', shortTitle: 'Better Things', releaseDate: '2023-08-18', year: '2023', type: 'English single',
    kicker: 'An English summer single.', concept: 'summer, yellow and sky',
    theme: { a: '#F4D35E', b: '#74B3CE', glow: '#FFFFFF', ink: '#1A1A1E', mode: 3 },
    spotify: { album: '1SHLOv0DDdRecK60z86Lth', tracks: [{ id: '6zZWoHlF2zNSLUNLvx4GUl', title: 'Better Things' }] },
    story: { loreStatus: 'none', text: [
      'Better Things is an English-language single released on August 18, 2023, ahead of the group\'s first US promotions.',
      'No lore. A bright, summer-toned video.' ],
      sources: [src('Wikipedia, aespa discography', 'https://en.wikipedia.org/wiki/Aespa_discography')] },
    membersEra: true },
  { slug: 'drama', tier: 'era', title: 'Drama', shortTitle: 'Drama', releaseDate: '2023-11-10', year: '2023', type: '4th mini album',
    kicker: 'Fourth mini album. Red car, antlers, no lore.', concept: 'femme fatale cinema',
    theme: { a: '#B3121B', b: '#0B0B10', glow: '#D4AF37', ink: '#F3EFE6', mode: 1 },
    spotify: { album: '5NMtxQJy4wq3mpo3ERVnLs', tracks: [{ id: '5XWlyfo0kZ8LF7VSyfS4Ew', title: 'Drama' }] },
    story: { loreStatus: 'season-2', text: [
      'SM\'s teaser text has the members breaking out of the trauma left by Season 1\'s SYNK OUT and Hallucination Quest and the anomalies of Season 2, writing their stories in their own way. That is the only lore framing.',
      'The concept is cinema: gritty urban sets, a red car, deer antlers, and a femme fatale read that reviewers compared to Kill Bill. The lyric line is "every story begins with you".' ],
      sources: [src('Wikipedia, Drama (aespa EP)', 'https://en.wikipedia.org/wiki/Drama_(Aespa_EP)'), src('Hallyucon review', 'https://www.hallyucon.co.uk/post/aespa-drama-album-review')] },
    membersEra: true },
  { slug: 'armageddon', tier: 'era', title: 'Armageddon', shortTitle: 'Armageddon', releaseDate: '2024-05-27', year: '2024', type: '1st full album',
    kicker: 'First full album. Supernova first, then Armageddon.', concept: 'industrial sci-fi, cosmic violet',
    theme: { a: '#2A1250', b: '#FF6A1A', glow: '#8A8F99', ink: '#F3EFE6', mode: 1 },
    spotify: { album: '4SboBpuYojDm02qS4iFeJC', tracks: [{ id: '5lKnZbdGCBViitE1Ce5TZh', title: 'Supernova' }, { id: '4b2fMv44GAYpsDSK4ihbsI', title: 'Armageddon' }] },
    story: { loreStatus: 'season-2', text: [
      'SM described the album as carrying the second season of the worldview, expanding into a multiverse beyond the real and digital worlds, under the slogan "I define myself".',
      'Supernova treats the stellar explosion as a door to another dimension and heralds the start of Season 2. Armageddon positions aespa as the predator. No named lore entity appears in either single.',
      'Spotify lists two full copies of this album; the one used here is the one whose tracks appear in aespa\'s top tracks.' ],
      sources: [src('Wikipedia, Armageddon (aespa album)', 'https://en.wikipedia.org/wiki/Armageddon_(Aespa_album)'), src('Seoulbeats on Supernova', 'https://seoulbeats.com/2024/05/supernova-is-campy-chaotic-and-peak-aespa/')] },
    membersEra: true },
  { slug: 'whiplash', tier: 'era', title: 'Whiplash', shortTitle: 'Whiplash', releaseDate: '2024-10-21', year: '2024', type: '5th mini album',
    kicker: 'Fifth mini album. Runway, two sets, one palette.', concept: 'futuristic runway',
    theme: { a: '#000000', b: '#FFFFFF', glow: '#C9CED6', ink: '#F3EFE6', mode: 2 },
    spotify: { album: '7J41hCLBI2kEwL6RVSxfNx', tracks: [{ id: '3coRPMnFg2dJcPu5RMloa9', title: 'Whiplash' }] },
    story: { loreStatus: 'none', text: [
      'An EDM track with fast bass and house beats about moving forward on your own standards. No SMCU references.',
      'Directed by MELTMIRROR: two sets, a limited palette, chrome accessories, conceptual nails and glitch cut-ins timed to the beat. Preceded by the four solo tracks on SYNK : PARALLEL LINE.' ],
      sources: [src('Wikipedia, Whiplash (aespa EP)', 'https://en.wikipedia.org/wiki/Whiplash_(Aespa_EP)'), src('UCSD Guardian review', 'https://ucsdguardian.org/2024/11/09/aespa-shines-with-edgy-versatility-in-whiplash/')] },
    membersEra: true },
  { slug: 'dirty-work', tier: 'era', title: 'Dirty Work', shortTitle: 'Dirty Work', releaseDate: '2025-06-27', year: '2025', type: '1st single album',
    kicker: 'First single album. Steel mill, mud, white uniforms.', concept: 'industrial grunge',
    theme: { a: '#8C4A2F', b: '#3A3F44', glow: '#E8E2D6', ink: '#F3EFE6', mode: 1 },
    spotify: { album: '3L7i2VqeznnAqX5BG6gm3H', tracks: [{ id: '4qtdab2DABnEokwupCl8lG', title: 'Dirty Work' }, { id: '6kBtuFVssWq2rORvq2ssXS', title: 'Dirty Work (feat. Flo Milli)' }] },
    story: { loreStatus: 'none', text: [
      'The MV was shot at a Hyundai Steel mill in Dangjin; the performance video was shot on iPhone 16 Pro with Apple. Teasers melted jewelry into the title logo.',
      'Karina pitched it as continuing aespa\'s metallic sound. Versions: Korean, featuring Flo Milli, English, instrumental. No lore.' ],
      sources: [src('Wikipedia, Dirty Work (aespa song)', 'https://en.wikipedia.org/wiki/Dirty_Work_(Aespa_song)')] },
    membersEra: true },
  { slug: 'rich-man', tier: 'era', title: 'Rich Man', shortTitle: 'Rich Man', releaseDate: '2025-09-05', year: '2025', type: '6th mini album',
    kicker: 'Sixth mini album. A rock band in a cold-storage warehouse.', concept: 'rock band, ice and amber',
    theme: { a: '#DCE9F2', b: '#E0A33A', glow: '#1A1A1E', ink: '#1A1A1E', mode: 1 },
    spotify: { album: '3rUhGAdzBVzicwTPAVQjXu', tracks: [{ id: '2lzb0dgTFAfrHfzlZA9Hxw', title: 'Rich Man' }] },
    story: { loreStatus: 'none', text: [
      'Karina described Rich Man as a dance song with a rough guitar sound about self-confidence and self-love. "Rich" is framed as inner strength, not money.',
      'The trailer "I am a Rich Man" was directed by Yi Ok-seop with actor Koo Kyo-hwan in a freezing cold-storage warehouse with a bowling lane. To The Girls closes the album as a message to fans.' ],
      sources: [src('Wikipedia, Rich Man (EP)', 'https://en.wikipedia.org/wiki/Rich_Man_(EP)'), src('Dork, aespa on Rich Man', 'https://readdork.com/track/aespa-aespa-on-rich-man')] },
    membersEra: true },
  { slug: 'attitude', tier: 'release', title: 'ATTITUDE', shortTitle: 'Attitude', releaseDate: '2026-03-06', year: '2026', type: 'Japanese digital single',
    kicker: 'Japanese single. The Kill Blue anime opening.', concept: 'anime blue, night',
    theme: { a: '#0E1B2A', b: '#4FB3FF', glow: '#FFFFFF', ink: '#F3EFE6', mode: 0 },
    spotify: { album: '39wwc39ALeKhi3LP1xerOw', tracks: [{ id: '6QIY4JAyzPH6UuFsyndaPs', title: 'ATTITUDE' }] },
    story: { loreStatus: 'none', text: [
      'ATTITUDE is the opening theme for the anime Kill Blue, released March 6, 2026, about nothing stopping you from being yourself.',
      'There is no SMTOWN music video; the anime opening carries the song. No lore.' ],
      sources: [src('Bandwagon, ATTITUDE', 'https://www.bandwagon.asia/articles/aespa-exude-attitude-for-kill-blue-anime-theme-song-listen')] },
    membersEra: true },
  { slug: 'lemonade', tier: 'era', title: 'LEMONADE', shortTitle: 'Lemonade', releaseDate: '2026-05-29', year: '2026', type: '2nd full album',
    kicker: 'Second full album. WDA first, then Lemonade.', concept: 'glossy parallel world, candy',
    theme: { a: '#F7E85A', b: '#F6A9D8', glow: '#A8F0D1', ink: '#1A1A1E', mode: 3 },
    spotify: { album: '1GjT1mri5wvJAYZ3rnZamk', tracks: [{ id: '6vjt2smGK75oc9r2OGFfgp', title: 'LEMONADE' }, { id: '6QkyFjUMmncXzu6oSWKwHQ', title: 'WDA (Whole Different Animal) feat. G-DRAGON' }] },
    story: { loreStatus: 'season-2', text: [
      'WDA, the pre-release with G-DRAGON, returns to the worldview visually: a world where digital and physical blur, entities resembling aespa yet separate from them create conflict, and the group breaks through a fracture named Complaexity. That name became the 2026-27 tour.',
      'LEMONADE itself is a "when life gives you lemons" EDM track about turning hardship into opportunity: retro candy colors, mod silhouettes, lace boots. Features from Ty Dolla $ign and Becky G. Number nine on the Billboard 200.' ],
      sources: [src('Wikipedia, WDA', 'https://en.wikipedia.org/wiki/WDA_(Whole_Different_Animal)'), src('Wikipedia, Lemonade (aespa album)', 'https://en.wikipedia.org/wiki/Lemonade_(Aespa_album)'), src('Vogue Singapore on the styling', 'https://vogue.sg/aespa-lemonade-fashion/')] },
    membersEra: true },
  { slug: 'kiss-n-tell', tier: 'era', title: 'KISS N TELL', shortTitle: 'Kiss n Tell', releaseDate: '2026-07-24', year: '2026', type: '1st Japanese mini album',
    kicker: 'First Japanese mini album. Pink, sweet, house-rooted.', concept: 'retro-futuristic pink',
    theme: { a: '#F6B8D8', b: '#2B2B3A', glow: '#FFFFFF', ink: '#1A1A1E', mode: 3 },
    spotify: { album: '5pwhf4kv2qX10i6k2uJsFp', tracks: [{ id: '3Fse9qXqMNey4TL5mLy8IF', title: 'KISS N TELL' }] },
    story: { loreStatus: 'none', text: [
      'The first Japanese mini album swaps the futuristic image for pink, sweet styling over a house-rooted dance-pop lead. Number one on Oricon.',
      'No lore.' ],
      sources: [src('Complex on KISS N TELL', 'https://www.complex.com/music/a/alex-ocho/aespa-kiss-n-tell-japanese-mini-album'), src('Oricon', 'https://www.oricon.co.jp/news/2460510/full/')] },
    membersEra: true },
  { slug: 'winter-solo', tier: 'release', title: 'Winter', shortTitle: 'Winter solo', releaseDate: '2022-05-22', year: '2022-2026', type: 'solo, OST and collaborations',
    kicker: 'Spark, BLUE, Speed of Summer, Saddle Up, and the OSTs.', concept: 'ivory and ice',
    theme: { a: '#F3EFE6', b: '#A9D6FF', glow: '#FFFFFF', ink: '#1A1A1E', mode: 3 },
    spotify: { tracks: [
      { id: '2xoA126GEgFhrYzRaTH7E4', title: 'Spark (2024)' }, { id: '58awxGcVt7bQ9bahX7yWxt', title: 'BLUE (2025)' },
      { id: '3Aljxc4MlI98oUcPJrBwUD', title: 'Speed of Summer (2026)' }, { id: '7G8Ycb0hYdQ7cgjVvZ9fAL', title: 'Saddle Up (2026)' },
      { id: '2h81piRbzIJmjpxR4qnM2o', title: 'Serenade, with Karina (2026)' } ] },
    story: { loreStatus: 'none', text: [
      'Winter\'s solo catalog runs from the OST duet Once Again with Ningning in 2022 through Spark on SYNK : PARALLEL LINE (2024), BLUE on SYNK : aeXIS LINE (2025), the Dingo single Speed of Summer (August 2026) and Saddle Up on SYNK : COMPLæXITY (September 2026).',
      'Spark and BLUE are co-written. Speed of Summer is credited to a separate Spotify artist, WINTER, and was mastered at Abbey Road. No full solo album as of October 2026.' ],
      sources: [src('Wikipedia, Winter (singer)', 'https://en.wikipedia.org/wiki/Winter_(singer)'), src('Bandwagon on SYNK : COMPLæXITY solos', 'https://www.bandwagon.asia/articles/aespa-release-solo-tracks-from-synk-compl-xity-world-tour-listen')] },
    membersEra: false },
];

const copyFor = (slug: string) => (COPY.eras as Record<string, { kicker: string; story: readonly string[]; sources: readonly { label: string; url: string }[] } | undefined>)[slug];
// Written copy overlays the base data: kicker, story paragraphs and sources. Concept words and themes stay with the base.
export const ERAS: Era[] = BASE_ERAS.map(e => { const c = copyFor(e.slug); return c ? { ...e, kicker: c.kicker, story: { ...e.story, text: [...c.story], sources: [...c.sources] } } : e; });

export function eraBySlug(slug: string): Era | undefined { return ERAS.find(e => e.slug === slug); }
export const MAIN_ERAS = (): Era[] => ERAS.filter(e => e.tier === 'era');
export const OTHER_RELEASES = (): Era[] => ERAS.filter(e => e.tier === 'release' && e.membersEra);
// Next in the main era chain; a minor release points at the next main era after it.
export function nextEra(slug: string): Era { const main = MAIN_ERAS(); const i = ERAS.findIndex(e => e.slug === slug); const after = main.find(e => ERAS.indexOf(e) > i); return after ?? main[0]; }
