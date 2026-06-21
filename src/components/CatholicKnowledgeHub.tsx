import React, { useState } from 'react';
import { BookOpen, Star, Calendar, Heart, CrossIcon, ChevronRight, Sun, Moon, Search } from 'lucide-react';

// ─── Static Saints Database (June focus) ────────────────────────────────────
const SAINTS_DATABASE = [
  { date: 'June 1',  name: 'St. Justin Martyr',         feast: 'Memorial',    bio: 'Early Christian apologist who defended the faith before Roman emperors. Martyred around 165 AD.', patronOf: 'Philosophers, Lecturers' },
  { date: 'June 2',  name: 'Sts. Marcellinus & Peter',  feast: 'Memorial',    bio: 'Roman martyrs under Emperor Diocletian. Marcellinus was a priest, Peter an exorcist.', patronOf: 'Exorcists' },
  { date: 'June 3',  name: 'St. Charles Lwanga',        feast: 'Memorial',    bio: 'Leader of the Uganda Martyrs who died for refusing to renounce faith. Patron of African youth.', patronOf: 'Youth of Africa, Catholic Action' },
  { date: 'June 5',  name: 'St. Boniface',              feast: 'Memorial',    bio: 'Apostle of Germany, Archbishop of Mainz. Martyred in 754 AD while preparing confirmands.', patronOf: 'Germany, Brewers, File Cutters' },
  { date: 'June 6',  name: 'St. Norbert',               feast: 'Memorial',    bio: 'Archbishop of Magdeburg, founder of the Premonstratensians (Norbertines). Defender of the Eucharist.', patronOf: 'Bohemia, Peace' },
  { date: 'June 9',  name: 'St. Ephrem the Syrian',     feast: 'Memorial',    bio: 'Deacon, theologian, and poet. Called the "Harp of the Holy Spirit" for his beautiful hymns.', patronOf: 'Spiritual Directors, Spiritual Leaders' },
  { date: 'June 11', name: 'St. Barnabas',              feast: 'Feast',       bio: 'Apostle and companion of St. Paul. His name means "Son of Encouragement." Martyred in Cyprus.', patronOf: 'Cyprus, Antioch' },
  { date: 'June 13', name: 'St. Anthony of Padua',      feast: 'Memorial',    bio: 'Doctor of the Church, Franciscan friar. One of the most beloved saints. Patron of lost things.', patronOf: 'Lost Items, Poor, Travelers, Infertile Women' },
  { date: 'June 19', name: 'St. Romuald',               feast: 'Memorial',    bio: 'Founder of the Camaldolese Order. Established many monasteries and hermitages in Italy.', patronOf: 'Camaldolese Order' },
  { date: 'June 21', name: 'St. Aloysius Gonzaga',      feast: 'Memorial',    bio: 'Jesuit scholastic who died at 23 caring for plague victims. Patron of Catholic youth.', patronOf: 'Catholic Youth, Jesuit Scholastics' },
  { date: 'June 22', name: 'St. John Fisher & St. Thomas More', feast: 'Memorial', bio: 'English martyrs beheaded by Henry VIII for refusing to accept royal supremacy over the Church.', patronOf: 'Bishops, Statesmen, Lawyers' },
  { date: 'June 24', name: 'Nativity of St. John the Baptist', feast: 'Solemnity', bio: 'Forerunner of Christ. His birth was miraculous; his whole life pointed to the Messiah.', patronOf: 'Baptism, Jordan, French Canada' },
  { date: 'June 27', name: 'St. Cyril of Alexandria',   feast: 'Memorial',    bio: 'Patriarch of Alexandria and Doctor of the Church. Championed the title "Theotokos" for Mary.', patronOf: 'Alexandria' },
  { date: 'June 28', name: 'St. Irenaeus',              feast: 'Memorial',    bio: 'Bishop of Lyon and Doctor of the Church. Defender against Gnosticism. Author of Against Heresies.', patronOf: 'Apologists' },
  { date: 'June 29', name: 'Sts. Peter & Paul',         feast: 'Solemnity',   bio: 'The twin pillars of the Church. Peter, first Pope; Paul, Apostle to the Gentiles. Both martyred in Rome.', patronOf: 'The Universal Church, Rome, Fishermen' },
  { date: 'June 30', name: 'First Martyrs of Rome',     feast: 'Optional Memorial', bio: 'Christians killed by Nero after the Great Fire of Rome in 64 AD, on false charges of arson.', patronOf: 'Martyrs' },
];

// ─── Tamil Catholic Prayers ─────────────────────────────────────────────────
const TAMIL_PRAYERS = [
  {
    id: 'our_father',
    title: 'Our Father (எங்கள் தந்தையே)',
    category: 'Daily Prayers',
    tamil: `எங்கள் தந்தையே, விண்ணகத்தில் இருக்கிறவரே,
உம் பெயர் புனிதமாகுக.
உம் அரசு வருக.
விண்ணகத்தில் நிறைவேறுவதுபோல்
மண்ணிலும் உம் திருவுளம் நிறைவேறுக.
எங்களுக்கு வேண்டிய உணவை இன்று தாரும்.
எங்களுக்கு எதிராக குற்றம் செய்தவர்களை
நாங்கள் மன்னிப்பதுபோல்,
எங்கள் குற்றங்களை நீர் மன்னியும்.
சோதனையில் எங்களை விழ விடாதேயும்.
தீமையிலிருந்து எங்களை விடுவியும். ஆமென்.`,
    english: `Our Father, who art in heaven, hallowed be Thy name; Thy kingdom come; Thy will be done on earth as it is in heaven. Give us this day our daily bread; and forgive us our trespasses as we forgive those who trespass against us; and lead us not into temptation, but deliver us from evil. Amen.`,
  },
  {
    id: 'hail_mary',
    title: 'Hail Mary (வாழ்க மரியே)',
    category: 'Marian Prayers',
    tamil: `வாழ்க மரியே, கருணை நிறைந்தவளே,
ஆண்டவர் உன்னோடு இருக்கின்றார்.
பெண்களுக்கிடையில் நீ ஆசிர்வதிக்கப்பட்டவள்,
உன் திருவயிற்றின் கனியாகிய இயேசுவும் ஆசிர்வதிக்கப்பட்டவர்.
பரிசுத்த மரியே, இறைவனின் தாயே,
பாவிகளாகிய எங்களுக்காக இப்போதும்
எங்கள் மரண நேரத்திலும் வேண்டிக்கொள்வாயாக. ஆமென்.`,
    english: `Hail Mary, full of grace, the Lord is with thee. Blessed art thou amongst women, and blessed is the fruit of thy womb, Jesus. Holy Mary, Mother of God, pray for us sinners, now and at the hour of our death. Amen.`,
  },
  {
    id: 'glory_be',
    title: 'Glory Be (மும்மூர்த்திக்கு மகிமை)',
    category: 'Daily Prayers',
    tamil: `தந்தைக்கும் மகனுக்கும் தூய ஆவியாருக்கும் மகிமை உண்டாவதாக.
தொடக்கத்தில் இருந்தது போலவே
இப்போதும் என்றும் என்றென்றும் இருப்பதாக. ஆமென்.`,
    english: `Glory be to the Father, and to the Son, and to the Holy Spirit. As it was in the beginning, is now, and ever shall be, world without end. Amen.`,
  },
  {
    id: 'apostles_creed',
    title: "Apostles' Creed (திருநம்பிக்கை அறிக்கை)",
    category: 'Creed & Faith',
    tamil: `நான் நம்புகிறேன்: எல்லாம் வல்ல தந்தையாம் இறைவனையும்,
அவரது ஒரே மகனாகிய நம் ஆண்டவர் இயேசு கிறிஸ்துவையும் நம்புகிறேன்.
அவர் தூய ஆவியாரால் கருத்தரித்து கன்னி மரியாவிடம் பிறந்தார்.
பொந்தியுஸ் பிலாத்துவின் காலத்தில் துன்புற்று சிலுவையில் அறையப்பட்டு
இறந்து அடக்கம் செய்யப்பட்டார்.
பாதாளத்தில் இறங்கி மூன்றாம் நாளில் உயிர்த்தெழுந்தார்.
விண்ணகத்திற்கு எழுந்தருளி எல்லாம் வல்ல தந்தை இறைவனின்
வலது பக்கம் வீற்றிருக்கிறார்.
அங்கிருந்து உயிரோரையும் இறந்தோரையும் நடுத்தீர்க்க வருவார்.
தூய ஆவியாரையும் நம்புகிறேன்.
திருத்தூய கத்தோலிக்க திருச்சபையையும்,
புனிதர்களின் ஒருமையையும்,
பாவ மன்னிப்பையும்,
உடலின் உயிர்த்தெழுதலையும்,
நிரந்தரமான வாழ்வையும் நம்புகிறேன். ஆமென்.`,
    english: `I believe in God, the Father almighty, Creator of heaven and earth, and in Jesus Christ, His only Son, our Lord, who was conceived by the Holy Spirit, born of the Virgin Mary, suffered under Pontius Pilate, was crucified, died and was buried; He descended into hell; on the third day He rose again from the dead; He ascended into heaven, and is seated at the right hand of God the Father almighty; from there He will come to judge the living and the dead. I believe in the Holy Spirit, the holy catholic Church, the communion of saints, the forgiveness of sins, the resurrection of the body, and life everlasting. Amen.`,
  },
  {
    id: 'act_of_contrition',
    title: 'Act of Contrition (மனஸ்தாப செபம்)',
    category: 'Penitential Prayers',
    tamil: `என் இறைவா! என் குற்றங்கள் அனைத்திற்காகவும் மனமுருகி வருந்துகிறேன்.
நீர் நன்மைத்தனத்திற்காகவும், பாவம் உம்மை வருத்துகிறதால்
மனஸ்தாபப்படுகிறேன்.
தயவுசெய்து என்னை மன்னித்தருளும்.
உம் உதவியால் எனது வாழ்க்கையை திருத்திக்கொள்கிறேன். ஆமென்.`,
    english: `O my God, I am heartily sorry for having offended Thee, and I detest all my sins because of Thy just punishments, but most of all because they offend Thee, my God, who art all good and deserving of all my love. I firmly resolve, with the help of Thy grace, to sin no more and to avoid the near occasions of sin. Amen.`,
  },
  {
    id: 'divine_mercy',
    title: 'Divine Mercy Chaplet (தெய்வீக இரக்க செபமாலை)',
    category: 'Chaplets',
    tamil: `(ஒவ்வொரு மணியிலும்):
நிரந்தர பிதாவே, உம் மகனாகிய இயேசுவின்
மிகவும் வேதனையுள்ள திரு ஆவி மற்றும் திரு ரத்தத்தை
எங்களுடைய பாவங்களுக்கும் உலகம் முழுவதும் உள்ளவர்களின்
பாவங்களுக்கும் பரிகாரமாக உமக்கு ஒப்புக்கொடுக்கிறோம்.

(திரும்பி சொல்லும் பகுதி):
உமது பாடுகளைக் கொண்டு எங்களிடமும்
உலகம் முழுவதும் இரக்கமாக இரும். ஆமென்.`,
    english: `Eternal Father, I offer You the Body and Blood, Soul and Divinity of Your dearly beloved Son, Our Lord Jesus Christ, in atonement for our sins and those of the whole world. (repeat) For the sake of His sorrowful Passion, have mercy on us and on the whole world. Amen.`,
  },
];

// ─── Liturgical Calendar (2026 simplified) ──────────────────────────────────
const LITURGICAL_SEASONS_2026 = [
  { name: 'Advent',        start: '2025-11-30', end: '2025-12-24', color: 'purple',  hex: '#6B21A8' },
  { name: 'Christmas',     start: '2025-12-25', end: '2026-01-12', color: 'white',   hex: '#F8FAFC' },
  { name: 'Ordinary Time', start: '2026-01-13', end: '2026-02-17', color: 'green',   hex: '#15803D' },
  { name: 'Lent',          start: '2026-02-18', end: '2026-04-04', color: 'purple',  hex: '#6B21A8' },
  { name: 'Easter Triduum',start: '2026-04-02', end: '2026-04-04', color: 'red',     hex: '#DC2626' },
  { name: 'Easter',        start: '2026-04-05', end: '2026-05-24', color: 'white',   hex: '#F8FAFC' },
  { name: 'Ordinary Time', start: '2026-05-25', end: '2026-11-28', color: 'green',   hex: '#15803D' },
  { name: 'Advent',        start: '2026-11-29', end: '2026-12-24', color: 'purple',  hex: '#6B21A8' },
];

const UPCOMING_FEASTS_2026 = [
  { date: '2026-06-24', name: 'Nativity of St. John the Baptist', type: 'Solemnity', color: 'white', vestment: 'White' },
  { date: '2026-06-29', name: 'Sts. Peter & Paul',               type: 'Solemnity', color: 'red',   vestment: 'Red' },
  { date: '2026-07-03', name: 'St. Thomas the Apostle',          type: 'Feast',     color: 'red',   vestment: 'Red' },
  { date: '2026-07-16', name: 'Our Lady of Mount Carmel',        type: 'Memorial',  color: 'white', vestment: 'White' },
  { date: '2026-07-22', name: 'St. Mary Magdalene',             type: 'Feast',     color: 'white', vestment: 'White' },
  { date: '2026-07-25', name: 'St. James the Apostle',          type: 'Feast',     color: 'red',   vestment: 'Red' },
  { date: '2026-08-06', name: 'Transfiguration of the Lord',    type: 'Feast',     color: 'white', vestment: 'White' },
  { date: '2026-08-15', name: 'Assumption of Mary',             type: 'Solemnity', color: 'white', vestment: 'White' },
  { date: '2026-09-08', name: 'Nativity of Mary',               type: 'Feast',     color: 'white', vestment: 'White' },
  { date: '2026-10-07', name: 'Our Lady of the Rosary',         type: 'Memorial',  color: 'white', vestment: 'White' },
  { date: '2026-11-01', name: 'All Saints Day',                 type: 'Solemnity', color: 'white', vestment: 'White' },
  { date: '2026-12-08', name: 'Immaculate Conception',          type: 'Solemnity', color: 'white', vestment: 'White' },
  { date: '2026-12-25', name: 'Nativity of Our Lord',           type: 'Solemnity', color: 'white', vestment: 'White' },
];

// ─── Daily Gospel (mock – real data would come from catholictamil.com/daily) ─
const MOCK_GOSPEL = {
  date: '2026-06-16',
  season: 'Ordinary Time - Week 11',
  readings: [
    { label: 'First Reading', ref: '1 Kings 21:17-29', summary: 'Elijah confronts Ahab about Naboth\'s vineyard. God\'s justice and mercy revealed.' },
    { label: 'Psalm', ref: 'Psalm 51:3-6, 11, 16-17', summary: 'Have mercy on me, O God, in your kindness. A broken spirit you will not scorn.' },
    { label: 'Gospel', ref: 'Matthew 5:43-48', summary: 'Love your enemies and pray for those who persecute you, so that you may be children of your Father in heaven.' },
  ],
  reflection: 'Today\'s Gospel challenges us to go beyond human love—which loves only those who love us—to divine love which extends even to enemies. The call to "be perfect as your heavenly Father is perfect" is a call to participate in God\'s own nature of unconditional love.',
  tamilReflection: 'இன்றைய நற்செய்தியில் இயேசு நம்மை சவாலாக அழைக்கிறார்: நம்மை வெறுப்பவர்களையும் நேசிக்க வேண்டும். இது மனித இயல்புக்கு எதிரானது, ஆனால் தெய்வீக அன்பின் குணம் இதுவே.',
};

type HubTab = 'gospel' | 'saints' | 'prayers' | 'calendar';

// ─── Main Component ──────────────────────────────────────────────────────────
export const CatholicKnowledgeHub: React.FC = () => {
  const [tab, setTab] = useState<HubTab>('gospel');
  const [prayerIdx, setPrayerIdx] = useState(0);
  const [showTamil, setShowTamil] = useState(true);
  const [saintSearch, setSaintSearch] = useState('');

  const filteredSaints = SAINTS_DATABASE.filter(
    (s) =>
      s.name.toLowerCase().includes(saintSearch.toLowerCase()) ||
      s.date.toLowerCase().includes(saintSearch.toLowerCase()) ||
      s.patronOf.toLowerCase().includes(saintSearch.toLowerCase()),
  );

  const tabs: { id: HubTab; label: string; icon: React.ElementType }[] = [
    { id: 'gospel',   label: 'Daily Gospel',   icon: BookOpen  },
    { id: 'saints',   label: 'Saints',         icon: Star      },
    { id: 'prayers',  label: 'Prayers',        icon: Heart     },
    { id: 'calendar', label: 'Liturgical Year',icon: Calendar  },
  ];

  const currentPrayer = TAMIL_PRAYERS[prayerIdx];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/30 to-slate-50 p-4">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6 rounded-3xl bg-gradient-to-r from-amber-900 via-amber-800 to-yellow-900 p-6 text-white shadow-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-2xl">
              ✝
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight">Catholic Knowledge Hub</h1>
              <p className="text-xs text-amber-200">Daily Gospel · Saints · Tamil Prayers · Liturgical Year</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-4 flex gap-2 overflow-x-auto rounded-2xl bg-white p-1.5 shadow-sm">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                tab === t.id
                  ? 'bg-amber-800 text-white shadow'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <t.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Gospel Tab */}
        {tab === 'gospel' && (
          <div className="space-y-4">
            <div className="rounded-3xl border border-amber-100 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-amber-700">
                    {MOCK_GOSPEL.date} — {MOCK_GOSPEL.season}
                  </p>
                  <h2 className="mt-1 text-lg font-black text-slate-900">Today's Readings</h2>
                </div>
                <button
                  onClick={() => setShowTamil(!showTamil)}
                  className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-amber-200 px-3 py-2 text-xs font-bold text-amber-800"
                >
                  {showTamil ? '🇬🇧 EN' : '🇮🇳 தமிழ்'}
                </button>
              </div>

              <div className="space-y-3">
                {MOCK_GOSPEL.readings.map((r) => (
                  <div key={r.label} className="rounded-2xl bg-amber-50 p-4">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="rounded-lg bg-amber-800 px-2 py-0.5 text-[10px] font-black text-white">
                        {r.label}
                      </span>
                      <span className="text-xs font-bold text-amber-700">{r.ref}</span>
                    </div>
                    <p className="text-xs text-slate-700">{r.summary}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-green-100 bg-white p-6 shadow-sm">
              <h3 className="mb-3 font-black text-slate-900">Reflection</h3>
              <p className="text-sm leading-relaxed text-slate-700">
                {showTamil ? MOCK_GOSPEL.tamilReflection : MOCK_GOSPEL.reflection}
              </p>
            </div>
          </div>
        )}

        {/* Saints Tab */}
        {tab === 'saints' && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={saintSearch}
                onChange={(e) => setSaintSearch(e.target.value)}
                placeholder="Search saints by name, date, or patronage..."
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-amber-500 min-h-[44px]"
              />
            </div>
            <div className="space-y-2">
              {filteredSaints.map((saint) => (
                <div
                  key={saint.name}
                  className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-100 text-lg">
                      ✦
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="text-sm font-black text-slate-900">{saint.name}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            saint.feast === 'Solemnity'
                              ? 'bg-amber-100 text-amber-800'
                              : saint.feast === 'Feast'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {saint.feast}
                        </span>
                      </div>
                      <p className="text-[11px] font-semibold text-amber-700">{saint.date}</p>
                      <p className="mt-1 text-xs text-slate-600">{saint.bio}</p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        <span className="font-bold">Patron of:</span> {saint.patronOf}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Prayers Tab */}
        {tab === 'prayers' && (
          <div className="space-y-4">
            {/* Prayer Nav */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {TAMIL_PRAYERS.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => setPrayerIdx(i)}
                  className={`flex-shrink-0 rounded-xl px-3 py-2 text-xs font-bold min-h-[44px] transition-all ${
                    prayerIdx === i
                      ? 'bg-amber-800 text-white'
                      : 'border border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  {p.title.split('(')[0].trim()}
                </button>
              ))}
            </div>

            <div className="rounded-3xl border border-amber-100 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <span className="rounded-lg bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                    {currentPrayer.category}
                  </span>
                  <h2 className="mt-2 text-lg font-black text-slate-900">{currentPrayer.title}</h2>
                </div>
                <button
                  onClick={() => setShowTamil(!showTamil)}
                  className="flex min-h-[44px] items-center gap-1 rounded-xl border border-amber-200 px-3 py-2 text-xs font-bold text-amber-800"
                >
                  {showTamil ? '🇬🇧' : '🇮🇳'}
                </button>
              </div>

              <div className="rounded-2xl bg-amber-50 p-4">
                <p className="whitespace-pre-line text-sm leading-7 text-slate-800">
                  {showTamil ? currentPrayer.tamil : currentPrayer.english}
                </p>
              </div>

              {/* Nav arrows */}
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setPrayerIdx((i) => Math.max(0, i - 1))}
                  disabled={prayerIdx === 0}
                  className="flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-slate-200 text-sm font-bold disabled:opacity-30"
                >
                  ← Previous
                </button>
                <button
                  onClick={() => setPrayerIdx((i) => Math.min(TAMIL_PRAYERS.length - 1, i + 1))}
                  disabled={prayerIdx === TAMIL_PRAYERS.length - 1}
                  className="flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-amber-800 text-sm font-bold text-white disabled:opacity-30"
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Calendar Tab */}
        {tab === 'calendar' && (
          <div className="space-y-4">
            {/* Current Season Banner */}
            <div className="rounded-3xl bg-gradient-to-r from-green-800 to-emerald-700 p-5 text-white shadow-xl">
              <p className="text-xs font-bold uppercase tracking-widest text-green-200">Current Season</p>
              <h2 className="mt-1 text-2xl font-black">Ordinary Time</h2>
              <p className="mt-1 text-sm text-green-100">
                The longest liturgical season — a time to grow in faith and discipleship.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <div className="h-4 w-4 rounded-full bg-green-300" />
                <span className="text-xs font-bold text-green-100">Vestment colour: Green</span>
              </div>
            </div>

            {/* Season Guide */}
            <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              <h3 className="mb-3 font-black text-slate-900">2026 Liturgical Year (Year C)</h3>
              <div className="space-y-2">
                {LITURGICAL_SEASONS_2026.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl p-2">
                    <div
                      className="h-4 w-4 flex-shrink-0 rounded-full border border-slate-200"
                      style={{ backgroundColor: s.hex }}
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-bold text-slate-800">{s.name}</span>
                      <span className="ml-2 text-xs text-slate-500">
                        {s.start} – {s.end}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming Feasts */}
            <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              <h3 className="mb-3 font-black text-slate-900">Upcoming Solemnities & Feasts</h3>
              <div className="space-y-2">
                {UPCOMING_FEASTS_2026.slice(0, 8).map((f) => (
                  <div key={f.date} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                    <div
                      className="flex h-10 w-10 flex-shrink-0 flex-col items-center justify-center rounded-xl border text-xs font-black"
                      style={{ borderColor: f.color === 'white' ? '#e2e8f0' : f.color === 'red' ? '#dc2626' : '#6B21A8', color: f.color === 'white' ? '#475569' : f.color === 'red' ? '#dc2626' : '#6B21A8' }}
                    >
                      {f.date.split('-')[2]}
                      <span className="text-[9px] font-semibold">
                        {new Date(f.date).toLocaleDateString('en', { month: 'short' })}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-800">{f.name}</p>
                      <p className="text-[11px] text-slate-500">
                        {f.type} · Vestment: {f.vestment}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
