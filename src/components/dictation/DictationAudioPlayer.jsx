import React, { useEffect, useRef, useState } from "react";
import { formatTime } from "../../utils/timeUtils";
import { IconClock, IconVolume } from "../icons";

function clamp(n, min, max) {
  const x = Number(n);
  if (!Number.isFinite(x)) return min;
  return Math.max(min, Math.min(max, x));
}

function formatRate(rate) {
  const n = Number(rate);
  if (!Number.isFinite(n)) return "1";
  return String(Number(n.toFixed(2)));
}

const DictationAudioPlayer = React.forwardRef(function DictationAudioPlayer({ src }, ref) {
  const audioEl = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [rate, setRate] = useState(1);
  const [volume, setVolume] = useState(1); // 0..1
  const lastNonZeroVolumeRef = useRef(1);
  const [showVolume, setShowVolume] = useState(false);

  useEffect(() => {
    const el = audioEl.current;
    if (!el) return;
    el.playbackRate = rate;
  }, [rate]);

  useEffect(() => {
    const el = audioEl.current;
    if (!el) return;
    el.volume = clamp(Number(volume) || 0, 0, 1);
  }, [volume]);

  useEffect(() => {
    const el = audioEl.current;
    if (!el) return;

    const onLoaded = () => setDuration(el.duration || 0);
    const onTime = () => setCurrentTime(el.currentTime || 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);

    el.addEventListener("loadedmetadata", onLoaded);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnded);

    return () => {
      el.removeEventListener("loadedmetadata", onLoaded);
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onEnded);
    };
  }, [src]);

  useEffect(() => {
    setIsPlaying(false);
    setDuration(0);
    setCurrentTime(0);
    const el = audioEl.current;
    if (el) {
      el.pause();
      el.currentTime = 0;
    }
  }, [src]);

  const togglePlay = () => {
    const el = audioEl.current;
    if (!el) return;
    if (el.paused) {
      const p = el.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } else {
      el.pause();
    }
  };

  const seekBy = (delta) => {
    const el = audioEl.current;
    if (!el) return;
    el.currentTime = clamp((el.currentTime || 0) + delta, 0, el.duration || 0);
  };

  const seekToRatio = (ratio) => {
    const el = audioEl.current;
    if (!el) return;
    const d = el.duration || 0;
    if (!d) return;
    el.currentTime = clamp(d * ratio, 0, d);
  };

  const setPlaybackRate = (next) => {
    setRate(next);
    const el = audioEl.current;
    if (el) el.playbackRate = next;
  };

  const setPlayerVolume = (next) => {
    const v = clamp(Number(next) || 0, 0, 1);
    setVolume(v);
    if (v > 0) lastNonZeroVolumeRef.current = v;
    const el = audioEl.current;
    if (el) el.volume = v;
  };

  const toggleMute = () => {
    if (volume > 0) setPlayerVolume(0);
    else setPlayerVolume(lastNonZeroVolumeRef.current || 1);
  };

  React.useImperativeHandle(
    ref,
    () => ({
      togglePlay,
      seekBy,
      setPlaybackRate,
      setVolume: setPlayerVolume,
      get isPlaying() {
        return isPlaying;
      },
    }),
    [isPlaying],
  );

  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm relative overflow-visible z-10">
      <div className="p-4 flex items-center gap-4">
        <button
          type="button"
          onClick={togglePlay}
          className="h-12 w-12 rounded-full border border-gray-200 bg-white shadow-sm flex items-center justify-center hover:border-gray-300"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          <span className="text-slate-900 text-xl leading-none">{isPlaying ? "❚❚" : "▶"}</span>
        </button>

        <div className="flex-1 min-w-0">
          <button
            type="button"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = clamp(e.clientX - rect.left, 0, rect.width);
              seekToRatio(rect.width ? x / rect.width : 0);
            }}
            className="w-full h-10 rounded-xl bg-gray-50 border border-gray-200 relative overflow-hidden text-left"
            title="Click để tua"
          >
            <div className="absolute left-0 top-0 bottom-0 bg-emerald-500/20" style={{ width: `${Math.round(progress * 100)}%` }} />
            <div className="absolute inset-0 flex items-center px-3">
              <div className="w-full h-5 rounded-lg bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 opacity-80" />
            </div>
          </button>
        </div>

        <div className="text-sm font-mono text-slate-700 whitespace-nowrap">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>

      <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => seekBy(-3)} className="text-sm font-semibold text-slate-600 hover:text-slate-900">
            ↺ 3s
          </button>
          <button type="button" onClick={() => seekBy(-5)} className="text-sm font-semibold text-slate-600 hover:text-slate-900">
            ↺ 5s
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowVolume((v) => !v)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 hover:text-slate-900"
              title="Âm lượng"
            >
              <IconVolume className={volume > 0 ? "text-slate-700" : "text-slate-400"} />
              {Math.round(volume * 100)}%
            </button>

            {showVolume ? (
              <div className="absolute right-0 mt-2 w-52 rounded-xl border border-gray-200 bg-white shadow-lg p-3 z-50">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="px-2 py-1 rounded-lg border border-gray-200 text-xs font-semibold text-slate-700 hover:border-gray-300"
                    title={volume > 0 ? "Tắt tiếng" : "Bật tiếng"}
                  >
                    {volume > 0 ? "Mute" : "Unmute"}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={Math.round(volume * 100)}
                    onChange={(e) => setPlayerVolume(Number(e.target.value) / 100)}
                    className="flex-1"
                  />
                </div>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => {
              const speeds = [0.5, 0.8, 1, 1.25, 1.5, 1.7];
              const idx = Math.max(0, speeds.findIndex((s) => s === rate));
              const next = speeds[(idx + 1) % speeds.length];
              setPlaybackRate(next);
            }}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 hover:text-slate-900"
            title="Tốc độ phát"
          >
            <IconClock className="text-slate-700" />
            {formatRate(rate)}x
          </button>
        </div>
      </div>

      <audio ref={audioEl} src={src} preload="metadata" />
    </div>
  );
});

export default DictationAudioPlayer;

