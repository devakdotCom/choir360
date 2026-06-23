import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { apiFetch } from '../services/apiClient';

interface StreamInfo {
  streamUrl: string | null;
  artist: string;
  title: string;
}

export const RadioPlayer: React.FC = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [streamInfo, setStreamInfo] = useState<StreamInfo | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch stream URL once on mount
  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiFetch('/api/radio/stream-url');
        const data = await res.json() as StreamInfo;
        setStreamInfo(data);
      } catch {
        setError('Could not reach radio server.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  // Refresh current track label every 30 s (without disturbing playback)
  useEffect(() => {
    const iv = setInterval(async () => {
      try {
        const res = await apiFetch('/api/radio/stream-url');
        const data = await res.json() as StreamInfo;
        setStreamInfo((prev) =>
          prev ? { ...prev, artist: data.artist, title: data.title } : data
        );
      } catch { /* silent */ }
    }, 30_000);
    return () => clearInterval(iv);
  }, []);

  // Teardown audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, []);

  const handleTogglePlay = () => {
    const url = streamInfo?.streamUrl;
    if (!url) {
      setError('Stream URL not available yet.');
      return;
    }

    // Already playing → pause
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    // Create / reuse Audio object — must happen inside user gesture handler
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = 'none';
      // Silence any errors that would bubble to the browser console as unhandled
      audio.onerror = () => {
        setIsPlaying(false);
        setError('Stream failed to load. Check your connection.');
      };
      audio.onplay  = () => setIsPlaying(true);
      audio.onpause = () => setIsPlaying(false);
      audioRef.current = audio;
    }

    // Set / refresh src and play
    const audio = audioRef.current;
    if (audio.src !== url) {
      audio.src = url;
    }
    audio.muted = isMuted;

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        setIsPlaying(false);
        setError('Playback blocked. Tap play to retry.');
      });
    }
  };

  const handleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    if (audioRef.current) audioRef.current.muted = next;
  };

  const trackLabel =
    streamInfo?.artist || streamInfo?.title
      ? [streamInfo.artist, streamInfo.title].filter(Boolean).join(' · ')
      : 'Catholic Tamil Radio';

  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-white/8 p-3">
      <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-200/70">
        Live Radio
      </p>

      <div className="flex items-center gap-3">
        {/* Play / Pause button */}
        <button
          type="button"
          onClick={handleTogglePlay}
          disabled={loading}
          aria-label={isPlaying ? 'Pause' : 'Play Catholic Tamil Radio'}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-300 text-[#18392f] shadow transition hover:bg-amber-200 disabled:opacity-50 active:scale-95"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4 translate-x-[1px]" />
          )}
        </button>

        {/* Track info */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold leading-tight text-white">
            {isPlaying ? trackLabel : 'Catholic Tamil Radio'}
          </p>
          <p className="mt-0.5 truncate text-[10px] text-emerald-100/60">
            {loading
              ? 'Connecting...'
              : isPlaying
              ? 'Now playing'
              : 'Tap to listen live'}
          </p>
        </div>

        {/* Live badge */}
        {isPlaying && (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-red-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
            Live
          </span>
        )}

        {/* Mute */}
        <button
          type="button"
          onClick={handleMute}
          aria-label={isMuted ? 'Unmute' : 'Mute'}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-emerald-200/60 transition hover:text-white"
        >
          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
      </div>

      {/* Animated equaliser bars while playing */}
      {isPlaying && (
        <div className="mt-2.5 flex h-3 items-end gap-[2px] opacity-60">
          {[3, 5, 4, 6, 3, 5, 4, 6, 3, 5, 4].map((h, i) => (
            <span
              key={i}
              className="w-[3px] rounded-full bg-amber-300"
              style={{
                height: `${h * 2}px`,
                animation: `eq-bounce ${0.5 + (i % 3) * 0.15}s ease-in-out infinite alternate`,
                animationDelay: `${i * 0.07}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Iframe fallback: shown only if backend couldn't resolve stream URL */}
      {!loading && !streamInfo?.streamUrl && (
        <div className="mt-3 overflow-hidden rounded-xl">
          <iframe
            src="https://www.radioking.com/play/catholic-tamil"
            title="Catholic Tamil Radio"
            width="100%"
            height="60"
            frameBorder="0"
            allow="autoplay"
            className="w-full"
          />
        </div>
      )}

      <style>{`
        @keyframes eq-bounce {
          from { transform: scaleY(0.4); }
          to   { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
};
