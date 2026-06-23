import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Star, Calendar, Heart, Search, Music2, RefreshCw, ExternalLink, ShieldCheck, Lock, ArrowLeft, Copy, Share2, X } from 'lucide-react';
import { apiFetch } from '../services/apiClient';
import { useFirebaseAuth, hasMinimumRole } from '../hooks/useFirebaseAuth';
import { DailyReadingsCard } from './bible/DailyReadingsCard';
import { DailyReadingsSyncPanel } from './bible/DailyReadingsSyncPanel';

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
    title: 'Our Father (விண்ணுலகில் இருக்கிற எங்கள் தந்தையே)',
    category: 'Daily Prayers',
    tamil: `விண்ணுலகில் இருக்கிற எங்கள் தந்தையே
உமது பெயர் தூயது எனப் போற்றப்பெறுக!
உமது ஆட்சி வருக
உமது திருவுளம் விண்ணுலகில் நிறைவேறுவது போல
மண்ணுலகிலும் நிறைவேறுக

எங்கள் அன்றாட உணவை இன்று எங்களுக்குத் தாரும் 
எங்களுக்கு எதிராக குற்றம் செய்வோரை
நாங்கள் மன்னிப்பது போல எங்கள் குற்றங்களை மன்னியும்
எங்களைச் சோதனைக்கு உட்படுத்தாதேயும்,
தீயோனிடமிருந்து எங்களை விடுவித்தருளும்.ஆமென்.`,
    english: `Our Father, who art in heaven, hallowed be Thy name; Thy kingdom come; Thy will be done on earth as it is in heaven. Give us this day our daily bread; and forgive us our trespasses as we forgive those who trespass against us; and lead us not into temptation, but deliver us from evil. Amen.`,
  },
  {
    id: 'hail_mary',
    title: 'Hail Mary (அருள் மிகப்பெற்ற மரியே வாழ்க)',
    category: 'Marian Prayers',
    tamil: `அருள் மிகப்பெற்ற மரியே வாழ்க!ஆண்டவர் உம்முடனே.
பெண்களுக்குள் ஆசி பெற்றவர் நீரே,
உம்முடைய திருவயிற்றின் கனியாகிய இயேசுவும் ஆசி பெற்றவரே.

தூய மரியே, இறைவனின் தாயே,
பாவிகளாய் இருக்கிற எங்களுக்காக,
இப்பொழுதும் எங்கள் இறப்பின் வேளையிலும் வேண்டிக்கொள்ளும்.ஆமென்.`,
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
    title: "Apostles' Creed (நம்பிக்கை அறிக்கை)",
    category: 'Creed & Faith',
    tamil: `விண்ணகத்தையும் மண்ணகத்தையும் படைத்த எல்லாம் வல்ல தந்தையாகிய கடவுளை நம்புகின்றேன்.
அவருடைய ஒரே மகனாகிய நம் ஆண்டவர் இயேசு கிறிஸ்துவை நம்புகின்றேன்.
('பிறந்தார்" எனச் சொல்லும் வரை எல்லாரும் தலை வணங்கவும்)
இவர் தூய ஆவியால் கருவுற்று கன்னி மரியாவிடமிருந்து பிறந்தார்.
பொந்தியு பிலாத்தின் அதிகாரத்தில் பாடுபட்டுச் சிலுவையில் அறையப்பட்டு, இறந்து, அடக்கம் செய்யப்பட்டார்.
பாதாளத்தில் இறங்கி, மூன்றாம் நாள் இறந்தோரிடமிருந்து உயிர்த்தெழுந்தார்.
விண்ணகத்திற்கு எழுந்தருளி எல்லாம் வல்ல தந்தையாகிய கடவுளின் வலப்பக்கத்தில் வீற்றிருக்கின்றார்.
அங்கிருந்து வாழ்வோருக்கும் இறந்தோருக்கும் தீர்ப்பு வழங்க வருவார்.
தூய ஆவியாரை நம்புகின்றேன்.
புனித, கத்தோலிக்கத் திரு அவையை நம்புகின்றேன்.
புனிதர்களின் உறவு ஒன்றிப்பை நம்புகின்றேன்.
பாவ மன்னிப்பை நம்புகின்றேன்.
உடலின் உயிர்ப்பை நம்புகின்றேன்.
நிலை வாழ்வை நம்புகின்றேன். ஆமென்.

நம்பிக்கை அறிக்கை (பாடும் போது)

1. விண்ணையும் மண்ணையும் படைத்தவராம்
கடவுள் ஒருவர் இருக்கின்றார்
தந்தை, மகன், தூய ஆவியராய்
ஒன்றாய் வாழ்வோரை நம்புகிறேன்.

2. தூய ஆவியின் வல்லமையால்
இறைமகன் நமக்காய் மனிதரானார்
கன்னி மரியிடம் பிறந்தவராம்
இயேசுவை உறுதியாய் நம்புகிறேன்

3. பிலாத்துவின் ஆட்சியில் பாடுபட்டார்
சிலுவையில் இறந்து அடக்கப்பட்டார்
மூன்றாம் நாளில் உயிர்த்தெழுந்தார்
இறப்பின் மீதே வெற்றி கொண்டார்.

4. விண்ணகம் வாழும் தந்தையிடம்
அரியணைக் கொண்டு இருக்கின்றார்
உலகம் முடியும் காலத்திலே
நடுவராய் திரும்பவும் வந்திடுவார்

5. தூய ஆவியாரை நம்புகிறேன்
பாரினில் அவர் துணை வேண்டுகிறேன ;
பாவ மன்னிப்பில் தூய்மை பெற்று
பரிகார வாழ்வில் நிலைத்திடுவேன்.

6. திரு அவை உரைப்பதை நம்புகிறேன்
புனிதர்கள் உறவை நம்புகிறேன்
உடலின் உயிர்ப்பை நிலைவாழ்வை
உறுதியுடனே நம்புகிறேன் - ஆமென்`,
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

// ─── Catholic Hub live content (synced from catholictamil.com) ─────────────
const HUB_SONG_CATEGORIES = [
  { categoryId: 'varugai',        categoryTamil: 'வருகைப் பாடல்கள்',               sourceUrl: 'https://www.radio.catholictamil.com/p/blog-page_7.html' },
  { categoryId: 'thiruppadal',    categoryTamil: 'திருப்பாடல்கள்',                  sourceUrl: 'https://www.radio.catholictamil.com/p/blog-page_63.html' },
  { categoryId: 'thiyanam',       categoryTamil: 'தியானப் பாடல்கள்',                sourceUrl: 'https://www.radio.catholictamil.com/p/blog-page_16.html' },
  { categoryId: 'kanikkai',       categoryTamil: 'காணிக்கைப் பாடல்கள்',             sourceUrl: 'https://www.radio.catholictamil.com/p/blog-page_50.html' },
  { categoryId: 'thiruvirundhu',  categoryTamil: 'திருவிருந்துப் பாடல்கள்',         sourceUrl: 'https://www.radio.catholictamil.com/p/blog-page_75.html' },
  { categoryId: 'nandri',        categoryTamil: 'நன்றிப் பாடல்கள்',                sourceUrl: 'https://www.radio.catholictamil.com/p/blog-page_34.html' },
  { categoryId: 'arunkodai',      categoryTamil: 'அருங்கொடைப் பாடல்கள்',            sourceUrl: 'https://www.radio.catholictamil.com/p/blog-page_67.html' },
  { categoryId: 'parampariya',    categoryTamil: 'பாரம்பரியப் பாடல்கள்',            sourceUrl: 'https://www.radio.catholictamil.com/p/blog-page_85.html' },
  { categoryId: 'thiruppali',     categoryTamil: 'திருப்பலி பாடல்கள்',              sourceUrl: 'https://www.radio.catholictamil.com/p/blog-page_77.html' },
  { categoryId: 'aradhana',       categoryTamil: 'ஆராதனைப் பாடல்கள்',              sourceUrl: 'https://www.radio.catholictamil.com/p/blog-page_83.html' },
  { categoryId: 'oppuravai',      categoryTamil: 'ஒப்புரவுப் பாடல்கள்',             sourceUrl: 'https://www.radio.catholictamil.com/p/blog-page_43.html' },
  { categoryId: 'maatha',         categoryTamil: 'மாதா பாடல்கள்',                   sourceUrl: 'https://www.radio.catholictamil.com/p/blog-page_88.html' },
  { categoryId: 'thooyaaviyar',   categoryTamil: 'தூய ஆவியார் பாடல்கள்',            sourceUrl: 'https://www.radio.catholictamil.com/p/blog-page_1.html' },
  { categoryId: 'christmas',      categoryTamil: 'கிறிஸ்மஸ் பாடல்கள்',              sourceUrl: 'https://www.radio.catholictamil.com/p/blog-page_6.html' },
  { categoryId: 'narkarunai',     categoryTamil: 'நற்கருணை ஆசீர்',                  sourceUrl: 'https://www.radio.catholictamil.com/p/blog-page_911.html' },
  { categoryId: 'praarthana',     categoryTamil: 'பிராத்தனைகள்',                    sourceUrl: 'https://www.radio.catholictamil.com/p/blog-page_543.html' },
  { categoryId: 'thavakkaalam',   categoryTamil: 'தவக்காலப் பாடல்கள்',              sourceUrl: 'https://www.radio.catholictamil.com/p/blog-page_91.html' },
  { categoryId: 'kuruthu',        categoryTamil: 'குருத்து ஞாயிறு பாடல்கள்',        sourceUrl: 'https://www.radio.catholictamil.com/p/blog-page_844.html' },
  { categoryId: 'periya_viazham', categoryTamil: 'பெரிய வியாழன் பாடல்கள்',          sourceUrl: 'https://www.radio.catholictamil.com/p/blog-page_191.html' },
  { categoryId: 'punitha_velli',  categoryTamil: 'புனித வெள்ளி பாடல்கள்',           sourceUrl: 'https://www.radio.catholictamil.com/p/blog-page_616.html' },
  { categoryId: 'siluvai',        categoryTamil: 'சிலுவைப் பாதை பாடல்கள்',          sourceUrl: 'https://www.radio.catholictamil.com/p/blog-page_454.html' },
  { categoryId: 'paaska',         categoryTamil: 'பாஸ்கா திருவிழிப்பு பாடல்கள்',   sourceUrl: 'https://www.radio.catholictamil.com/p/blog-page_870.html' },
  { categoryId: 'thiruithayam',   categoryTamil: 'திருஇதயப் பாடல்கள்',              sourceUrl: 'https://www.radio.catholictamil.com/p/blog-page_4036.html' },
  { categoryId: 'bajana',         categoryTamil: 'பஜனைப் பாடல்கள்',                 sourceUrl: 'https://www.radio.catholictamil.com/p/blog-page_1443.html' },
  { categoryId: 'sirar',          categoryTamil: 'சிறார் பாடல்கள்',                  sourceUrl: 'https://www.radio.catholictamil.com/p/blog-page_7073.html' },
  { categoryId: 'irandhor',       categoryTamil: 'இறந்தோர் திருப்பலிப் பாடல்கள்',  sourceUrl: 'https://www.radio.catholictamil.com/p/blog-page_527.html' },
  { categoryId: 'thirumana',      categoryTamil: 'திருமணப் பாடல்கள்',               sourceUrl: 'https://www.radio.catholictamil.com/p/blog-page_8398.html' },
  { categoryId: 'kuruthuvam',     categoryTamil: 'குருத்துவப் பாடல்கள்',             sourceUrl: 'https://www.radio.catholictamil.com/p/blog-page_824.html' },
  { categoryId: 'iraiirakkam',    categoryTamil: 'இறைஇரக்கப் பாடல்கள்',             sourceUrl: 'https://www.radio.catholictamil.com/p/blog-page_541.html' },
  { categoryId: 'parampariya2',   categoryTamil: 'பாரம்பரியப் பாடல்கள் (2)',         sourceUrl: 'https://www.radio.catholictamil.com/p/blog-page_4645.html' },
  { categoryId: 'punidar',        categoryTamil: 'புனிதர் பாடல்கள்',                 sourceUrl: 'https://www.radio.catholictamil.com/p/blog-page_7512.html' },
  { categoryId: 'naadiya',        categoryTamil: 'நாட்டியப் பாடல்கள்',               sourceUrl: 'https://www.radio.catholictamil.com/p/blog-page_8337.html' },
  { categoryId: 'pazhaiya',       categoryTamil: 'பழைய பாடல்கள்',                   sourceUrl: 'https://www.radio.catholictamil.com/p/blog-page_5209.html' },
  { categoryId: 'gregorian',      categoryTamil: 'இலத்தீன் கிரகோரியன் பாடல்கள்',   sourceUrl: 'https://www.radio.catholictamil.com/p/gregorian-chant-hymns.html' },
  { categoryId: 'keerthana',      categoryTamil: 'கிறிஸ்தவக் கீர்த்தனைகள்',         sourceUrl: 'https://www.radio.catholictamil.com/p/blog-page_9031.html' },
];

interface CatholicHubSong {
  id: string;
  title: string;
  category: string;
  categoryTamil: string;
  lyrics: string;
  lyricsNormalized?: string;
  titleNormalized?: string;
  sourceUrl: string;
  sourcePage: string;
  order: number;
  tags: string[];
  lastSyncedAt?: string;
}

interface CatholicHubSongSyncStatus {
  categoryId: string;
  categoryTamil: string;
  sourceUrl: string;
  lastSyncedAt?: string;
  lastSuccessAt?: string;
  lastFailureAt?: string;
  status?: string;
  errorMessage?: string;
  totalSongsSynced?: number;
  syncDurationMs?: number;
}

type HubTab = 'gospel' | 'saints' | 'prayers' | 'calendar' | 'updates';

const tamilPhoneticHints: Record<string, string[]> = {
  anbe: ['அன்பே', 'அன்பு'],
  arul: ['அருள்', 'அருட்'],
  yesu: ['இயேசு', 'யேசு'],
  yesuve: ['இயேசுவே', 'யேசுவே'],
  varugai: ['வருகை', 'வருகைப்', 'வாருங்கள்'],
  thiru: ['திரு', 'திருப்பாடல்'],
  thiyanam: ['தியானம்', 'தியானப்'],
  dhiyanam: ['தியானம்', 'தியானப்'],
};

function normalizeHubSearch(value: string) {
  return value
    .normalize('NFC')
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeHubHtmlEntities(value: string) {
  const named: Record<string, string> = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' ',
    zwj: '\u200D',
    zwnj: '\u200C',
  };
  let decoded = value || '';
  for (let i = 0; i < 4; i += 1) {
    const next = decoded
      .replace(/&#(\d+);?/g, (_, code) => String.fromCodePoint(Number(code)))
      .replace(/&#x([0-9a-f]+);?/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
      .replace(/&([a-z]+);/gi, (_, name) => named[String(name).toLowerCase()] ?? `&${name};`);
    if (next === decoded) break;
    decoded = next;
  }
  return decoded;
}

function sanitizeHubSong(song: CatholicHubSong): CatholicHubSong {
  const title = decodeHubHtmlEntities(song.title || '');
  const categoryTamil = decodeHubHtmlEntities(song.categoryTamil || '');
  const lyrics = decodeHubHtmlEntities(song.lyrics || '');
  const tags = Array.isArray(song.tags) ? song.tags.map((tag) => decodeHubHtmlEntities(String(tag))) : [];

  return {
    ...song,
    title,
    categoryTamil,
    lyrics,
    tags,
    titleNormalized: normalizeHubSearch(title),
    lyricsNormalized: normalizeHubSearch(lyrics),
  };
}

function sanitizeHubStatus(status: CatholicHubSongSyncStatus): CatholicHubSongSyncStatus {
  return {
    ...status,
    categoryTamil: decodeHubHtmlEntities(status.categoryTamil || ''),
  };
}

function expandHubSearchQuery(query: string) {
  const normalized = normalizeHubSearch(query);
  const hints = Object.entries(tamilPhoneticHints)
    .filter(([key]) => normalized.includes(key))
    .flatMap(([, words]) => words.map(normalizeHubSearch));
  return [normalized, ...hints].filter(Boolean);
}

// ─── Main Component ──────────────────────────────────────────────────────────
export const CatholicKnowledgeHub: React.FC = () => {
  const [tab, setTab] = useState<HubTab>('gospel');
  const [prayerIdx, setPrayerIdx] = useState(0);
  const [showTamil, setShowTamil] = useState(true);
  const [saintSearch, setSaintSearch] = useState('');

  const { effectiveRole } = useFirebaseAuth();
  const isAdmin = hasMinimumRole(effectiveRole, 'choir_admin');

  const [songs, setSongs] = useState<CatholicHubSong[]>([]);
  const [songSyncStatus, setSongSyncStatus] = useState<CatholicHubSongSyncStatus[]>([]);
  const [isLoadingSongs, setIsLoadingSongs] = useState(false);
  const [songsError, setSongsError] = useState('');
  const [songSearch, setSongSearch] = useState('');
  const [songCategory, setSongCategory] = useState('all');
  const [selectedSongId, setSelectedSongId] = useState('');
  const [isSyncingSongs, setIsSyncingSongs] = useState(false);
  const [mobileSongOpen, setMobileSongOpen] = useState(false);
  const [autoSyncAttempted, setAutoSyncAttempted] = useState(false);

  const loadSongs = async () => {
    setIsLoadingSongs(true);
    setSongsError('');
    try {
      const response = await apiFetch(`/api/catholic-hub/songs?category=${encodeURIComponent(songCategory)}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Songs are not available yet. Please sync content or try again.');
      const loadedSongs = (payload.songs || []).map(sanitizeHubSong);
      if (loadedSongs.length === 0 && !autoSyncAttempted) {
        setAutoSyncAttempted(true);
        const syncResponse = await apiFetch('/api/catholic-hub/songs/sync', {
          method: 'POST',
          body: JSON.stringify({ categoryId: songCategory }),
        });
        if (syncResponse.ok) {
          const retryResponse = await apiFetch(`/api/catholic-hub/songs?category=${encodeURIComponent(songCategory)}`);
          const retryPayload = await retryResponse.json();
          if (retryResponse.ok) {
            const retrySongs = (retryPayload.songs || []).map(sanitizeHubSong);
            setSongs(retrySongs);
            setSongSyncStatus((retryPayload.syncStatus || []).map(sanitizeHubStatus));
            const nextSong = retrySongs[0];
            setSelectedSongId((current) => current || nextSong?.id || '');
            return;
          }
        }
      }
      setSongs(loadedSongs);
      setSongSyncStatus((payload.syncStatus || []).map(sanitizeHubStatus));
      const hashSongId = window.location.hash.replace(/^#song-/, '');
      const nextSong = loadedSongs.find((item: CatholicHubSong) => item.id === hashSongId) || loadedSongs[0];
      setSelectedSongId((current) => current || nextSong?.id || '');
    } catch {
      setSongsError('Songs are not available yet. Please sync content or try again.');
    } finally {
      setIsLoadingSongs(false);
    }
  };

  useEffect(() => {
    if (tab === 'updates' && songs.length === 0 && !isLoadingSongs) {
      void loadSongs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, songCategory]);

  const triggerSongSync = async (categoryId = 'all') => {
    setIsSyncingSongs(true);
    try {
      const response = await apiFetch('/api/catholic-hub/songs/sync', {
        method: 'POST',
        body: JSON.stringify({ categoryId }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Sync failed.');
      await loadSongs();
    } catch (error) {
      setSongsError(error instanceof Error ? error.message : 'Sync failed.');
    } finally {
      setIsSyncingSongs(false);
    }
  };

  const filteredSongs = useMemo(() => {
    const queryParts = expandHubSearchQuery(songSearch);
    const seen = new Set<string>();
    return songs.filter((song) => {
      if (seen.has(song.id)) return false;
      seen.add(song.id);
      if (songCategory !== 'all' && song.category !== songCategory) return false;
      if (queryParts.length === 0) return true;
      const haystack = normalizeHubSearch([
        song.title,
        song.categoryTamil,
        song.lyrics,
        song.tags?.join(' ') || '',
      ].join(' '));
      return queryParts.some((part) => haystack.includes(part));
    });
  }, [songs, songCategory, songSearch]);

  // Group filtered songs by category for the index panel
  const groupedSongs = useMemo(() => {
    const map = new Map<string, { label: string; songs: CatholicHubSong[] }>();
    for (const song of filteredSongs) {
      const key = song.category || 'other';
      if (!map.has(key)) map.set(key, { label: song.categoryTamil || key, songs: [] });
      map.get(key)!.songs.push(song);
    }
    return Array.from(map.values());
  }, [filteredSongs]);

  const selectedSong = songs.find((song) => song.id === selectedSongId) || filteredSongs[0] || songs[0];
  const selectedStatus = songSyncStatus.find((status) => status.categoryId === songCategory)
    || songSyncStatus.find((status) => status.categoryId === selectedSong?.category);

  const selectSong = (song: CatholicHubSong, openMobile = false) => {
    setSelectedSongId(song.id);
    window.history.replaceState(null, '', `#song-${song.id}`);
    if (openMobile) setMobileSongOpen(true);
  };

  const copySong = async (song?: CatholicHubSong) => {
    if (!song) return;
    await navigator.clipboard?.writeText(`${song.title}\n\n${song.lyrics || ''}`.trim());
  };

  const shareSong = async (song?: CatholicHubSong) => {
    if (!song) return;
    const text = `${song.title}\n${window.location.href}`;
    if (navigator.share) {
      await navigator.share({ title: song.title, text, url: window.location.href });
      return;
    }
    await navigator.clipboard?.writeText(text);
  };

  const filteredSaints = SAINTS_DATABASE.filter(
    (s) =>
      s.name.toLowerCase().includes(saintSearch.toLowerCase()) ||
      s.date.toLowerCase().includes(saintSearch.toLowerCase()) ||
      s.patronOf.toLowerCase().includes(saintSearch.toLowerCase()),
  );

  const tabs: { id: HubTab; label: string; icon: React.ElementType }[] = [
    { id: 'gospel',   label: 'Daily Gospel',   icon: BookOpen  },
    { id: 'updates',  label: 'Songs',          icon: Music2    },
    { id: 'saints',   label: 'Saints',         icon: Star      },
    { id: 'prayers',  label: 'Prayers',        icon: Heart     },
    { id: 'calendar', label: 'Liturgical Year',icon: Calendar  },
  ];

  const currentPrayer = TAMIL_PRAYERS[prayerIdx];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/30 to-slate-50 px-3 py-4 sm:px-5 lg:px-8">
      <div className="mx-auto w-full max-w-[1360px]">
        {/* Header */}
        <div className="mb-6 rounded-3xl bg-gradient-to-r from-amber-900 via-amber-800 to-yellow-900 p-6 text-white shadow-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-2xl">
              ✝
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight">Catholic Knowledge Hub</h1>
              <p className="text-xs text-amber-200">Daily Gospel · Songs · Saints · Tamil Prayers · Liturgical Year</p>
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

        {/* Gospel Tab — live-synced reading card (was previously duplicated in
            the Bible section too; now lives here only, so the date always
            matches today everywhere instead of drifting out of sync). */}
        {tab === 'gospel' && (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
            <DailyReadingsCard />
            <DailyReadingsSyncPanel currentRole={effectiveRole} />
          </div>
        )}

        {/* Songs Tab */}
        {tab === 'updates' && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">Catholic Tamil Songs</p>
                  <h2 className="mt-1 text-xl font-black text-slate-900">Songs</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {selectedStatus?.lastSuccessAt
                      ? `Last synced ${new Date(selectedStatus.lastSuccessAt).toLocaleString()}`
                      : 'Songs are not synced yet.'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void loadSongs()}
                    disabled={isLoadingSongs}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700 disabled:opacity-40"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isLoadingSongs ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                  {isAdmin && (
                    <>
                      <button
                        type="button"
                        onClick={() => void triggerSongSync(songCategory)}
                        disabled={isSyncingSongs}
                        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-amber-800 px-3 text-xs font-bold text-white disabled:opacity-40"
                      >
                        <ShieldCheck className={`h-3.5 w-3.5 ${isSyncingSongs ? 'animate-pulse' : ''}`} />
                        Sync selected
                      </button>
                      <button
                        type="button"
                        onClick={() => void triggerSongSync('all')}
                        disabled={isSyncingSongs}
                        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-amber-200 px-3 text-xs font-bold text-amber-800 disabled:opacity-40"
                      >
                        Sync all
                      </button>
                    </>
                  )}
                </div>
              </div>
              {!isAdmin && (
                <p className="mt-3 flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
                  <Lock className="h-3 w-3" /> Manual sync control is visible to choir admins and above.
                </p>
              )}
            </div>

            <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
              <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={songSearch}
                    onChange={(e) => setSongSearch(e.target.value)}
                    placeholder="Search Tamil title, lyrics, anbe, arul..."
                    className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none min-h-[44px] focus:border-amber-500"
                  />
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1 xl:flex-col xl:overflow-visible">
                  <button
                    type="button"
                    onClick={() => setSongCategory('all')}
                    className={`flex-shrink-0 rounded-xl px-3 py-2 text-left text-xs font-black transition-all ${songCategory === 'all' ? 'bg-amber-800 text-white shadow' : 'border border-slate-200 bg-white text-slate-700'}`}
                  >
                    All Songs
                  </button>
                  {HUB_SONG_CATEGORIES.map((category) => (
                    <button
                      key={category.categoryId}
                      type="button"
                      onClick={() => setSongCategory(category.categoryId)}
                      className={`flex-shrink-0 rounded-xl px-3 py-2 text-left text-xs font-black transition-all ${songCategory === category.categoryId ? 'bg-amber-800 text-white shadow' : 'border border-slate-200 bg-white text-slate-700'}`}
                    >
                      {category.categoryTamil}
                    </button>
                  ))}
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-2 shadow-sm">
                  <div className="flex items-center justify-between px-2 py-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Song Index</p>
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-800">{filteredSongs.length}</span>
                  </div>
                  <div className="max-h-[62vh] space-y-1 overflow-y-auto pr-1">
                    {isLoadingSongs ? (
                      <div className="flex min-h-[180px] items-center justify-center text-sm font-bold text-slate-500">
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Loading songs...
                      </div>
                    ) : filteredSongs.length === 0 ? (
                      <div className="space-y-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
                        <p className="px-2 py-1 text-center font-bold text-slate-700">
                          {songs.length === 0 ? 'Song sync is pending. Open the source categories below.' : 'No songs match your search.'}
                        </p>
                        {songs.length === 0 && HUB_SONG_CATEGORIES.map((category) => (
                          <a
                            key={category.categoryId}
                            href={category.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex min-h-[44px] items-center justify-between rounded-lg bg-white px-3 py-2 font-bold text-amber-800 shadow-sm"
                          >
                            {category.categoryTamil}
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        ))}
                      </div>
                    ) : (
                      groupedSongs.map(({ label, songs: groupSongs }) => (
                        <div key={label}>
                          <div className="sticky top-0 z-10 bg-white px-2 pb-1 pt-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">{label}</p>
                          </div>
                          {groupSongs.map((song) => (
                            <button
                              key={song.id}
                              type="button"
                              onClick={() => selectSong(song, window.matchMedia('(max-width: 767px)').matches)}
                              className={`w-full rounded-xl p-3 text-left transition ${selectedSong?.id === song.id ? 'bg-amber-50 ring-1 ring-amber-200' : 'hover:bg-slate-50'}`}
                            >
                              <p className="line-clamp-2 text-sm font-black text-slate-900">{song.title}</p>
                              <p className="mt-1 text-[11px] font-semibold text-slate-400">#{song.order}</p>
                            </button>
                          ))}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </aside>

              <section className="hidden min-h-[620px] rounded-3xl border border-slate-100 bg-white shadow-sm md:block">
                {songsError ? (
                  <div className="flex h-full min-h-[420px] flex-col items-center justify-center p-8 text-center">
                    <Music2 className="h-10 w-10 text-rose-500" />
                    <h3 className="mt-3 text-sm font-black text-slate-900">Songs are not available yet</h3>
                    <p className="mt-1 max-w-md text-xs text-slate-500">Songs are not available yet. Please sync content or try again.</p>
                    <button
                      type="button"
                      onClick={() => void loadSongs()}
                      className="mt-4 inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-amber-800 px-4 text-xs font-bold text-white"
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Retry
                    </button>
                  </div>
                ) : selectedSong ? (
                  <article className="flex h-full min-h-[620px] flex-col">
                    <header className="border-b border-slate-100 p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">{selectedSong.categoryTamil}</p>
                          <h3 className="mt-1 text-2xl font-black text-slate-950">{selectedSong.title}</h3>
                          <p className="mt-1 text-xs text-slate-500">Tamil · Song #{selectedSong.order}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => void copySong(selectedSong)} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700"><Copy className="h-3.5 w-3.5" /> Copy</button>
                          <button onClick={() => void shareSong(selectedSong)} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700"><Share2 className="h-3.5 w-3.5" /> Share</button>
                          <a href={selectedSong.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-amber-800 px-3 text-xs font-bold text-white"><ExternalLink className="h-3.5 w-3.5" /> Source</a>
                        </div>
                      </div>
                    </header>
                    <div className="min-h-0 flex-1 overflow-y-auto p-6">
                      {selectedSong.lyrics ? (
                        <p className="whitespace-pre-line font-serif text-xl leading-10 text-slate-900">{selectedSong.lyrics}</p>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                          Lyrics extraction pending. Open the source page to view this song.
                        </div>
                      )}
                    </div>
                  </article>
                ) : (
                  <div className="flex h-full min-h-[420px] flex-col items-center justify-center p-8 text-center text-sm text-slate-500">
                    <Music2 className="h-10 w-10 text-amber-700" />
                    <h3 className="mt-3 text-base font-black text-slate-900">Catholic Tamil Songs</h3>
                    <p className="mt-1 max-w-md">
                      The backend song sync is pending. You can open the original song categories now.
                    </p>
                    <div className="mt-5 grid w-full max-w-xl gap-2 sm:grid-cols-3">
                      {HUB_SONG_CATEGORIES.map((category) => (
                        <a
                          key={category.categoryId}
                          href={category.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs font-black text-amber-900"
                        >
                          {category.categoryTamil}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            </div>

            {mobileSongOpen && selectedSong && (
              <div className="fixed inset-0 z-[70] bg-white md:hidden">
                <div className="flex h-[100dvh] flex-col pb-[env(safe-area-inset-bottom)]">
                  <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 p-4 backdrop-blur">
                    <div className="flex items-center justify-between gap-2">
                      <button onClick={() => setMobileSongOpen(false)} className="inline-flex min-h-[40px] items-center gap-1 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700"><ArrowLeft className="h-4 w-4" /> Songs</button>
                      <button onClick={() => setMobileSongOpen(false)} className="min-h-[40px] min-w-[40px] rounded-xl border border-slate-200 p-2 text-slate-600" aria-label="Close"><X className="h-4 w-4" /></button>
                    </div>
                    <p className="mt-3 text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">{selectedSong.categoryTamil}</p>
                    <h3 className="mt-1 text-lg font-black text-slate-950">{selectedSong.title}</h3>
                    <p className="mt-1 text-xs text-slate-500">Tamil · Song #{selectedSong.order}</p>
                    <div className="mt-3 flex gap-2 overflow-x-auto">
                      <button onClick={() => void copySong(selectedSong)} className="inline-flex min-h-[40px] flex-shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700"><Copy className="h-3.5 w-3.5" /> Copy</button>
                      <button onClick={() => void shareSong(selectedSong)} className="inline-flex min-h-[40px] flex-shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700"><Share2 className="h-3.5 w-3.5" /> Share</button>
                      <a href={selectedSong.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-[40px] flex-shrink-0 items-center gap-1.5 rounded-xl bg-amber-800 px-3 text-xs font-bold text-white"><ExternalLink className="h-3.5 w-3.5" /> Source</a>
                    </div>
                  </header>
                  <main className="min-h-0 flex-1 overflow-y-auto p-5 overscroll-contain">
                    {selectedSong.lyrics ? (
                      <p className="whitespace-pre-line font-serif text-xl leading-10 text-slate-900">{selectedSong.lyrics}</p>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                        Lyrics extraction pending. Open the source page to view this song.
                      </div>
                    )}
                  </main>
                </div>
              </div>
            )}
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
