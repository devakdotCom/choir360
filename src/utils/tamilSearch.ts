const tamilToLatinPairs: [string, string][] = [
  ['அ', 'a'], ['ஆ', 'aa'], ['இ', 'i'], ['ஈ', 'ee'], ['உ', 'u'], ['ஊ', 'oo'], ['எ', 'e'], ['ஏ', 'ae'], ['ஐ', 'ai'], ['ஒ', 'o'], ['ஓ', 'oa'], ['ஔ', 'au'],
  ['க்', 'k'], ['க', 'ka'], ['ங்', 'ng'], ['ங', 'nga'], ['ச்', 'ch'], ['ச', 'sa'], ['ஞ்', 'nj'], ['ஞ', 'nja'],
  ['ட்', 't'], ['ட', 'ta'], ['ண்', 'n'], ['ண', 'na'], ['த்', 'th'], ['த', 'tha'], ['ந்', 'n'], ['ந', 'na'],
  ['ப்', 'p'], ['ப', 'pa'], ['ம்', 'm'], ['ம', 'ma'], ['ய்', 'y'], ['ய', 'ya'], ['ர்', 'r'], ['ர', 'ra'],
  ['ல்', 'l'], ['ல', 'la'], ['வ்', 'v'], ['வ', 'va'], ['ழ்', 'zh'], ['ழ', 'zha'], ['ள்', 'l'], ['ள', 'la'],
  ['ற்', 'r'], ['ற', 'ra'], ['ன்', 'n'], ['ன', 'na'], ['ஜ', 'ja'], ['ஷ', 'sha'], ['ஸ்', 's'], ['ஹ', 'ha'],
  ['ா', 'a'], ['ி', 'i'], ['ீ', 'ee'], ['ு', 'u'], ['ூ', 'oo'], ['ெ', 'e'], ['ே', 'ae'], ['ை', 'ai'], ['ொ', 'o'], ['ோ', 'oa'], ['ௌ', 'au'], ['்', ''],
];

const aliases: Record<string, string[]> = {
  anbe: ['அன்பே', 'anbae', 'anbu'],
  arul: ['அருள்', 'arul'],
  yesuve: ['யேசுவே', 'இயேசுவே', 'yesuvae', 'yesu', 'yeasu'],
  yesu: ['யேசு', 'இயேசு', 'yesuve'],
  deva: ['தேவா', 'தேவன்', 'deva'],
  aandavare: ['ஆண்டவரே', 'andavare', 'aandavar'],
};

export function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\u0B80-\u0BFF]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tamilToLatin(value: string) {
  let output = value;
  tamilToLatinPairs.forEach(([tamil, latin]) => {
    output = output.split(tamil).join(latin);
  });
  return normalizeSearchText(output);
}

export function expandSearchQuery(query: string) {
  const normalized = normalizeSearchText(query);
  const parts = new Set([normalized, tamilToLatin(query)]);
  normalized.split(' ').forEach((token) => {
    aliases[token]?.forEach((alias) => {
      parts.add(normalizeSearchText(alias));
      parts.add(tamilToLatin(alias));
    });
  });
  return Array.from(parts).filter(Boolean);
}

export function buildTamilSearchText(value: string) {
  return normalizeSearchText(`${value}\n${tamilToLatin(value)}`);
}
