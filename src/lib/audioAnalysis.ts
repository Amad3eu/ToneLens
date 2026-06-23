export interface JumpInfo {
  startSec: number;
  endSec: number;
  beforeRms: number;
  afterRms: number;
  ratio: number;
}

export interface AnalysisResult {
  durationSec: number;
  sampleRate: number;
  numChannels: number;
  rms: Float32Array;
  hopMs: number;
  peakAmplitude: number;
  clippingRatio: number;
  backgroundRms: number;
  medianRms: number;
  maxRms: number;
  maxRmsAtSec: number;
  spikeRatio: number;
  jump: JumpInfo | null;
  loudSustainedSec: number;
  zeroCrossingRate: number;
  spectralCentroid: number;
  highFreqEnergyRatio: number;
  dangerScore: number;
  verdict: "safe" | "suspect" | "danger";
  tone: {
    label: string;
    score: number;
    description: string;
  };
  transcript: string;
  signals: {
    spike: number;
    jump: number;
    clipping: number;
    peak: number;
    sustained: number;
    roughness: number;
    brightness: number;
  };
}

const WINDOW_MS = 50;
const HOP_MS = 25;
const LOOKBACK_MS = 2000;

type ProgressFn = (msg: string) => void;

export async function analyzeFile(
  file: File,
  onProgress?: ProgressFn,
): Promise<AnalysisResult> {
  onProgress?.("Lendo arquivo…");
  const arrayBuffer = await file.arrayBuffer();

  onProgress?.("Decodificando áudio…");
  const audioBuffer = await decode(arrayBuffer);

  onProgress?.("Analisando volume…");
  const analysis = analyzeBuffer(audioBuffer);

  onProgress?.("Transcrevendo áudio…");
  analysis.transcript = await transcribeFile(file).catch(() =>
    "Transcrição local não disponível nesta versão. Integre uma API de Speech-to-Text para obter o texto real.",
  );

  return analysis;
}

async function transcribeFile(file: File): Promise<string> {
  const form = new FormData();
  form.append("audio", file);

  const response = await fetch("/api/transcribe", {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.error ?? "Falha na transcrição.");
  }

  const data = await response.json();
  return data.text ?? data.transcription ?? "";
}

async function decode(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
  const AC: typeof AudioContext =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;
  if (!AC) {
    throw new Error("Seu navegador não suporta Web Audio API.");
  }
  const ctx = new AC();
  try {
    return await ctx.decodeAudioData(arrayBuffer.slice(0));
  } catch {
    throw new Error(
      "Não foi possível decodificar o áudio. Formatos suportados normalmente: MP3, WAV, OGG, M4A, MP4, WebM.",
    );
  } finally {
    void ctx.close();
  }
}

function analyzeBuffer(audioBuffer: AudioBuffer): AnalysisResult {
  const sampleRate = audioBuffer.sampleRate;
  const numChannels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;

  const mono = new Float32Array(length);
  for (let c = 0; c < numChannels; c++) {
    const data = audioBuffer.getChannelData(c);
    for (let i = 0; i < length; i++) {
      const s = data[i];
      const clamped = s > 1 ? 1 : s < -1 ? -1 : s;
      mono[i] += clamped / numChannels;
    }
  }

  let peak = 0;
  let clippedSamples = 0;
  for (let i = 0; i < length; i++) {
    const abs = Math.abs(mono[i]);
    if (abs > peak) peak = abs;
    if (abs >= 0.95) clippedSamples++;
  }
  const clippingRatio = length > 0 ? clippedSamples / length : 0;

  const windowSize = Math.max(1, Math.floor((sampleRate * WINDOW_MS) / 1000));
  const hopSize = Math.max(1, Math.floor((sampleRate * HOP_MS) / 1000));
  const numWindows =
    length >= windowSize ? Math.floor((length - windowSize) / hopSize) + 1 : 0;
  const rms = new Float32Array(numWindows);
  let maxRms = 0;
  let maxRmsIdx = 0;
  for (let w = 0; w < numWindows; w++) {
    const start = w * hopSize;
    let sum = 0;
    for (let i = 0; i < windowSize; i++) {
      const s = mono[start + i];
      sum += s * s;
    }
    const r = Math.sqrt(sum / windowSize);
    rms[w] = r;
    if (r > maxRms) {
      maxRms = r;
      maxRmsIdx = w;
    }
  }

  const sorted = Float32Array.from(rms).sort();
  const medianRms = sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : 0;
  const q1Count = Math.max(1, Math.floor(sorted.length * 0.25));
  let bgSum = 0;
  for (let i = 0; i < q1Count; i++) bgSum += sorted[i];
  const backgroundRms = q1Count > 0 ? bgSum / q1Count : 0;

  const spikeRatio = maxRms / Math.max(backgroundRms, 1e-6);

  const lookbackWindows = Math.floor(LOOKBACK_MS / HOP_MS);
  const noiseFloor = Math.max(0.005, maxRms * 0.03);
  const loudThreshold = maxRms * 0.4;
  let jump: JumpInfo | null = null;
  let bestJumpRatio = 0;
  if (numWindows > lookbackWindows + 1) {
    for (let w = lookbackWindows; w < numWindows; w++) {
      const cur = rms[w];
      if (cur < loudThreshold) continue;
      const slice = Array.from(rms.subarray(w - lookbackWindows, w)).sort(
        (a, b) => a - b,
      );
      const prevMed = slice[Math.floor(slice.length / 2)] ?? 0;
      const ratio = cur / Math.max(prevMed, noiseFloor);
      if (ratio > bestJumpRatio) {
        bestJumpRatio = ratio;
        jump = {
          startSec: ((w - lookbackWindows) * HOP_MS) / 1000,
          endSec: (w * HOP_MS) / 1000,
          beforeRms: prevMed,
          afterRms: cur,
          ratio,
        };
      }
    }
  }
  if (bestJumpRatio < 3) {
    jump = null;
  }

  const loudThresh = maxRms * 0.6;
  let loudWindows = 0;
  for (let w = 0; w < numWindows; w++) {
    if (rms[w] >= loudThresh && rms[w] > 0.05) loudWindows++;
  }
  const loudSustainedSec = (loudWindows * HOP_MS) / 1000;

  let zeroCrossings = 0;
  for (let i = 1; i < length; i++) {
    if (mono[i - 1] >= 0 && mono[i] < 0) zeroCrossings++;
    else if (mono[i - 1] < 0 && mono[i] >= 0) zeroCrossings++;
  }
  const zeroCrossingRate = length > 1 ? (zeroCrossings * sampleRate) / length : 0;

  const peakSampleIndex = Math.min(
    length - 1,
    maxRmsIdx * hopSize + Math.floor(windowSize / 2),
  );
  const {
    spectralCentroid,
    highFreqEnergyRatio,
  } = computeSpectralFeatures(mono, sampleRate, peakSampleIndex);

  const spikePoints = clamp(
    Math.log10(Math.max(1, spikeRatio)) * 24,
    0,
    40,
  );
  const jumpPoints = jump
    ? clamp(Math.log10(Math.max(1, jump.ratio)) * 26, 0, 30)
    : 0;
  const clipPoints = clamp(clippingRatio * 4000, 0, 20);
  const peakPoints = peak > 0.98 ? 10 : peak > 0.9 ? 5 : 0;
  const sustainedPoints =
    loudSustainedSec >= 1.5 && loudSustainedSec <= 30
      ? clamp((loudSustainedSec - 1) * 2, 0, 10)
      : 0;
  const roughnessPoints = clamp(zeroCrossingRate * 0.005, 0, 18);
  const brightnessPoints = clamp((spectralCentroid - 500) / 200, 0, 12);

  let dangerScore =
    spikePoints +
    jumpPoints +
    clipPoints +
    peakPoints +
    sustainedPoints +
    roughnessPoints +
    brightnessPoints;
  if (maxRms < 0.05) {
    dangerScore = Math.min(dangerScore, 15);
  }
  dangerScore = clamp(dangerScore, 0, 100);

  let verdict: AnalysisResult["verdict"] = "safe";
  if (dangerScore >= 65) verdict = "danger";
  else if (dangerScore >= 35) verdict = "suspect";

  const toneScore = Math.round(dangerScore);
  const tone = getToneDescriptor(
    toneScore,
    spectralCentroid,
    zeroCrossingRate,
    highFreqEnergyRatio,
  );

  return {
    durationSec: audioBuffer.duration,
    sampleRate,
    numChannels,
    rms,
    hopMs: HOP_MS,
    peakAmplitude: peak,
    clippingRatio,
    backgroundRms,
    medianRms,
    maxRms,
    maxRmsAtSec: (maxRmsIdx * HOP_MS) / 1000,
    spikeRatio,
    jump,
    loudSustainedSec,
    dangerScore: toneScore,
    verdict,
    zeroCrossingRate,
    spectralCentroid,
    highFreqEnergyRatio,
    tone,
    transcript:
      "Transcrição local não disponível nesta versão. Integre uma API de Speech-to-Text para obter o texto real.",
    signals: {
      spike: Math.round(spikePoints),
      jump: Math.round(jumpPoints),
      clipping: Math.round(clipPoints),
      peak: peakPoints,
      sustained: Math.round(sustainedPoints),
      roughness: Math.round(roughnessPoints),
      brightness: Math.round(brightnessPoints),
    },
  };
}

function computeSpectralFeatures(
  mono: Float32Array,
  sampleRate: number,
  centerSample: number,
) {
  const N = 1024;
  const half = N / 2;
  const start = Math.max(0, Math.min(mono.length - N, centerSample - N / 2));
  const windowSamples = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    windowSamples[i] = mono[start + i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1)));
  }

  let totalEnergy = 0;
  const magnitudes = new Float32Array(half);
  const twoPiN = (Math.PI * 2) / N;
  for (let k = 0; k < half; k++) {
    let re = 0;
    let im = 0;
    for (let n = 0; n < N; n++) {
      const angle = k * n * twoPiN;
      const s = windowSamples[n];
      re += s * Math.cos(angle);
      im -= s * Math.sin(angle);
    }
    const mag = Math.sqrt(re * re + im * im);
    magnitudes[k] = mag;
    totalEnergy += mag;
  }

  if (totalEnergy === 0) {
    return {
      spectralCentroid: 0,
      highFreqEnergyRatio: 0,
    };
  }

  let centroidSum = 0;
  let highEnergy = 0;
  for (let k = 0; k < half; k++) {
    const freq = (k * sampleRate) / N;
    const mag = magnitudes[k];
    centroidSum += freq * mag;
    if (freq >= 2000) highEnergy += mag;
  }

  return {
    spectralCentroid: centroidSum / totalEnergy,
    highFreqEnergyRatio: highEnergy / totalEnergy,
  };
}

function getToneDescriptor(
  score: number,
  spectralCentroid: number,
  zeroCrossingRate: number,
  highFreqEnergyRatio: number,
) {
  if (score >= 65) {
    if (spectralCentroid < 600) {
      return {
        label: "Voz muito grossa / grave",
        score,
        description:
          "O áudio é intenso e com muitas frequências graves, sugerindo uma fala forte e carregada.",
      };
    }

    if (spectralCentroid > 2800) {
      return {
        label: "Voz muito alta / aguda",
        score,
        description:
          "O áudio exibe picos de energia e presença de altas frequências, indicando um tom alto e penetrante.",
      };
    }

    return {
      label: "Voz muito intensa",
      score,
      description:
        "O áudio apresenta muitos picos, altos níveis de energia e um tom agitado ou urgente.",
    };
  }

  if (score >= 35) {
    if (highFreqEnergyRatio > 0.25) {
      return {
        label: "Tom alto / tenso",
        score,
        description:
          "Há força e brilho no áudio, com bastante energia em frequências médias e altas.",
      };
    }

    if (spectralCentroid < 700) {
      return {
        label: "Tom grave / carregado",
        score,
        description:
          "O áudio está mais baixo e forte, com uma sensação de voz grossa ou densa.",
      };
    }

    return {
      label: "Tom carregado",
      score,
      description:
        "O áudio possui intensidade acima do normal e variações de energia que sugerem emoção ou exaltação.",
    };
  }

  if (score >= 20) {
    return {
      label: "Tom equilibrado",
      score,
      description:
        "O áudio é relativamente estável, com dinâmica natural e leve variação de tom.",
    };
  }

  return {
    label: "Tom calmo",
    score,
    description:
      "O áudio é suave e equilibrado, sem picos fortes de energia ou agressividade.",
  };
}

function clamp(v: number, min: number, max: number): number {
  if (v < min) return min;
  if (v > max) return max;
  return v;
}
