import React, { useEffect, useRef, useState } from 'react';
import { BookMarked, BookOpen, ChevronLeft, ChevronRight, Download, ExternalLink, History, Loader2, Menu, Search, UploadCloud, X, ZoomIn, ZoomOut } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist/types/src/display/api';
import { BibleDocument } from '../../types';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface PdfLinkOverlay {
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
  url?: string;
  dest?: unknown;
}

interface BiblePdfViewerProps {
  document: BibleDocument;
}

export const BiblePdfViewer: React.FC<BiblePdfViewerProps> = ({ document }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  // Monotonically increasing token — guards against a stale, already-superseded
  // render's async callbacks touching state or the canvas after a newer render started.
  const renderGenerationRef = useRef(0);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [zoom, setZoom] = useState(1);
  const [resizeNonce, setResizeNonce] = useState(0);
  const [linkOverlays, setLinkOverlays] = useState<PdfLinkOverlay[]>([]);
  const [isDocumentLoading, setIsDocumentLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [error, setError] = useState('');
  const [chapterSearch, setChapterSearch] = useState('');
  const [isChapterDrawerOpen, setIsChapterDrawerOpen] = useState(false);
  const [recentChapterIds, setRecentChapterIds] = useState<string[]>([]);

  const storagePrefix = `choir360:bible:${document.id}`;
  const hasChapterIndex = Boolean(document.chapterIndex?.length);

  useEffect(() => {
    // Bump the generation token immediately so any render still in flight for
    // the *previous* document (e.g. switching Tamil <-> English tabs) is
    // recognized as stale and never touches this document's canvas/state.
    renderGenerationRef.current += 1;
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
      renderTaskRef.current = null;
    }

    setPdf(null);
    setPageNumber(1);
    setPageInput('1');
    setZoom(1);
    setLinkOverlays([]);
    setError('');

    if (!document.pdfUrl || !document.isAvailable) return;

    const savedPage = Number(localStorage.getItem(`${storagePrefix}:lastPage`) || '1');
    if (Number.isFinite(savedPage) && savedPage > 1) {
      setPageNumber(savedPage);
      setPageInput(String(savedPage));
    }
    try {
      setRecentChapterIds(JSON.parse(localStorage.getItem(`${storagePrefix}:recentChapters`) || '[]'));
    } catch {
      setRecentChapterIds([]);
    }

    let isMounted = true;
    setIsDocumentLoading(true);

    const loadingTask = pdfjsLib.getDocument({
      url: document.pdfUrl,
      disableAutoFetch: false,
      disableStream: false,
    });

    loadingTask.promise
      .then((loadedDocument) => {
        if (!isMounted) return;
        setPdf(loadedDocument);
        setIsDocumentLoading(false);
      })
      .catch((loadError) => {
        if (!isMounted) return;
        setError(loadError instanceof Error ? loadError.message : 'Bible PDF could not be loaded.');
        setIsDocumentLoading(false);
      });

    return () => {
      isMounted = false;
      void loadingTask.destroy();
    };
  }, [document.id, document.pdfUrl, document.isAvailable, storagePrefix]);

  useEffect(() => {
    if (!pdf || !canvasRef.current) return;

    let isMounted = true;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    // Claim this render generation. Any in-flight async work from a previous
    // generation checks this token before touching state/canvas and bails out
    // if it's been superseded — this is what actually prevents the
    // "same canvas during multiple render operations" crash, not just cancel().
    const myGeneration = ++renderGenerationRef.current;
    const isStale = () => renderGenerationRef.current !== myGeneration || !isMounted;

    const renderPage = async () => {
      setIsPageLoading(true);
      setError('');

      if (renderTaskRef.current) {
        // cancel() only *requests* cancellation — pdf.js may still be mid-paint
        // on this canvas. Await the (rejected) promise so the canvas is fully
        // free before the next render() call claims it.
        const previousTask = renderTaskRef.current;
        renderTaskRef.current = null;
        previousTask.cancel();
        await previousTask.promise.catch(() => {});
      }

      if (isStale()) return;

      try {
        const page = await pdf.getPage(pageNumber);
        if (isStale()) return;

        const baseViewport = page.getViewport({ scale: 1 });
        const containerWidth = Math.max((viewerRef.current?.clientWidth ?? 900) - 48, 320);
        const fitScale = containerWidth / baseViewport.width;
        const viewport = page.getViewport({ scale: fitScale * zoom });
        const ratio = window.devicePixelRatio || 1;

        canvas.width = Math.floor(viewport.width * ratio);
        canvas.height = Math.floor(viewport.height * ratio);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        context.clearRect(0, 0, viewport.width, viewport.height);

        const annotations = await page.getAnnotations({ intent: 'display' });
        if (isStale()) return;

        setLinkOverlays(
          annotations
            .filter((annotation) => annotation.subtype === 'Link' && annotation.rect)
            .map((annotation, index) => {
              const rect = viewport.convertToViewportRectangle(annotation.rect);
              const left = Math.min(rect[0], rect[2]);
              const top = Math.min(rect[1], rect[3]);
              const width = Math.abs(rect[0] - rect[2]);
              const height = Math.abs(rect[1] - rect[3]);

              return {
                id: `${pageNumber}-${index}`,
                left,
                top,
                width,
                height,
                url: annotation.url || annotation.unsafeUrl,
                dest: annotation.dest,
              };
            })
            .filter((overlay) => overlay.width > 0 && overlay.height > 0)
        );

        if (isStale()) return;

        const task = page.render({ canvas, canvasContext: context, viewport });
        renderTaskRef.current = task;
        await task.promise;
      } catch (renderError) {
        if (
          renderError
          && typeof renderError === 'object'
          && 'name' in renderError
          && renderError.name === 'RenderingCancelledException'
        ) {
          return;
        }
        if (isStale()) return;
        setError(renderError instanceof Error ? renderError.message : 'Bible page could not be rendered.');
      } finally {
        if (!isStale()) setIsPageLoading(false);
      }
    };

    void renderPage();

    return () => {
      isMounted = false;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
      setLinkOverlays([]);
    };
  }, [pdf, pageNumber, zoom, resizeNonce]);

  useEffect(() => {
    if (!pdf || !viewerRef.current) return;

    let frame = 0;
    const handleResize = () => {
      // Coalesce rapid-fire resize/layout events into one re-render per frame.
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        setResizeNonce((current) => current + 1);
      });
    };

    const observer = new ResizeObserver(handleResize);
    observer.observe(viewerRef.current);
    window.addEventListener('resize', handleResize);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [pdf]);

  const goToPage = (nextPage: number) => {
    if (!pdf) return;
    const safePage = Math.min(Math.max(nextPage, 1), pdf.numPages);
    setPageNumber(safePage);
    setPageInput(String(safePage));
    localStorage.setItem(`${storagePrefix}:lastPage`, String(safePage));
    if (viewerRef.current) {
      viewerRef.current.scrollTop = 0;
    }
  };

  const goToChapter = (chapter: NonNullable<BibleDocument['chapterIndex']>[number]) => {
    goToPage(chapter.pdfPage);
    localStorage.setItem(`${storagePrefix}:lastChapter`, chapter.id);
    setRecentChapterIds((current) => {
      const next = [chapter.id, ...current.filter((id) => id !== chapter.id)].slice(0, 6);
      localStorage.setItem(`${storagePrefix}:recentChapters`, JSON.stringify(next));
      return next;
    });
    setIsChapterDrawerOpen(false);
  };

  const handlePdfLinkClick = async (overlay: PdfLinkOverlay) => {
    if (!pdf) return;

    if (overlay.url) {
      window.open(overlay.url, '_blank', 'noopener,noreferrer');
      return;
    }

    if (!overlay.dest) return;

    try {
      const destination = typeof overlay.dest === 'string'
        ? await pdf.getDestination(overlay.dest)
        : overlay.dest;

      if (!Array.isArray(destination) || !destination[0]) return;

      const pageRef = destination[0];
      const pageIndex = typeof pageRef === 'number'
        ? pageRef
        : await pdf.getPageIndex(pageRef);

      goToPage(pageIndex + 1);
    } catch (destinationError) {
      setError(destinationError instanceof Error ? destinationError.message : 'PDF link destination could not be opened.');
    }
  };

  const submitPageInput = () => {
    const requestedPage = Number(pageInput);
    if (!Number.isFinite(requestedPage)) return;
    goToPage(requestedPage);
  };

  const totalPages = pdf?.numPages ?? 0;
  const readingProgress = totalPages ? Math.round((pageNumber / totalPages) * 100) : 0;
  const filteredChapters = (document.chapterIndex || []).filter((chapter) => (
    `${chapter.book} ${chapter.testament}`.toLowerCase().includes(chapterSearch.trim().toLowerCase())
  ));
  const recentChapters = (document.chapterIndex || []).filter((chapter) => recentChapterIds.includes(chapter.id));

  const ChapterNavigation = (
    <div className="flex h-full flex-col bg-white">
      <div className="border-b border-slate-100 p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">Chapter Index</p>
            <p className="text-xs font-bold text-slate-500">Resume, search, and jump</p>
          </div>
          <button
            type="button"
            onClick={() => setIsChapterDrawerOpen(false)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
            aria-label="Close chapter navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="relative mt-3">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            value={chapterSearch}
            onChange={(event) => setChapterSearch(event.target.value)}
            placeholder="Search Genesis, John, Romans..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm font-semibold outline-none focus:border-emerald-500"
          />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              const savedPage = Number(localStorage.getItem(`${storagePrefix}:lastPage`) || pageNumber);
              if (Number.isFinite(savedPage)) goToPage(savedPage);
            }}
            className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700"
          >
            <BookMarked className="h-4 w-4 text-emerald-800" />
            Resume
          </button>
          <div className="rounded-xl bg-emerald-50 px-3 py-2 text-center text-xs font-black text-emerald-800">
            {readingProgress}% read
          </div>
        </div>
      </div>

      {recentChapters.length > 0 && (
        <div className="border-b border-slate-100 p-3">
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
            <History className="h-3.5 w-3.5" />
            Recently read
          </p>
          <div className="flex flex-wrap gap-2">
            {recentChapters.map((chapter) => (
              <button
                key={chapter.id}
                type="button"
                onClick={() => goToChapter(chapter)}
                className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-700"
              >
                {chapter.book}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {filteredChapters.map((chapter) => {
          const active = Math.abs(pageNumber - chapter.pdfPage) < 4;
          return (
            <button
              key={chapter.id}
              type="button"
              onClick={() => goToChapter(chapter)}
              className={
                'mb-1 flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition ' +
                (active ? 'bg-[#18392f] text-white' : 'text-slate-700 hover:bg-slate-50')
              }
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-black">{chapter.book}</span>
                <span className={'block text-[10px] font-bold ' + (active ? 'text-emerald-100' : 'text-slate-400')}>
                  {chapter.testament}
                </span>
              </span>
              <span className={'font-mono text-[11px] font-black ' + (active ? 'text-amber-300' : 'text-emerald-800')}>
                {chapter.pdfPage}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 bg-[#f8faf9] p-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#18392f] text-amber-300">
            <BookOpen className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">{document.label}</p>
            <h2 className="truncate text-xl font-black text-slate-950">{document.title}</h2>
            <p className="mt-1 text-xs font-medium text-slate-500">
              {totalPages ? `${totalPages.toLocaleString()} PDF pages` : document.subtitle}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {hasChapterIndex && (
            <button
              type="button"
              onClick={() => setIsChapterDrawerOpen(true)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 lg:hidden"
            >
              <Menu className="h-4 w-4" />
              Chapters
            </button>
          )}
          <a
            href={document.pdfUrl || '#'}
            target="_blank"
            rel="noreferrer"
            aria-disabled={!document.pdfUrl}
            className={
              'inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 ' +
              (!document.pdfUrl ? 'pointer-events-none opacity-40' : '')
            }
          >
            <ExternalLink className="h-4 w-4" />
            Open PDF
          </a>
          <a
            href={document.pdfUrl || '#'}
            download
            aria-disabled={!document.pdfUrl}
            className={
              'inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#18392f] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#102d26] ' +
              (!document.pdfUrl ? 'pointer-events-none opacity-40' : '')
            }
          >
            <Download className="h-4 w-4 text-amber-300" />
            Download
          </a>
        </div>
      </div>

      {!document.isAvailable || !document.pdfUrl ? (
        <div className="flex min-h-[520px] items-center justify-center bg-slate-50 p-6 text-center">
          <div className="max-w-md">
            <UploadCloud className="mx-auto h-12 w-12 text-emerald-800" />
            <h3 className="mt-4 text-lg font-black text-slate-900">English Bible PDF is ready for upload</h3>
            <p className="mt-2 text-sm font-medium text-slate-500">
              {document.unavailableMessage || 'Add a Roman Catholic English Bible PDF URL to enable the same viewer controls used by the Tamil Bible.'}
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="border-b border-slate-200 bg-white p-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => goToPage(pageNumber - 1)}
                disabled={!pdf || pageNumber === 1}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <button
                type="button"
                onClick={() => goToPage(pageNumber + 1)}
                disabled={!pdf || pageNumber >= totalPages}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#18392f] px-3 text-xs font-bold text-white disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-4 w-4 text-amber-300" />
              </button>

              <div className="flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2">
                <span className="px-1 text-[10px] font-black uppercase tracking-wider text-slate-500">Page</span>
                <input
                  type="number"
                  min={1}
                  max={totalPages || 1}
                  value={pageInput}
                  onChange={(event) => setPageInput(event.target.value)}
                  className="h-8 w-20 rounded-lg border border-slate-200 bg-white px-2 text-sm font-bold outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={submitPageInput}
                  disabled={!pdf}
                  className="h-8 rounded-lg bg-white px-3 text-xs font-bold text-slate-700 disabled:opacity-40"
                >
                  Go
                </button>
                <span className="pr-1 text-xs font-semibold text-slate-500">/ {totalPages || '...'}</span>
              </div>

              <button
                type="button"
                onClick={() => setZoom((currentZoom) => Math.max(currentZoom - 0.15, 0.7))}
                disabled={!pdf}
                className="ml-0 inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700 disabled:opacity-40 md:ml-auto"
              >
                <ZoomOut className="h-4 w-4" />
                Zoom out
              </button>
              <button
                type="button"
                onClick={() => setZoom((currentZoom) => Math.min(currentZoom + 0.15, 2))}
                disabled={!pdf}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700 disabled:opacity-40"
              >
                <ZoomIn className="h-4 w-4" />
                Zoom in
              </button>
              <button
                type="button"
                onClick={() => setZoom(1)}
                disabled={!pdf || zoom === 1}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700 disabled:opacity-40"
                title="Reset zoom to fit the available width"
              >
                Fit Width
              </button>
            </div>
          </div>

          {hasChapterIndex && isChapterDrawerOpen && (
            <div className="fixed inset-0 z-50 bg-slate-950/40 lg:hidden">
              <div className="h-full w-[86vw] max-w-sm shadow-2xl">
                {ChapterNavigation}
              </div>
            </div>
          )}

          <div className={`grid min-h-[560px] ${hasChapterIndex ? 'lg:grid-cols-[300px_minmax(0,1fr)]' : 'lg:grid-cols-1'}`}>
            {hasChapterIndex && (
              <aside className="hidden border-r border-slate-200 lg:block">
                {ChapterNavigation}
              </aside>
            )}

          <div ref={viewerRef} className="relative min-w-0 h-[100svh] max-h-[calc(100dvh-21rem)] min-h-[560px] overflow-auto bg-slate-200 p-4">
            {(isDocumentLoading || isPageLoading) && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-[1px]">
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-800" />
                  {isDocumentLoading ? 'Loading PDF...' : 'Rendering page...'}
                </div>
              </div>
            )}

            {error ? (
              <div className="flex min-h-[520px] items-center justify-center rounded-xl border border-rose-200 bg-white p-8 text-center">
                <div>
                  <BookOpen className="mx-auto h-10 w-10 text-rose-700" />
                  <h3 className="mt-4 text-lg font-bold text-slate-900">Bible page is unavailable</h3>
                  <p className="mt-1 text-sm text-slate-500">{error}</p>
                </div>
              </div>
            ) : (
              <div className="flex w-full justify-center">
                <div className="relative inline-block max-w-full">
                  <canvas ref={canvasRef} className="max-w-full bg-white shadow-xl" aria-label={`${document.label} PDF page`} />
                  {linkOverlays.map((overlay) => (
                    <button
                      key={overlay.id}
                      type="button"
                      aria-label="Open PDF link"
                      title="Open PDF link"
                      onClick={() => void handlePdfLinkClick(overlay)}
                      className="absolute rounded-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-amber-400/80"
                      style={{
                        left: `${overlay.left}px`,
                        top: `${overlay.top}px`,
                        width: `${overlay.width}px`,
                        height: `${overlay.height}px`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
          </div>
        </>
      )}
    </section>
  );
};
