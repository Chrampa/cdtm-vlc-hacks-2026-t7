import { Mic, Square, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "../../api";
import { Btn, Spinner } from "./ui";

/** Browsers only give the microphone on https or localhost. */
export function canRecord() {
  return typeof window !== "undefined" && typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
}

const MAX_SECONDS = 90;
const MIME = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

/**
 * Speak the request instead of typing it. Click to record, click again to stop; the words
 * land in the text box (ElevenLabs speech-to-text, any language) so HR can check them first.
 */
export function MicButton({ onText, disabled, className = "" }: { onText: (text: string) => void; disabled?: boolean; className?: string }) {
  const [state, setState] = useState<"idle" | "recording" | "transcribing">("idle");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    return () => { cancelled.current = true; stop(); };
  }, []);

  function stop() {
    window.clearInterval(timer.current);
    if (rec.current?.state === "recording") rec.current.stop();
  }

  async function start() {
    setError(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      setError("Allow the microphone to speak your request.");
      return;
    }
    const mimeType = MIME.find((t) => MediaRecorder.isTypeSupported(t));
    const r = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks: Blob[] = [];
    r.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    r.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      rec.current = null;
      if (cancelled.current) return;
      setState("transcribing");
      try {
        const { text } = await api.transcribe(new Blob(chunks, { type: r.mimeType || mimeType || "audio/webm" }));
        if (cancelled.current) return;
        if (text.trim()) onText(text.trim());
        else setError("We didn't catch any words. Try again a bit closer to the mic.");
      } catch (e) {
        if (!cancelled.current) setError(e instanceof Error ? e.message : "Could not write that down.");
      } finally {
        if (!cancelled.current) setState("idle");
      }
    };
    rec.current = r;
    r.start(250);
    setSeconds(0);
    setState("recording");
    const t0 = Date.now();
    timer.current = window.setInterval(() => {
      const s = Math.floor((Date.now() - t0) / 1000);
      setSeconds(s);
      if (s >= MAX_SECONDS) stop();
    }, 250);
  }

  const recording = state === "recording";
  return (
    <span className={`inline-flex min-w-0 flex-wrap items-center gap-2 ${className}`}>
      <Btn
        type="button"
        disabled={disabled || state === "transcribing"}
        onClick={() => (recording ? stop() : start())}
        aria-label={recording ? "Stop recording" : "Speak your request"}
        title={recording ? "Stop and write it down" : "Speak instead of typing (any language)"}
        className={recording ? "!border-[var(--v-bad)] !text-[var(--v-bad)]" : ""}
      >
        {state === "transcribing" ? (
          <><Spinner size={14} /> Writing it down…</>
        ) : recording ? (
          <><span className="size-2 animate-pulse rounded-full" style={{ background: "var(--v-bad)" }} /> <Square size={12} fill="currentColor" /> Stop · {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</>
        ) : (
          <><Mic size={15} /> Speak</>
        )}
      </Btn>
      {error && <span role="alert" className="text-[12px] font-semibold" style={{ color: "var(--v-bad)" }}>{error}</span>}
    </span>
  );
}

const spoken = new Map<string, string>(); // text -> object URL, so a replay costs nothing

/** Reads a short briefing out loud (ElevenLabs text-to-speech). Click again to stop. */
export function ListenButton({ text, label = "Listen" }: { text: string; label?: string }) {
  const [state, setState] = useState<"idle" | "loading" | "playing">("idle");
  const [error, setError] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const abort = useRef<AbortController | null>(null);

  const stop = () => {
    abort.current?.abort();
    abort.current = null;
    audio.current?.pause();
    audio.current = null;
    setState("idle");
  };
  useEffect(() => stop, [text]);

  async function play() {
    setError(null);
    setState("loading");
    try {
      let url = spoken.get(text);
      if (!url) {
        abort.current = new AbortController();
        url = URL.createObjectURL(await api.speak(text, abort.current.signal));
        spoken.set(text, url);
      }
      const a = new Audio(url);
      audio.current = a;
      a.onended = () => { audio.current = null; setState("idle"); };
      await a.play();
      setState("playing");
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Could not read it out.");
      setState("idle");
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      {error && <span role="alert" className="text-[12px] font-semibold" style={{ color: "var(--v-bad)" }}>{error}</span>}
      <Btn small type="button" variant="ghost" onClick={() => (state === "idle" ? play() : stop())} aria-label={state === "playing" ? "Stop reading" : label} title="Read it out loud">
        {state === "loading" ? <Spinner size={13} /> : state === "playing" ? <Square size={11} fill="currentColor" /> : <Volume2 size={15} />}
        {state === "playing" ? "Stop" : label}
      </Btn>
    </span>
  );
}
