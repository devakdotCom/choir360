import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Song, Language } from '../types';
import {
  ArrowLeft,
  BookOpen,
  Check,
  Copy,
  Download,
  ExternalLink,
  Languages,
  ListMusic,
  Loader2,
  Maximize2,
  Minimize2,
  Minus,
  Moon,
  Music,
  Pause,
  Play,
  Plus,
  Search,
  Share2,
  Sparkles,
  Star,
  Sun,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { RenderTask } from 'pdfjs-dist/types/src/display/api';
import { MULTILINGUAL_DICTIONARY } from '../data/mockData';
import { apiFetch } from '../services/apiClient';
import { buildTamilSearchText, expandSearchQuery, normalizeSearchText } from '../utils/tamilSearch';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface SongLibraryWidgetProps {
  currentLang: Language;
  songs: Song[];
}

interface PdfSongPageProps {
  song: Song;
  isPresentationMode: boolean;
}

interface SongIndexProps {
  songs: Song[];
  selectedSongId: string;
  searchQuery: string;
  onSelectSong: (song: Song) => void;
}

const getSongSearchText = (song: Song) => buildTamilSearchText([
  song.id,
  song.title,
  song.displayTitle,
  song.lyricsTitle,
  song.category,
  song.album,
  song.composer,
  song.singer,
  song.lyrics,
  song.lyricsEnglishPattern,
  song.sourceSearchText,
].filter(Boolean).join('\n'));

const songMatchesQuery = (song: Song, query: string) => {
  const terms = expandSearchQuery(query);
  if (terms.length === 0) return true;
  const haystack = getSongSearchText(song);
  return terms.some((term) => haystack.includes(term));
};

const getDisplayTitle = (song: Song) =>
  song.displayTitle || song.title || `Untitled Song - Page ${song.sourcePageNumber ?? song.pageNumber ?? '-'}`;

const PdfSongPage: React.FC<PdfSongPageProps> = ({ song, isPresentationMode }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!song.sourcePdfUrl || !song.sourcePageNumber || !canvasRef.current) return;

    let isMounted = true;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    const render = async () => {
      setStatus('loading');
      setError('');

      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }

      try {
        const loadingTask = pdfjsLib.getDocument({ url: song.sourcePdfUrl });
        const document = await loadingTask.promise;
        const page = await document.getPage(song.sourcePageNumber);
        if (!isMounted) return;

        const baseViewport = page.getViewport({ scale: 1 });
        const fitWidth = Math.max((wrapperRef.current?.clientWidth ?? 760) - 24, 280);
        const viewport = page.getViewport({ scale: fitWidth / baseViewport.width });
        const ratio = window.devicePixelRatio || 1;

        canvas.width = Math.floor(viewport.width * ratio);
        canvas.height = Math.floor(viewport.height * ratio);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        context.clearRect(0, 0, viewport.width, viewport.height);

        const task = page.render({ canvas, canvasContext: context, viewport });
        renderTaskRef.current = task;
        await task.promise;

        if (isMounted) setStatus('ready');
      } catch (renderError) {
        if (
          renderError
          && typeof renderError === 'object'
          && 'name' in renderError
          && renderError.name === 'RenderingCancelledException'
        ) {
          return;
        }
        if (!isMounted) return;
        setError(renderError instanceof Error ? renderError.message : 'Song PDF page could not be rendered.');
        setStatus('error');
      }
    };

    void render();

    return () => {
      isMounted = false;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
    };
  }, [song.sourcePdfUrl, song.sourcePageNumber]);

  return (
    <div ref={wrapperRef} className="mx-auto flex w-full max-w-4xl flex-col items-center gap-4">
      {!isPresentationMode && (
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
          {song.sourcePdfUrl && (
            <>
              <a
                href={`${song.sourcePdfUrl}#page=${song.sourcePageNumber}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-700/30 px-3 py-2 font-bold hover:text-emerald-400"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open source page
              </a>
              <a
                href={song.sourcePdfUrl}
                download
                className="inline-flex items-center gap-2 rounded-lg border border-slate-700/30 px-3 py-2 font-bold hover:text-emerald-400"
              >
                <Download className="h-3.5 w-3.5" />
                Download songbook
              </a>
            </>
          )}
        </div>
      )}

      {status === 'loading' && (
        <div className="flex min-h-[360px] items-center justify-center">
          <div className="inline-flex items-center gap-2 rounded-xl border border-slate-700/30 px-4 py-3 text-sm font-bold">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
            Rendering original PDF page...
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="rounded-xl border border-rose-400/40 p-6 text-center">
          <BookOpen className="mx-auto h-8 w-8 text-rose-500" />
          <p className="mt-3 text-sm font-bold">This song page is unavailable.</p>
          <p className="mt-1 text-xs opacity-70">{error}</p>
        </div>
      )}

      <canvas
        ref={canvasRef}
        className={`max-w-full bg-white shadow-xl ${status !== 'ready' ? 'hidden' : ''}`}
        aria-label={`${song.title} original PDF page`}
      />
    </div>
  );
};

const SongIndex: React.FC<SongIndexProps> = ({ songs, selectedSongId, searchQuery, onSelectSong }) => {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  if (songs.length === 0) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-xl border border-slate-800/60 p-8 text-center">
        <div>
          <BookOpen className="mx-auto h-10 w-10 text-slate-500" />
          <h4 className="mt-4 text-sm font-black">No songs found</h4>
          <p className="mt-1 text-xs text-slate-400">Adjust search or filters to show imported song index entries.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl text-left">
      <div className="mb-6 border-b border-slate-800/60 pb-4 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-500">Song Index</p>
        <h3 className="mt-2 text-xl font-black text-white">Jebathotta Jeyageethangal - Song Index</h3>
        <p className="mt-1 text-xs text-slate-400">{songs.length} imported PDF song page{songs.length === 1 ? '' : 's'}</p>
      </div>

      <ol className="columns-1 gap-10 space-y-2 sm:columns-2 xl:columns-3">
        {songs.map((song) => {
          const title = getDisplayTitle(song);
          const isSelected = song.id === selectedSongId;
          const isMatch = normalizedQuery.length > 0 && getSongSearchText(song).includes(normalizedQuery);

          return (
            <li key={song.id} className="break-inside-avoid pb-2">
              <button
                type="button"
                onClick={() => onSelectSong(song)}
                className={`group w-full rounded-lg px-2 py-1.5 text-left transition focus:outline-none focus:ring-2 focus:ring-amber-400/80 ${
                  isSelected
                    ? 'bg-emerald-500/10 text-emerald-300'
                    : isMatch
                      ? 'bg-amber-400/10 text-sky-300'
                      : 'text-sky-300 hover:bg-slate-900 hover:text-sky-200'
                }`}
              >
                <span className="mr-2 font-mono text-xs font-black text-amber-300">
                  {String(song.sourcePageNumber ?? song.pageNumber ?? 0).padStart(3, '0')}.
                </span>
                <span className="align-middle text-sm font-bold underline decoration-sky-400/80 underline-offset-4">
                  {title}
                </span>
                <span className="ml-2 align-middle text-[10px] font-semibold text-slate-500 group-hover:text-slate-400">
                  Page {song.sourcePageNumber ?? song.pageNumber ?? '-'}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export const SongLibraryWidget: React.FC<SongLibraryWidgetProps> = ({
  currentLang,
  songs
}) => {
  const dict = MULTILINGUAL_DICTIONARY[currentLang] || MULTILINGUAL_DICTIONARY.en;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<'All' | 'Tamil' | 'English'>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [aiExplainText, setAiExplainText] = useState<string | null>(null);
  const [filteredSongIds, setFilteredSongIds] = useState<string[] | null>(null);
  const [selectedSongId, setSelectedSongId] = useState(songs[0]?.id ?? '');
  const [viewerDarkMode, setViewerDarkMode] = useState(true);
  const [viewerFontSize, setViewerFontSize] = useState<number>(14);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [isDualLanguage, setIsDualLanguage] = useState(true);
  const [viewerMode, setViewerMode] = useState<'index' | 'detail'>('index');
  const [offlineSaved, setOfflineSaved] = useState<Record<string, boolean>>({});
  const [isPlayingScroll, setIsPlayingScroll] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState<number>(20);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);

  const categoriesList = useMemo(() => {
    const categories = Array.from(new Set(songs.map((song) => song.category).filter(Boolean))).sort();
    return ['All', ...categories];
  }, [songs]);

  const selectedSong = songs.find((song) => song.id === selectedSongId) ?? songs[0] ?? null;

  useEffect(() => {
    if (!selectedSongId && songs[0]) {
      setSelectedSongId(songs[0].id);
      return;
    }
    if (selectedSongId && !songs.some((song) => song.id === selectedSongId)) {
      setSelectedSongId(songs[0]?.id ?? '');
    }
  }, [selectedSongId, songs]);

  useEffect(() => {
    let scrollInterval: NodeJS.Timeout | null = null;

    if (isPlayingScroll && lyricsContainerRef.current) {
      scrollInterval = setInterval(() => {
        const container = lyricsContainerRef.current;
        if (!container) return;
        container.scrollTop += 1;
        if (container.scrollTop + container.clientHeight >= container.scrollHeight - 5) {
          setIsPlayingScroll(false);
        }
      }, Math.max(10, 100 - scrollSpeed));
    }

    return () => {
      if (scrollInterval) clearInterval(scrollInterval);
    };
  }, [isPlayingScroll, scrollSpeed]);

  useEffect(() => {
    setIsPlayingScroll(false);
    if (lyricsContainerRef.current) {
      lyricsContainerRef.current.scrollTop = 0;
    }
  }, [selectedSongId]);

  const triggerAiSmartSearch = async () => {
    if (!searchQuery.trim()) {
      setFilteredSongIds(null);
      setAiExplainText(null);
      return;
    }

    setIsAiSearching(true);
    setAiExplainText('Searching the imported PDF songbook...');

    try {
      const response = await apiFetch('/api/gemini/smart-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery, songsList: songs })
      });

      if (!response.ok) throw new Error('API call failed');

      const data = await response.json();
      if (data.matchedSongIds && data.matchedSongIds.length > 0) {
        setFilteredSongIds(data.matchedSongIds);
        setAiExplainText(`Smart search: ${data.explanation} (${data.searchMethod})`);
      } else {
        setFilteredSongIds([]);
        setAiExplainText('No PDF songbook match found.');
      }
    } catch {
      const q = searchQuery.toLowerCase().trim();
      const matchedIds = songs
        .filter((song) => getSongSearchText(song).includes(q))
        .map((song) => song.id);
      setFilteredSongIds(matchedIds);
      setAiExplainText(`Local PDF search found ${matchedIds.length} song page(s).`);
    } finally {
      setIsAiSearching(false);
    }
  };

  const displaySongs = songs.filter((song) => {
    if (selectedCategory !== 'All' && song.category !== selectedCategory) return false;
    if (selectedLanguage !== 'All' && song.language !== selectedLanguage) return false;
    if (filteredSongIds !== null) return filteredSongIds.includes(song.id);
    if (searchQuery.trim()) return getSongSearchText(song).includes(searchQuery.toLowerCase().trim());
    return true;
  });

  const handleToggleOffline = (songId: string) => {
    setOfflineSaved((current) => ({
      ...current,
      [songId]: !current[songId]
    }));
  };

  const handleSelectSong = (song: Song) => {
    setSelectedSongId(song.id);
    setViewerMode('detail');
  };

  if (!selectedSong) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center text-slate-500">
        <BookOpen className="mx-auto mb-3 h-10 w-10 text-slate-300" />
        <h3 className="text-base font-black text-slate-900">No songs imported</h3>
        <p className="mt-1 text-sm">Import the song PDF to populate the Music Library.</p>
      </div>
    );
  }

  const isPdfSong = Boolean(selectedSong.sourcePdfUrl && selectedSong.sourcePageNumber);

  return (
    <div className="space-y-8 animate-fade-in text-slate-800" id="songs-library-container">
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm" id="search-controls-card">
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Music className="h-5 w-5 text-emerald-600" />
            <div>
              <h3 className="font-sans text-md font-bold text-slate-850">Imported PDF Song Library</h3>
              <p className="text-[11px] text-slate-500">Only the provided Jebathotta Jeyageethangal PDF is loaded.</p>
            </div>
          </div>
          <div className="flex items-center gap-1 rounded bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-800 ring-1 ring-emerald-100">
            <Check className="h-3.5 w-3.5" />
            {songs.length} PDF pages
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="relative flex items-center gap-2 md:col-span-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onKeyDown={(event) => { if (event.key === 'Enter') triggerAiSmartSearch(); }}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  if (!event.target.value) {
                    setFilteredSongIds(null);
                    setAiExplainText(null);
                  }
                }}
                placeholder={dict.songSearchPlaceholder || 'Search imported songbook'}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-4 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                id="song-search-box"
              />
            </div>
            <button
              type="button"
              onClick={triggerAiSmartSearch}
              disabled={isAiSearching}
              className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-bold text-white shadow transition hover:bg-emerald-500 disabled:opacity-60"
              id="ai-translit-search-btn"
            >
              {isAiSearching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Search
            </button>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-slate-400">Language</label>
            <select
              value={selectedLanguage}
              onChange={(event) => setSelectedLanguage(event.target.value as 'All' | 'Tamil' | 'English')}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs outline-none"
            >
              <option value="All">All Languages</option>
              <option value="Tamil">Tamil</option>
              <option value="English">English</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-slate-400">Category</label>
            <select
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs outline-none"
            >
              {categoriesList.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>

        {aiExplainText && (
          <div className="mt-4 flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[10px] font-medium text-amber-900 shadow-xs">
            <Sparkles className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{aiExplainText}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3" id="song-split-panel">
        <div className="space-y-3 overflow-y-auto pr-1 lg:h-[620px]" id="songs-sidebar-list">
          {displaySongs.length === 0 ? (
            <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center text-slate-400">
              <BookOpen className="mx-auto mb-2 h-8 w-8 opacity-55" />
              <p className="text-xs">No imported song pages match this search.</p>
            </div>
          ) : (
            displaySongs.map((song) => {
              const isSelected = selectedSong.id === song.id;
              const isSaved = !!offlineSaved[song.id];
              return (
                <div
                  key={song.id}
                  onClick={() => handleSelectSong(song)}
                  className={`flex h-32 cursor-pointer flex-col justify-between rounded-xl border p-4 transition ${
                    isSelected
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-900 shadow-xs'
                      : 'border-slate-100 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase text-slate-500">
                      {song.category}
                    </span>
                    <button
                      type="button"
                      onClick={(event) => { event.stopPropagation(); handleToggleOffline(song.id); }}
                      className="cursor-pointer text-xs text-slate-400 hover:text-emerald-700"
                      title={isSaved ? 'Saved Offline' : 'Save Offline'}
                    >
                      {isSaved ? <Wifi className="h-4 w-4 text-emerald-600" /> : <WifiOff className="h-4 w-4 text-slate-300" />}
                    </button>
                  </div>

                  <div>
                    <h4 className="line-clamp-1 text-xs font-bold">{getDisplayTitle(song)}</h4>
                    <p className="text-[10px] text-slate-400">
                      Page {song.sourcePageNumber ?? song.pageNumber ?? '-'} • {song.category}
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-1.5 font-mono text-[9px] font-medium text-slate-400">
                    <span>{song.language}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className={`flex flex-col justify-between rounded-3xl border shadow-lg transition duration-300 lg:col-span-2 ${
          viewerDarkMode
            ? 'border-slate-850 bg-slate-950 text-slate-100'
            : 'border-slate-200/80 bg-white text-slate-900'
        } ${isPresentationMode ? 'fixed inset-0 z-50 !h-screen overflow-hidden rounded-none p-6 md:p-12' : 'h-[620px]'}`} id="lyrics-viewer-panel">
          <div className={`flex items-center justify-between gap-3 border-b px-5 py-4 ${
            viewerDarkMode ? 'border-slate-850 bg-slate-900/60' : 'border-slate-100 bg-slate-50/70'
          }`} id="viewer-controls">
            <div className="flex min-w-0 items-center gap-3">
              {viewerMode === 'index' ? <ListMusic className="h-4 w-4 shrink-0 text-emerald-500" /> : <BookOpen className="h-4 w-4 shrink-0 text-emerald-500" />}
              <div className="min-w-0">
                <h3 className="truncate text-xs font-bold">
                  {viewerMode === 'index' ? 'Jebathotta Jeyageethangal - Song Index' : getDisplayTitle(selectedSong)}
                </h3>
                <p className="text-[10px] opacity-60">
                  {viewerMode === 'index'
                    ? `${displaySongs.length} songs • Click a title to open the exact PDF page`
                    : `Category: ${selectedSong.category} • ${selectedSong.language} • Page ${selectedSong.sourcePageNumber ?? selectedSong.pageNumber ?? '-'}`}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {viewerMode === 'detail' && (
                <button
                  type="button"
                  onClick={() => setViewerMode('index')}
                  className="flex cursor-pointer items-center gap-1 rounded-lg border border-slate-700/20 bg-slate-800/30 px-2.5 py-1.5 text-[10px] font-bold text-slate-300 transition hover:text-emerald-400"
                  title="Back to Song Index"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Song Index
                </button>
              )}

              {!isPdfSong && (
                <div className="flex items-center gap-1 rounded-lg border border-slate-700/20 bg-slate-800/10 px-2 py-1">
                  <button type="button" onClick={() => setViewerFontSize(Math.max(10, viewerFontSize - 1))} className="p-0.5 text-xs hover:text-emerald-500">
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="px-1 font-mono text-[10px] font-bold">{viewerFontSize}pt</span>
                  <button type="button" onClick={() => setViewerFontSize(Math.min(32, viewerFontSize + 1))} className="p-0.5 text-xs hover:text-emerald-500">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {!isPdfSong && selectedSong.language === 'Tamil' && selectedSong.lyricsEnglishPattern && (
                <button
                  type="button"
                  onClick={() => setIsDualLanguage(!isDualLanguage)}
                  className={`flex cursor-pointer items-center gap-1 rounded-lg border p-1.5 text-[10px] font-bold transition ${
                    isDualLanguage
                      ? 'border-emerald-400 bg-emerald-600 text-white'
                      : 'border-slate-700/20 bg-slate-800/30 text-slate-400'
                  }`}
                  title="Dual Tamil-English Translit"
                >
                  <Languages className="h-3.5 w-3.5" /> Translit
                </button>
              )}

              <button
                type="button"
                onClick={() => setViewerDarkMode(!viewerDarkMode)}
                className="cursor-pointer rounded-lg border border-slate-700/20 bg-slate-800/30 p-1.5 transition hover:text-emerald-500"
                title="Toggle Dark Mode"
              >
                {viewerDarkMode ? <Sun className="h-3.5 w-3.5 text-amber-400" /> : <Moon className="h-3.5 w-3.5 text-slate-600" />}
              </button>

              <button
                type="button"
                onClick={() => setIsPresentationMode(!isPresentationMode)}
                className={`cursor-pointer rounded-lg border p-1.5 transition ${
                  isPresentationMode ? 'border-rose-400 bg-rose-600 text-white' : 'border-slate-700/20 bg-slate-800/30 text-slate-400 hover:text-emerald-500'
                }`}
                title="Presentation Projection Mode"
              >
                {isPresentationMode ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          <div
            ref={lyricsContainerRef}
            className={`flex-1 overflow-y-auto px-6 py-8 text-center font-sans leading-relaxed ${
              viewerDarkMode ? 'bg-slate-950 text-slate-200' : 'bg-white text-slate-800'
            }`}
            style={{ fontSize: `${viewerFontSize}px` }}
            id="scroller-inner-panel"
          >
            {viewerMode === 'index' ? (
              <SongIndex
                songs={displaySongs}
                selectedSongId={selectedSong.id}
                searchQuery={searchQuery}
                onSelectSong={handleSelectSong}
              />
            ) : isPdfSong ? (
              <PdfSongPage song={selectedSong} isPresentationMode={isPresentationMode} />
            ) : (
              <div className="mx-auto max-w-xl space-y-6 whitespace-pre-wrap">
                {selectedSong.chordSheet && !isPresentationMode && (
                  <div className="mx-auto mb-6 max-w-lg rounded-xl border border-amber-900/30 bg-amber-50/5 p-4 text-left font-mono text-[11px] leading-normal text-amber-500">
                    <span className="mb-1 block font-sans text-[10px] font-bold uppercase tracking-wider text-amber-600">
                      Chords Keyboardist / Rhythm Sheet:
                    </span>
                    <pre className="whitespace-pre-wrap">{selectedSong.chordSheet}</pre>
                  </div>
                )}

                {isDualLanguage && selectedSong.language === 'Tamil' && selectedSong.lyricsEnglishPattern ? (
                  <div className="mx-auto grid max-w-2xl grid-cols-1 gap-8 text-left md:grid-cols-2">
                    <div className="space-y-4">
                      <h5 className="border-b border-slate-800/40 pb-1 text-center font-mono text-xs font-bold text-slate-500">TAMIL ORIGINAL</h5>
                      <pre className="whitespace-pre-wrap text-center font-sans leading-loose">{selectedSong.lyrics}</pre>
                    </div>
                    <div className="space-y-4 border-l border-slate-800/30 pl-4">
                      <h5 className="border-b border-slate-800/40 pb-1 text-center font-mono text-xs font-bold text-emerald-600">ENGLISH LITURGICAL TRANSLIT</h5>
                      <pre className="whitespace-pre-wrap text-center font-sans italic leading-loose text-emerald-500/80">
                        {selectedSong.lyricsEnglishPattern}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <pre className="font-sans leading-loose tracking-wide">{selectedSong.lyrics}</pre>
                )}
              </div>
            )}
          </div>

          <div className={`flex flex-col items-center justify-between gap-4 border-t px-5 py-4 md:flex-row ${
            viewerDarkMode ? 'border-slate-850 bg-slate-900/40' : 'border-slate-50 bg-slate-50/50'
          }`} id="lyrics-footer-bar">
            <div className="flex w-full items-center gap-3 md:w-auto">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Auto Scroll:</span>
              <button
                type="button"
                onClick={() => setIsPlayingScroll(!isPlayingScroll)}
                className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition ${
                  isPlayingScroll ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
                }`}
              >
                {isPlayingScroll ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                {isPlayingScroll ? 'Pause Scroll' : 'Start Scroll'}
              </button>

              <div className="ml-2 flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400">Speed:</span>
                <input
                  type="range"
                  min="5"
                  max="70"
                  value={scrollSpeed}
                  onChange={(event) => setScrollSpeed(Number(event.target.value))}
                  className="w-24 cursor-pointer accent-emerald-500"
                />
                <span className="font-mono text-[10px]">{scrollSpeed}Hz</span>
              </div>
            </div>

            {!isPresentationMode && (
              <div className="text-xs text-slate-400">
                Original PDF page rendering preserves Tamil exactly.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
