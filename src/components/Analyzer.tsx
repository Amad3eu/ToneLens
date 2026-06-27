"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  analyzeFile,
  type AnalysisResult,
} from "@/lib/audioAnalysis";
import { SHARE_URL, shareOrDownload } from "@/lib/shareImage";

type Status = "idle" | "analyzing" | "done" | "error";

const STEPS = [
  { key: "read", label: "Lendo arquivo", match: /Lendo/i },
  { key: "decode", label: "Decodificando áudio", match: /Decodificando/i },
  { key: "analyze", label: "Analisando forma de onda", match: /Analisando/i },
  { key: "transcribe", label: "Transcrevendo áudio", match: /Transcrevendo/i },
];

export default function Analyzer() {
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [protocolo] = useState(() => makeProtocolo());

  const lastUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (lastUrlRef.current) URL.revokeObjectURL(lastUrlRef.current);
    };
  }, []);

  const handleFile = useCallback(async (file: File) => {
    setError("");
    setResult(null);
    setStatus("analyzing");
    setFileName(file.name);

    if (lastUrlRef.current) URL.revokeObjectURL(lastUrlRef.current);
    const url = URL.createObjectURL(file);
    lastUrlRef.current = url;
    setAudioUrl(url);

    try {
      const r = await analyzeFile(file, setProgress);
      setResult(r);
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido.");
      setStatus("error");
    } finally {
      setProgress("");
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) void handleFile(file);
    },
    [handleFile],
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setResult(null);
    setError("");
    setFileName("");
    setAudioUrl(null);
    if (lastUrlRef.current) URL.revokeObjectURL(lastUrlRef.current);
    lastUrlRef.current = null;
  }, []);

  return (
    <div className="w-full max-w-3xl flex flex-col gap-8">
      <Hero />

      {status === "idle" && (
        <DropZone
          isDragging={isDragging}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onFile={handleFile}
        />
      )}

      {status === "analyzing" && (
        <AnalyzingPanel fileName={fileName} progress={progress} />
      )}

      {status === "error" && (
        <div className="rounded-2xl border-2 border-red-300 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 p-6">
          <p className="font-mono text-[10px] uppercase tracking-widest text-red-700/70 dark:text-red-400/70">
            Falha no laudo
          </p>
          <p className="mt-1 font-medium text-red-700 dark:text-red-300">
            Não foi possível analisar este arquivo.
          </p>
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={reset}
            className="mt-4 rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Tentar outro arquivo
          </button>
        </div>
      )}

      {status === "done" && result && (
        <Results
          result={result}
          fileName={fileName}
          audioUrl={audioUrl}
          protocolo={protocolo}
          onReset={reset}
        />
      )}

      <FooterMission />
    </div>
  );
}

function makeProtocolo() {
  const n = Math.floor(Math.random() * 9999)
    .toString()
    .padStart(4, "0");
  const yr = new Date().getFullYear();
  return `BR-${yr}/${n}`;
}

function Hero() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[rgba(255,225,222,0.88)]">
        <span className="inline-block h-px w-10 bg-[rgba(255,197,196,0.65)]" />
        <span>Hi-Fi Japonês · Visual áudio 技術 · トーン</span>
      </div>

      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-5">
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-[#f7f6f3] ring-2 ring-white/60 shadow-[0_12px_30px_rgba(0,0,0,0.12)]">
              <img
                src="/audio-editing(1).gif"
                alt="ToneLens logo"
                className="h-16 w-16 rounded-full object-cover"
              />
            </div>
          <div>
            <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight leading-none text-rose-100 drop-shadow-[0_10px_30px_rgba(0,0,0,0.35)] marshall-logo">
              ToneLens <span className="text-base font-normal tracking-[0.35em] text-[rgba(255,225,221,0.8)]">トーン</span>
            </h1>
            <p className="mt-2 max-w-2xl text-base sm:text-lg uppercase tracking-[0.28em] text-[rgba(255,225,221,0.85)]">
              Reconhece tom, transcreve e protege cada arquivo com precisão.
            </p>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[rgba(255,255,255,0.72)]">
              Modo radar de som, gráfico de frequência e laudo instantâneo para controle de voz e segurança.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-[rgba(255,182,178,0.24)] p-6 hifi-panel">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[rgba(255,225,221,0.72)]">
          ↳ Sala de controle de áudio <span className="ml-2 inline-flex items-center rounded-full bg-[rgba(255,182,178,0.16)] px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-rose-100">音声</span>
        </p>
        <p className="mt-3 text-lg font-semibold text-white">
          Analisa timbre, potência e padrão de fala com foco em clareza e risco.
        </p>
        <p className="mt-2 text-sm leading-6 text-[rgba(255,255,255,0.72)]">
          Painel técnico, score de intensidade e recomendação de reprodução para segurança auditiva.
        </p>
      </div>
    </div>
  );
}

interface DropZoneProps {
  isDragging: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onFile: (f: File) => void;
}

function DropZone({
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop,
  onFile,
}: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      className={`group relative cursor-pointer rounded-2xl border-[3px] border-dashed p-10 sm:p-14 text-center transition ${
        isDragging
          ? "border-rose-500 bg-[rgba(255,229,231,0.08)] dark:bg-rose-950/20"
          : "border-zinc-900 dark:border-zinc-100 bg-white dark:bg-zinc-950 hover:bg-[rgba(255,229,231,0.08)]/50 dark:hover:bg-rose-950/15"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="audio/*,video/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[rgba(255,225,221,0.86)]">
        Central de áudio <span className="ml-2 inline-flex items-center rounded-full bg-[rgba(255,182,178,0.16)] px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-rose-100">音</span>
      </p>
      <p className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight text-rose-100">
        Selecione o arquivo e inicie a análise
      </p>
      <p className="mt-2 max-w-xl text-sm leading-6 text-[rgba(255,255,255,0.72)]">
        Arraste ou toque para carregar. Suporta áudio e vídeo com processamento local rápido.
      </p>
      <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[rgba(255,182,178,0.4)] bg-[rgba(255,255,255,0.05)] px-4 py-2 text-xs font-semibold text-[rgba(255,225,221,0.9)]">
        <span className="inline-block h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
        Proteção auditiva ativa
      </div>
      <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-[rgba(255,182,178,0.4)] bg-[rgba(255,255,255,0.04)] px-4 py-1.5 text-xs font-semibold text-[rgba(255,225,221,0.9)]">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
        Análise 100% local — nada sai do seu aparelho
      </div>
    </div>
  );
}

function AnalyzingPanel({
  fileName,
  progress,
}: {
  fileName: string;
  progress: string;
}) {
  const currentIdx = useMemo(() => {
    const idx = STEPS.findIndex((s) => s.match.test(progress));
    return idx === -1 ? 0 : idx;
  }, [progress]);

  return (
    <div className="rounded-3xl border border-[rgba(255,182,178,0.25)] bg-[rgba(255,255,255,0.04)] p-6 hifi-panel">
      <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-[rgba(255,225,221,0.72)]">
        Analisando tom, espectro e pulso
      </p>
      <p className="mt-1 text-xl font-bold text-[rgba(255,255,255,0.95)]">
        Aguarde, o laudo técnico está sendo montado…
      </p>

      <ul className="mt-5 space-y-2 font-mono text-sm">
        {STEPS.map((step, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx;
          return (
            <li
              key={step.key}
              className={`flex items-center gap-3 ${
                done
                  ? "text-rose-700 dark:text-rose-400"
                  : active
                    ? "text-zinc-900 dark:text-zinc-100"
                    : "text-zinc-400 dark:text-zinc-600"
              }`}
            >
              <span className="inline-flex h-5 w-7 items-center justify-center rounded border border-current text-[10px] font-bold">
                {done ? "OK" : active ? "···" : ""}
              </span>
              <span className="uppercase tracking-wider text-xs">
                {step.label}
              </span>
              {active && (
                <span className="ml-auto inline-block h-2 w-2 animate-pulse rounded-full bg-current" />
              )}
            </li>
          );
        })}
      </ul>

      <p className="mt-5 truncate font-mono text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-500">
        Arquivo: {fileName}
      </p>
    </div>
  );
}

interface ResultsProps {
  result: AnalysisResult;
  fileName: string;
  audioUrl: string | null;
  protocolo: string;
  onReset: () => void;
}

function Results({
  result,
  fileName,
  audioUrl,
  protocolo,
  onReset,
}: ResultsProps) {
  return (
    <div className="flex flex-col gap-6">
      <LaudoPanel result={result} fileName={fileName} protocolo={protocolo} />
      <ShareButton result={result} fileName={fileName} protocolo={protocolo} />
      <TranscriptPanel transcript={result.transcript} tone={result.tone} />
      <WaveformPanel result={result} />
      <EvidencePanel result={result} />
      {audioUrl && <ListenPanel result={result} audioUrl={audioUrl} />}

      <button
        onClick={onReset}
        className="self-start rounded-full border border-[rgba(255,182,178,0.4)] bg-[rgba(255,255,255,0.05)] px-5 py-2.5 text-sm font-semibold uppercase tracking-wider text-rose-100 hover:bg-[rgba(255,182,178,0.14)] transition"
      >
        Examinar outro áudio
      </button>
    </div>
  );
}

function ShareButton({
  result,
  fileName,
  protocolo,
}: {
  result: AnalysisResult;
  fileName: string;
  protocolo: string;
}) {
  const [state, setState] = useState<
    "idle" | "generating" | "shared" | "downloaded" | "error"
  >("idle");
  const [errMsg, setErrMsg] = useState("");

  const onClick = useCallback(async () => {
    if (state === "generating") return;
    setState("generating");
    setErrMsg("");
    try {
      const outcome = await shareOrDownload({ result, fileName, protocolo });
      setState(outcome);
      setTimeout(() => setState("idle"), 3500);
    } catch (e) {
      if ((e as DOMException)?.name === "AbortError") {
        setState("idle");
        return;
      }
      setErrMsg(e instanceof Error ? e.message : "Falha ao compartilhar.");
      setState("error");
    }
  }, [state, result, fileName, protocolo]);

  const label = {
    idle: "Compartilhar relatório",
    generating: "Gerando PDF…",
    shared: "Compartilhado!",
    downloaded: "PDF baixado — pronto pra mandar",
    error: "Erro — tentar de novo",
  }[state];

  const sub = {
    idle: "WhatsApp · Instagram · download em PDF",
    generating: "Aguarde, montando relatório de tom…",
    shared: "Relatório pronto para compartilhar.",
    downloaded: "PDF salvo no seu aparelho.",
    error: errMsg || "Tente novamente.",
  }[state];

  const disabled = state === "generating";

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={onClick}
        disabled={disabled}
        className="group relative w-full overflow-hidden rounded-3xl border border-[rgba(255,182,178,0.35)] bg-[rgba(255,182,178,0.18)] px-6 py-5 text-rose-100 shadow-[0_24px_40px_rgba(0,0,0,0.25)] hover:bg-[rgba(255,182,178,0.22)] active:translate-y-0.5 active:shadow-[0_12px_20px_rgba(0,0,0,0.25)] transition disabled:opacity-70 disabled:cursor-wait"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-left">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-rose-400">
              {state === "generating" ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-rose-400/30 border-t-rose-400" />
              ) : (
                <ShareIcon />
              )}
            </span>
            <div>
              <p className="text-lg sm:text-xl font-semibold tracking-tight text-white">
                {label}
              </p>
              <p className="font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.28em] opacity-80">
                {sub}
              </p>
            </div>
          </div>
          <span className="hidden sm:block font-mono text-[10px] uppercase tracking-widest opacity-70">
            PDF · documento oficial
          </span>
        </div>
        <span className="hazard-stripes absolute inset-x-0 bottom-0 h-1.5" />
      </button>
      <p className="text-[11px] text-zinc-500 dark:text-zinc-500 text-center">
        O laudo gerado leva sua marca de prevenção em{" "}
        <a
          href={SHARE_URL}
          target="_blank"
          rel="noreferrer"
          className="underline decoration-rose-400 underline-offset-2"
        >
          amad3eu.deno.dev
        </a>
        .
      </p>
    </div>
  );
}

function TranscriptPanel({
  transcript,
  tone,
}: {
  transcript: string;
  tone: AnalysisResult["tone"];
}) {
  return (
    <div className="rounded-3xl border border-[rgba(255,182,178,0.25)] bg-[rgba(255,255,255,0.04)] overflow-hidden hifi-panel-strong">
      <div className="border-b border-[rgba(255,182,178,0.18)] px-5 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[rgba(255,225,221,0.72)]">
        Transcrição 自動 <span className="ml-2 inline-flex items-center rounded-full bg-[rgba(255,182,178,0.16)] px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-rose-100">テキスト</span>
      </div>
      <div className="p-5 space-y-4">
          <div className="rounded-3xl border border-[rgba(255,182,178,0.3)] bg-[rgba(255,255,255,0.06)] p-4">
          <p className="text-base font-semibold text-rose-100">
            Tom detectado: <span className="font-bold text-white">{tone.label}</span>
          </p>
          <p className="mt-2 text-xs text-[rgba(255,225,221,0.72)]">
            {tone.description}
          </p>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[rgba(255,225,221,0.72)]">
            Texto estimado
          </p>
          <p className="mt-3 rounded-3xl border border-[rgba(255,182,178,0.25)] bg-[rgba(255,255,255,0.05)] p-4 text-sm leading-6 text-[rgba(255,255,255,0.85)]">
            {transcript}
          </p>
        </div>
      </div>
    </div>
  );
}

function ShareIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
      <path d="M16 6l-4-4-4 4" />
      <path d="M12 2v14" />
    </svg>
  );
}

const VERDICT_COPY = {
  safe: {
    stamp: "APROVADO",
    sub: "Tom calmo",
    title: "Áudio liberado para reprodução",
    body:
      "Não foram identificados sinais de tom agressivo ou urgente. Você pode ouvir com tranquilidade, mas mantenha o bom senso.",
    color: "rose",
  },
  suspect: {
    stamp: "SUSPEITO",
    sub: "Tom moderado",
    title: "Atenção: reproduza com cuidado",
    body:
      "Detectamos um tom mais carregado do que o habitual. Recomendamos fone de ouvido e volume baixo.",
    color: "rose",
  },
  danger: {
    stamp: "REPROVADO",
    sub: "Tom agressivo",
    title: "Alerta máximo — voz intensa detectada",
    body:
      "O áudio apresenta sinais de tom muito forte ou urgente. Reduza o volume antes de tocar e prefira ouvir com atenção.",
    color: "red",
  },
} as const;

function LaudoPanel({
  result,
  fileName,
  protocolo,
}: {
  result: AnalysisResult;
  fileName: string;
  protocolo: string;
}) {
  const v = VERDICT_COPY[result.verdict];
  const colorMap = {
    rose: {
      stamp: "text-rose-700 border-rose-700",
      title: "text-rose-800 dark:text-rose-300",
      ring: "ring-rose-300/60 dark:ring-rose-700/40",
    },
    red: {
      stamp: "text-red-700 border-red-700",
      title: "text-red-800 dark:text-red-300",
      ring: "ring-red-300/60 dark:ring-red-700/40",
    },
  }[v.color];

  const dateStr = useMemo(() => {
    return new Date().toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  return (
    <div className="rounded-3xl border border-[rgba(255,182,178,0.25)] paper-bg overflow-hidden hifi-panel">
      <div className="flex items-center justify-between border-b border-[rgba(255,182,178,0.18)] px-5 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[rgba(255,225,221,0.72)]">
        <span>Laudo Técnico nº {protocolo}</span>
        <span className="text-[rgba(255,255,255,0.75)]">{dateStr}</span>
      </div>

      <div className="grid sm:grid-cols-[1fr_auto] gap-6 p-6 sm:p-8 items-center">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[rgba(255,225,221,0.72)]">
            Veredito
          </p>
          <h2 className={`mt-1 text-2xl sm:text-3xl font-bold leading-tight ${colorMap.title}`}>
            {v.title}
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[rgba(255,255,255,0.8)] leading-relaxed">
            {v.body}
          </p>

          <div className="mt-5">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[rgba(255,225,221,0.72)]">
                Índice de intensidade vocal
              </span>
              <span className={`text-2xl font-bold tabular-nums ${colorMap.title}`}>
                {result.dangerScore}
                <span className="text-sm font-medium text-[rgba(255,225,221,0.86)]">/100</span>
              </span>
            </div>
            <div className="mt-2 h-3 w-full overflow-hidden rounded-full border border-[rgba(255,182,178,0.18)] bg-[rgba(255,255,255,0.08)]">
              <div
                className="h-full rounded-full bg-linear-to-r from-rose-300 via-rose-500 to-red-500 transition-[width] duration-700"
                style={{ width: `${result.dangerScore}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between font-mono text-[9px] uppercase tracking-widest text-[rgba(255,225,221,0.72)]">
              <span>seguro</span>
              <span>suspeito</span>
              <span>perigo</span>
            </div>
          </div>
        </div>

        <div className="flex justify-center sm:justify-end">
          <Stamp text={v.stamp} sub={v.sub} className={colorMap.stamp} />
        </div>
      </div>

      <div
        className={`border-t border-dashed border-[rgba(255,182,178,0.18)] px-5 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[rgba(255,225,221,0.72)] truncate ring-inset ${colorMap.ring}`}
      >
        Arquivo periciado: {fileName}
      </div>
    </div>
  );
}

function Stamp({
  text,
  sub,
  className,
}: {
  text: string;
  sub: string;
  className: string;
}) {
  return (
    <div className="relative">
      <div
        className={`stamp-anim inline-flex flex-col items-center justify-center rounded-md border-[3px] px-6 py-3 font-bold uppercase tracking-[0.18em] shadow-[inset_0_0_0_2px_currentColor] ${className}`}
        style={{ transform: "rotate(-6deg)" }}
      >
        <span className="text-2xl sm:text-3xl leading-none">{text}</span>
        <span className="mt-1.5 text-[9px] tracking-[0.3em] opacity-80">
          {sub}
        </span>
      </div>
    </div>
  );
}

function WaveformPanel({ result }: { result: AnalysisResult }) {
  return (
    <div className="rounded-3xl border border-[rgba(255,182,178,0.25)] bg-[rgba(255,255,255,0.05)] overflow-hidden hifi-panel-strong">
      <div className="flex items-center justify-between border-b border-[rgba(255,182,178,0.18)] px-5 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[rgba(255,225,221,0.72)]">
          Análise da forma de onda
        </p>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[rgba(255,225,221,0.72)]">
          {result.durationSec.toFixed(1)}s · {result.sampleRate} Hz ·{" "}
          {result.numChannels === 1 ? "mono" : "estéreo"}
        </p>
      </div>
      <div className="p-5">
        <Waveform result={result} />
      </div>
    </div>
  );
}

function Waveform({ result }: { result: AnalysisResult }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [wrapWidth, setWrapWidth] = useState(0);

  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      setWrapWidth(w);
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || wrapWidth === 0) return;
    const dpr = window.devicePixelRatio || 1;
    const cssW = wrapWidth;
    const cssH = 180;
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    canvas.style.height = `${cssH}px`;
    canvas.style.width = `${cssW}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const isDark =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;

    ctx.clearRect(0, 0, cssW, cssH);

    for (let y = 0; y < cssH; y += 24) {
      ctx.fillStyle = isDark ? "#18181b" : "#fafafa";
      if ((y / 24) % 2 === 0) ctx.fillRect(0, y, cssW, 24);
    }
    ctx.strokeStyle = isDark ? "#27272a" : "#e4e4e7";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, cssH / 2);
    ctx.lineTo(cssW, cssH / 2);
    ctx.stroke();

    const rms = result.rms;
    const n = rms.length;
    if (n === 0) return;
    const max = Math.max(result.maxRms, 0.001);

    const buckets = Math.max(40, Math.floor(cssW / 2));
    const perBucket = Math.max(1, Math.floor(n / buckets));
    const barWidth = cssW / buckets;

    for (let b = 0; b < buckets; b++) {
      let bMax = 0;
      const start = b * perBucket;
      const end = Math.min(n, start + perBucket);
      for (let i = start; i < end; i++) {
        if (rms[i] > bMax) bMax = rms[i];
      }
      const ratio = bMax / max;
      const h = ratio * (cssH - 24);
      const x = b * barWidth;

      const hue = 130 - ratio * 130;
      const sat = 60 + ratio * 20;
      const lit = isDark ? 50 + ratio * 5 : 45 - ratio * 5;
      ctx.fillStyle = `hsl(${hue}, ${sat}%, ${lit}%)`;
      ctx.fillRect(
        x,
        (cssH - h) / 2,
        Math.max(1, barWidth - 0.5),
        h,
      );
    }

    if (result.jump) {
      const xJump = (result.jump.endSec / result.durationSec) * cssW;
      const xStart =
        (result.jump.startSec / result.durationSec) * cssW;
      ctx.fillStyle = isDark
        ? "rgba(239,68,68,0.10)"
        : "rgba(239,68,68,0.10)";
      ctx.fillRect(xStart, 0, Math.max(2, xJump - xStart), cssH);

      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(xJump, 0);
      ctx.lineTo(xJump, cssH);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [result, wrapWidth]);

  const calloutLeftPct = useMemo(() => {
    if (!result.jump || result.durationSec === 0) return null;
    return (result.jump.endSec / result.durationSec) * 100;
  }, [result]);

  const calloutText = useMemo(() => {
    if (!result.jump) return null;
    if (result.verdict === "danger") return "Momento do ataque";
    if (result.verdict === "suspect") return "Padrão suspeito";
    return "Pico detectado";
  }, [result]);

  return (
    <div>
      <div ref={wrapRef} className="relative">
        <canvas ref={canvasRef} className="block w-full" />
        {calloutLeftPct !== null && calloutText && (
          <Callout leftPct={calloutLeftPct} label={calloutText} />
        )}
        {!result.jump && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="rounded-2xl border border-dashed border-rose-200/80 bg-[rgba(15,23,42,0.88)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-100 shadow-[0_0_0_12px_rgba(255,182,178,0.05)]">
              Sem salto de volume suspeito
            </span>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-[rgba(255,225,221,0.72)]">
        <span>00:00</span>
        <span>
          {result.jump
            ? `Salto em ${result.jump.endSec.toFixed(1)}s — ${result.jump.ratio.toFixed(1)}× mais alto`
            : `Pico em ${result.maxRmsAtSec.toFixed(1)}s`}
        </span>
        <span>{formatTime(result.durationSec)}</span>
      </div>
    </div>
  );
}

function Callout({ leftPct, label }: { leftPct: number; label: string }) {
  const clamped = Math.max(6, Math.min(94, leftPct));
  const flipLeft = clamped > 70;
  return (
    <div
      className="callout-anim absolute top-2 -translate-x-1/2 pointer-events-none"
      style={{ left: `${clamped}%` }}
    >
      <div
        className={`relative rounded-md border-2 border-[rgba(239,68,68,0.9)] bg-[rgba(255,255,255,0.08)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[rgba(239,68,68,0.95)] whitespace-nowrap ${flipLeft ? "-translate-x-[calc(100%-40px)]" : "translate-x-0"}`}
      >
        ↓ {label}
      </div>
    </div>
  );
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

function EvidencePanel({ result }: { result: AnalysisResult }) {
  const items: Array<{ label: string; value: string; hint: string }> = [
    {
      label: "Razão pico/fundo",
      value: `${result.spikeRatio.toFixed(1)}×`,
      hint: "trecho mais alto vs. silêncio",
    },
    {
      label: "Pico de amplitude",
      value: result.peakAmplitude.toFixed(2),
      hint: "1.00 = saturado",
    },
    {
      label: "Taxa de cruzamentos zero",
      value: `${result.zeroCrossingRate.toFixed(0)} /s`,
      hint: "indica ruído e agressividade",
    },
    {
      label: "Centroide espectral",
      value: `${Math.round(result.spectralCentroid)} Hz`,
      hint: "tonalidade grave vs. aguda",
    },
    {
      label: "Energia alta frequência",
      value: `${(result.highFreqEnergyRatio * 100).toFixed(1)}%`,
      hint: "quanto do áudio é brilhante",
    },
    {
      label: "Saturação",
      value: `${(result.clippingRatio * 100).toFixed(2)}%`,
      hint: "amostras estouradas",
    },
    {
      label: "Trecho alto contínuo",
      value: `${result.loudSustainedSec.toFixed(1)}s`,
      hint: "duração acima de 60% do pico",
    },
  ];

  return (
    <div className="rounded-3xl border border-[rgba(255,182,178,0.25)] bg-[rgba(255,255,255,0.05)] overflow-hidden hifi-panel-strong">
      <div className="border-b border-[rgba(255,182,178,0.18)] px-5 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[rgba(255,225,221,0.72)]">
        Evidências técnicas
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-[rgba(255,182,178,0.12)]">
        {items.map((it) => (
          <div key={it.label} className="p-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-[rgba(255,225,222,0.88)]">
              {it.label}
            </p>
            <p className="mt-2 text-xl font-bold tabular-nums text-white">{it.value}</p>
            <p className="mt-1 text-[10px] leading-tight text-[rgba(255,255,255,0.65)]">
              {it.hint}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ListenPanel({
  result,
  audioUrl,
}: {
  result: AnalysisResult;
  audioUrl: string;
}) {
  const isRisky = result.verdict !== "safe";
  return (
    <div className="rounded-3xl border border-[rgba(255,182,178,0.25)] bg-[rgba(255,255,255,0.04)] overflow-hidden hifi-panel">
      {isRisky && <div className="hazard-stripes h-3" />}
      <div className="p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[rgba(255,225,221,0.72)]">
          Reprodução controlada
        </p>
        <p className="mt-1 text-sm text-[rgba(255,255,255,0.78)]">
          {result.verdict === "danger"
            ? "Por sua conta e risco. Reduza o volume antes de tocar."
            : result.verdict === "suspect"
              ? "Recomendamos fone de ouvido e volume baixo."
              : "Pode ouvir à vontade."}
        </p>
        <audio
          controls
          src={audioUrl}
          className="mt-3 w-full"
          preload="metadata"
        />
      </div>
      {isRisky && <div className="hazard-stripes h-3" />}
    </div>
  );
}

function FooterMission() {
  return (
    <div className="border-t-2 border-dashed border-zinc-900/30 dark:border-zinc-100/20 pt-5 space-y-4">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[rgba(255,225,221,0.72)]">
          Sobre esta versão
        </p>
        <p className="mt-2 text-xs leading-relaxed text-[rgba(255,255,255,0.7)]">
            <strong>V1 — heurística de tom.</strong> Identificamos saltos
            repentinos de RMS, saturação e picos típicos de voz intensa.
            A versão V2 incluirá comparação por fingerprint contra exemplos de
            tom para melhorar a precisão investigativa.
        </p>
      </div>

      <div className="rounded-3xl border border-[rgba(255,182,178,0.2)] bg-[rgba(255,255,255,0.04)] p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[rgba(255,225,222,0.88)]">
          Aviso oficial · leia com seriedade
        </p>
        <p className="mt-2 text-xs leading-relaxed text-[rgba(255,255,255,0.72)]">
          O ToneLens é um protótipo experimental. Não há departamento, não há
          laudo oficial e não há garantia nenhuma — apenas uma análise inicial.
          O sistema pode errar em qualquer direção: detectar um tom mais forte
          ou avaliar mal uma mensagem tranquila. Use por sua conta e risco.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <p className="text-xs text-[rgba(255,255,255,0.65)]">
          Desenvolvido por{" "}
          <a
            href="https://amad3eu.deno.dev"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-rose-100 underline decoration-rose-400 decoration-2 underline-offset-2 hover:decoration-rose-300"
          >
            amad3eu
          </a>
        </p>
        <a
          href="https://github.com/amad3eu"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-[rgba(255,182,178,0.35)] bg-[rgba(255,255,255,0.05)] px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-rose-100 hover:bg-[rgba(255,182,178,0.14)] transition"
        >
          <GithubIcon />
          Projeto open source
        </a>
      </div>
    </div>
  );
}

function GithubIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2.02c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.27-1.68-1.27-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.24 3.34.95.1-.74.4-1.24.72-1.53-2.55-.29-5.23-1.27-5.23-5.66 0-1.25.45-2.27 1.18-3.07-.12-.29-.51-1.45.11-3.02 0 0 .96-.31 3.15 1.17a10.94 10.94 0 0 1 5.76 0c2.19-1.48 3.15-1.17 3.15-1.17.62 1.57.23 2.73.11 3.02.74.8 1.18 1.82 1.18 3.07 0 4.4-2.69 5.36-5.25 5.65.41.35.78 1.05.78 2.12v3.14c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" />
    </svg>
  );
}
