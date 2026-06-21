import { DailyReading } from '../types';

export const FALLBACK_DAILY_READING: DailyReading = {
  id: 'source-latest-ta',
  date: 'source-latest',
  language: 'ta',
  title: 'இன்றைய திருப்பலி வாசகங்கள்',
  liturgicalDay: 'அருள்வாக்கு source snapshot',
  firstReading: {
    heading: 'முதல் வாசகம்',
    reference: 'இறைவாக்கினர் ஓசேயா நூலிலிருந்து வாசகம் 14: 1-9',
    text: 'இஸ்ரயேலே! உன் கடவுளாகிய ஆண்டவரிடம் திரும்பி வா; நீ உன் தீச்செயலால் வீழ்ச்சியுற்றாய். ஆண்டவரின் நெறிகள் நேர்மையானவை; நேர்மையானவர்கள் அவற்றைப் பின்பற்றி நடக்கிறார்கள்.',
  },
  psalm: {
    heading: 'பதிலுரைப் பாடல்',
    reference: 'திபா 81',
    text: 'பல்லவி: உன் கடவுளாகிய ஆண்டவர் நானே; என் மக்களே, எனக்குச் செவிகொடுங்கள்.',
  },
  gospelAcclamation: {
    heading: 'நற்செய்திக்கு முன் வசனம்',
    reference: 'மத் 4: 17',
    text: 'மனம் மாறுங்கள், ஏனெனில் விண்ணரசு நெருங்கி வந்துவிட்டது, என்கிறார் ஆண்டவர்.',
  },
  gospel: {
    heading: 'நற்செய்தி வாசகம்',
    reference: 'மாற்கு எழுதிய தூய நற்செய்தியிலிருந்து வாசகம் 12: 28b-34',
    text: 'நம் ஆண்டவராகிய கடவுள் ஒருவரே ஆண்டவர். அவரிடம் அன்புகூர்வாயாக. உன்மீது நீ அன்புகூர்வதுபோல் உனக்கு அடுத்திருப்பவர்மீதும் அன்புகூர்வாயாக.',
  },
  reflection: {
    heading: 'Reflection',
    text: 'Live sync is temporarily unavailable. This cached source snapshot keeps the readings area usable until Firestore or the backend API returns the latest day.',
  },
  sourceUrl: 'https://www.arulvakku.com/calendar.php',
  publicDisplay: true,
  lastSyncedAt: 'Bundled fallback',
  syncStatus: 'cached',
  syncMessage: 'Showing bundled cached readings because live sync is unavailable.',
};
