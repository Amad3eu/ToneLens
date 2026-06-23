import type { AnalysisResult } from "@/lib/audioAnalysis";

export const SHARE_URL = "https://amad3eu.deno.dev/";

const VERDICT_LABEL: Record<AnalysisResult["verdict"], { stamp: string; sub: string; title: string }> =
  {
    safe: {
      stamp: "APROVADO",
      sub: "Sem tom agressivo detectado",
      title: "Áudio liberado para reprodução",
    },
    suspect: {
      stamp: "SUSPEITO",
      sub: "Indícios moderados",
      title: "Reprodução não recomendada em público",
    },
    danger: {
      stamp: "REPROVADO",
      sub: "Tom agressivo detectado",
      title: "Alerta máximo — voz intensa detectada",
    },
  };

const VERDICT_COLOR: Record<AnalysisResult["verdict"], string> = {
  safe: "#047857",
  suspect: "#b45309",
  danger: "#b91c1c",
};

export interface ShareImageInput {
  result: AnalysisResult;
  fileName: string;
  protocolo: string;
}

const LAUDO_W = 1080;
const LAUDO_H = 1350;

async function renderLaudoCanvas({
  result,
  fileName,
  protocolo,
}: ShareImageInput): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = LAUDO_W;
  canvas.height = LAUDO_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível criar o canvas.");

  if (
    typeof document !== "undefined" &&
    "fonts" in document &&
    document.fonts.ready
  ) {
    try {
      await document.fonts.ready;
    } catch {
      /* ignore */
    }
  }

  paintPaper(ctx, LAUDO_W, LAUDO_H);
  paintBorders(ctx, LAUDO_W, LAUDO_H);

  let y = 130;
  y = drawHeader(ctx, LAUDO_W, y);
  y = drawProtocolBar(ctx, LAUDO_W, y, protocolo);
  y = drawVerdictBlock(ctx, LAUDO_W, y, result);
  y = drawScoreBlock(ctx, LAUDO_W, y, result);
  y = drawWaveform(ctx, LAUDO_W, y, result);
  y = drawFileInfo(ctx, LAUDO_W, y, fileName, result);
  drawSignature(ctx, LAUDO_W, y);
  drawFooter(ctx, LAUDO_W, LAUDO_H);

  return canvas;
}

export async function generateLaudoPdf(
  input: ShareImageInput,
): Promise<Blob> {
  const canvas = await renderLaudoCanvas(input);
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "px",
    format: [LAUDO_W, LAUDO_H],
    hotfixes: ["px_scaling"],
    compress: true,
  });
  const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
  doc.addImage(dataUrl, "JPEG", 0, 0, LAUDO_W, LAUDO_H, undefined, "FAST");
  doc.setProperties({
    title: `Relatório ToneLens ${input.protocolo}`,
    subject: "Análise de tom e transcrição de áudio",
    author: "ToneLens",
    keywords: "análise de áudio, tom, transcrição, voz",
    creator: "amad3eu.deno.dev",
  });
  return doc.output("blob");
}

function paintPaper(ctx: CanvasRenderingContext2D, W: number, H: number) {
  ctx.fillStyle = "#fffaf0";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(0,0,0,0.05)";
  for (let yy = 14; yy < H; yy += 18) {
    for (let xx = 14; xx < W; xx += 18) {
      ctx.fillRect(xx, yy, 1, 1);
    }
  }
  ctx.fillStyle = "rgba(245, 158, 11, 0.06)";
  ctx.beginPath();
  ctx.arc(W * 0.85, H * 0.18, 220, 0, Math.PI * 2);
  ctx.fill();
}

function paintBorders(ctx: CanvasRenderingContext2D, W: number, H: number) {
  ctx.strokeStyle = "#0a0a0a";
  ctx.lineWidth = 5;
  ctx.strokeRect(36, 36, W - 72, H - 72);
  ctx.lineWidth = 1.2;
  ctx.strokeRect(52, 52, W - 104, H - 104);
}

function drawHeader(ctx: CanvasRenderingContext2D, W: number, y: number) {
  drawSeal(ctx, 110, y - 8, 54);

  setFont(ctx, 700, 64, "sans");
  ctx.fillStyle = "#0a0a0a";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("ToneLens", 200, y + 14);

  setFont(ctx, 500, 18, "mono");
  ctx.fillStyle = "#52525b";
  ctx.letterSpacing = "3px";
  ctx.fillText("DEPT. DE ANÁLISE DE TOM E TRANSCRIÇÃO", 200, y + 46);
  ctx.letterSpacing = "0px";

  return y + 96;
}

function drawSeal(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = "#fbbf24";
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#0a0a0a";
  ctx.stroke();

  ctx.beginPath();
  ctx.setLineDash([4, 4]);
  ctx.arc(cx, cy, r + 8, 0, Math.PI * 2);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = "#0a0a0a";
  ctx.lineWidth = 4;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  const ws = [0, 0.18, 0.36, 0.5, 0.64, 0.82, 1];
  const hs = [0.5, 0.35, 0.85, 0.05, 0.95, 0.4, 0.5];
  const wfX0 = cx - r * 0.6;
  const wfW = r * 1.2;
  for (let i = 0; i < ws.length; i++) {
    const px = wfX0 + ws[i] * wfW;
    const py = cy - r * 0.45 + hs[i] * r * 0.9;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.restore();
}

function drawProtocolBar(
  ctx: CanvasRenderingContext2D,
  W: number,
  y: number,
  protocolo: string,
) {
  const x = 100;
  const w = W - 200;
  ctx.strokeStyle = "#0a0a0a";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.stroke();
  ctx.setLineDash([]);

  setFont(ctx, 600, 18, "mono");
  ctx.letterSpacing = "3px";
  ctx.fillStyle = "#0a0a0a";
  ctx.textAlign = "left";
  ctx.fillText(`LAUDO TÉCNICO Nº ${protocolo}`, x, y + 34);

  const dateStr = new Date().toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  ctx.textAlign = "right";
  ctx.fillStyle = "#52525b";
  ctx.fillText(dateStr, x + w, y + 34);
  ctx.letterSpacing = "0px";

  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(x, y + 56);
  ctx.lineTo(x + w, y + 56);
  ctx.stroke();
  ctx.setLineDash([]);

  return y + 90;
}

function drawVerdictBlock(
  ctx: CanvasRenderingContext2D,
  W: number,
  y: number,
  result: AnalysisResult,
) {
  const v = VERDICT_LABEL[result.verdict];
  const color = VERDICT_COLOR[result.verdict];

  setFont(ctx, 600, 16, "mono");
  ctx.letterSpacing = "3px";
  ctx.fillStyle = "#71717a";
  ctx.textAlign = "left";
  ctx.fillText("VEREDITO", 100, y);
  ctx.letterSpacing = "0px";

  setFont(ctx, 700, 40, "sans");
  ctx.fillStyle = color;
  const titleY = y + 50;
  wrapText(ctx, v.title, 100, titleY, 540, 48);

  drawStamp(ctx, W - 210, y + 80, v.stamp, v.sub, color);

  return y + 220;
}

function drawStamp(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  text: string,
  sub: string,
  color: string,
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((-6 * Math.PI) / 180);

  const w = 280;
  const h = 116;
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  roundRect(ctx, -w / 2, -h / 2, w, h, 9);
  ctx.stroke();

  ctx.lineWidth = 1.8;
  roundRect(ctx, -w / 2 + 8, -h / 2 + 8, w - 16, h - 16, 5);
  ctx.stroke();

  setFont(ctx, 800, 44, "sans");
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.letterSpacing = "5px";
  ctx.fillText(text, 4, -8);

  setFont(ctx, 600, 11, "mono");
  ctx.letterSpacing = "3px";
  ctx.fillText(sub.toUpperCase(), 4, 30);
  ctx.letterSpacing = "0px";

  ctx.restore();
}

function drawScoreBlock(
  ctx: CanvasRenderingContext2D,
  W: number,
  y: number,
  result: AnalysisResult,
) {
  const x = 100;
  const w = W - 200;

  setFont(ctx, 600, 16, "mono");
  ctx.letterSpacing = "3px";
  ctx.fillStyle = "#71717a";
  ctx.textAlign = "left";
  ctx.fillText("AVALIAÇÃO DE TOM", x, y);
  ctx.letterSpacing = "0px";

  setFont(ctx, 800, 56, "sans");
  ctx.fillStyle = VERDICT_COLOR[result.verdict];
  ctx.textAlign = "right";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(`${result.dangerScore}`, x + w, y + 8);
  setFont(ctx, 500, 22, "sans");
  ctx.fillStyle = "#71717a";
  ctx.fillText("/100", x + w + 0, y + 38);

  const barY = y + 56;
  const barH = 22;
  ctx.fillStyle = "#e4e4e7";
  roundRect(ctx, x, barY, w, barH, barH / 2);
  ctx.fill();

  const grad = ctx.createLinearGradient(x, 0, x + w, 0);
  grad.addColorStop(0, "#34d399");
  grad.addColorStop(0.5, "#fbbf24");
  grad.addColorStop(1, "#ef4444");
  ctx.fillStyle = grad;
  const fillW = Math.max(barH, (w * result.dangerScore) / 100);
  roundRect(ctx, x, barY, fillW, barH, barH / 2);
  ctx.fill();

  ctx.strokeStyle = "#0a0a0a";
  ctx.lineWidth = 2;
  roundRect(ctx, x, barY, w, barH, barH / 2);
  ctx.stroke();

  setFont(ctx, 600, 13, "mono");
  ctx.fillStyle = "#71717a";
  ctx.letterSpacing = "2px";
  ctx.textAlign = "left";
  ctx.fillText("SEGURO", x, barY + barH + 22);
  ctx.textAlign = "center";
  ctx.fillText("SUSPEITO", x + w / 2, barY + barH + 22);
  ctx.textAlign = "right";
  ctx.fillText("PERIGO", x + w, barY + barH + 22);
  ctx.letterSpacing = "0px";

  return barY + barH + 56;
}

function drawWaveform(
  ctx: CanvasRenderingContext2D,
  W: number,
  y: number,
  result: AnalysisResult,
) {
  const x = 100;
  const w = W - 200;
  const h = 200;

  setFont(ctx, 600, 16, "mono");
  ctx.letterSpacing = "3px";
  ctx.fillStyle = "#71717a";
  ctx.textAlign = "left";
  ctx.fillText("FORMA DE ONDA", x, y);
  ctx.letterSpacing = "0px";

  const boxY = y + 50;
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, x, boxY, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = "#0a0a0a";
  ctx.lineWidth = 2;
  roundRect(ctx, x, boxY, w, h, 8);
  ctx.stroke();

  ctx.strokeStyle = "#e4e4e7";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, boxY + h / 2);
  ctx.lineTo(x + w, boxY + h / 2);
  ctx.stroke();

  const rms = result.rms;
  const n = rms.length;
  if (n > 0) {
    const max = Math.max(result.maxRms, 0.001);
    const buckets = Math.min(220, n);
    const perBucket = Math.max(1, Math.floor(n / buckets));
    const barW = w / buckets;
    for (let b = 0; b < buckets; b++) {
      let bMax = 0;
      const startI = b * perBucket;
      const endI = Math.min(n, startI + perBucket);
      for (let i = startI; i < endI; i++) if (rms[i] > bMax) bMax = rms[i];
      const ratio = bMax / max;
      const bh = ratio * (h - 24);
      const hue = 130 - ratio * 130;
      ctx.fillStyle = `hsl(${hue}, 65%, 45%)`;
      ctx.fillRect(
        x + b * barW,
        boxY + (h - bh) / 2,
        Math.max(1.2, barW - 1),
        bh,
      );
    }

    if (result.jump) {
      const xs = x + (result.jump.startSec / result.durationSec) * w;
      const xe = x + (result.jump.endSec / result.durationSec) * w;
      ctx.fillStyle = "rgba(239,68,68,0.12)";
      ctx.fillRect(xs, boxY, Math.max(2, xe - xs), h);
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(xe, boxY);
      ctx.lineTo(xe, boxY + h);
      ctx.stroke();
      ctx.setLineDash([]);

      const labelText =
        result.verdict === "danger"
          ? "MOMENTO DO ATAQUE"
          : result.verdict === "suspect"
            ? "PADRÃO SUSPEITO"
            : "PICO DETECTADO";
      drawCalloutLabel(ctx, xe, y + 12, labelText);
    }
  }

  return boxY + h + 30;
}

function drawCalloutLabel(
  ctx: CanvasRenderingContext2D,
  xAnchor: number,
  y: number,
  text: string,
) {
  setFont(ctx, 800, 16, "mono");
  ctx.letterSpacing = "2px";
  const padding = 12;
  const metrics = ctx.measureText(text);
  const w = metrics.width + padding * 2 + 16;
  const h = 32;
  let bx = xAnchor - w / 2;
  bx = Math.max(110, Math.min(bx, 970 - w));
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, bx, y, w, h, 6);
  ctx.fill();
  ctx.strokeStyle = "#ef4444";
  ctx.lineWidth = 2.5;
  roundRect(ctx, bx, y, w, h, 6);
  ctx.stroke();
  ctx.fillStyle = "#b91c1c";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(`↓ ${text}`, bx + padding, y + h / 2);
  ctx.letterSpacing = "0px";
}

function drawFileInfo(
  ctx: CanvasRenderingContext2D,
  W: number,
  y: number,
  fileName: string,
  result: AnalysisResult,
) {
  const x = 100;

  setFont(ctx, 600, 14, "mono");
  ctx.letterSpacing = "3px";
  ctx.fillStyle = "#71717a";
  ctx.textAlign = "left";
  ctx.fillText("ARQUIVO PERICIADO", x, y);
  ctx.letterSpacing = "0px";

  setFont(ctx, 600, 22, "sans");
  ctx.fillStyle = "#0a0a0a";
  const maxNameW = W - 200;
  const truncated = fitText(ctx, fileName, maxNameW);
  ctx.fillText(truncated, x, y + 28);

  const channels = result.numChannels === 1 ? "mono" : "estéreo";
  setFont(ctx, 500, 16, "mono");
  ctx.fillStyle = "#52525b";
  ctx.letterSpacing = "2px";
  ctx.fillText(
    `${result.durationSec.toFixed(1)}S  ·  ${result.sampleRate} HZ  ·  ${channels.toUpperCase()}  ·  PICO ${result.peakAmplitude.toFixed(2)}`,
    x,
    y + 56,
  );
  ctx.letterSpacing = "0px";

  return y + 92;
}

function drawSignature(ctx: CanvasRenderingContext2D, W: number, y: number) {
  const xLeft = W - 460;
  const xRight = W - 100;
  const cx = (xLeft + xRight) / 2;

  ctx.save();
  ctx.translate(cx, y + 20);
  ctx.rotate(-0.03);
  ctx.strokeStyle = "#1e3a8a";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.beginPath();
  ctx.moveTo(-150, 30);
  ctx.bezierCurveTo(-125, -28, -100, -35, -85, 10);
  ctx.bezierCurveTo(-80, 24, -72, 24, -64, 8);
  ctx.bezierCurveTo(-50, -18, -25, -30, -8, 5);
  ctx.bezierCurveTo(0, 22, 14, 22, 22, 5);
  ctx.bezierCurveTo(42, -26, 76, -22, 82, 8);
  ctx.bezierCurveTo(84, 22, 100, 24, 114, 5);
  ctx.bezierCurveTo(130, -8, 145, 0, 152, 22);
  ctx.stroke();

  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-158, 48);
  ctx.bezierCurveTo(-80, 60, 0, 52, 80, 56);
  ctx.bezierCurveTo(125, 58, 150, 50, 164, 64);
  ctx.stroke();
  ctx.restore();

  ctx.strokeStyle = "#0a0a0a";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(xLeft, y + 100);
  ctx.lineTo(xRight, y + 100);
  ctx.stroke();

  setFont(ctx, 600, 16, "sans");
  ctx.fillStyle = "#0a0a0a";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("Perito Responsável", cx, y + 122);
  setFont(ctx, 500, 13, "mono");
  ctx.letterSpacing = "2px";
  ctx.fillStyle = "#52525b";
  ctx.fillText("CRD-AGM 13.337/BR", cx, y + 144);
  ctx.letterSpacing = "0px";

  return y + 170;
}

function drawFooter(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
) {
  ctx.strokeStyle = "#0a0a0a";
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 5]);
  ctx.beginPath();
  ctx.moveTo(100, H - 150);
  ctx.lineTo(W - 100, H - 150);
  ctx.stroke();
  ctx.setLineDash([]);

  setFont(ctx, 700, 30, "sans");
  ctx.fillStyle = "#0a0a0a";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("amad3eu.deno.dev", W / 2, H - 110);

  setFont(ctx, 500, 14, "mono");
  ctx.fillStyle = "#71717a";
  ctx.letterSpacing = "3px";
  ctx.fillText(
    "VALIDE SEU ÁUDIO ANTES DE PRESSIONAR PLAY",
    W / 2,
    H - 82,
  );
  ctx.letterSpacing = "0px";

  setFont(ctx, 400, 12, "sans");
  ctx.fillStyle = "#71717a";
  ctx.fillText(
    "Ferramenta de uso recreativo. Brincadeira sem garantias técnicas — análise heurística e falível.",
    W / 2,
    H - 60,
  );
}

function setFont(
  ctx: CanvasRenderingContext2D,
  weight: number,
  size: number,
  family: "sans" | "mono",
) {
  const stack =
    family === "mono"
      ? `"Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace`
      : `"Geist", system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.font = `${weight} ${size}px ${stack}`;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (
    truncated.length > 4 &&
    ctx.measureText(truncated + "…").width > maxWidth
  ) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + "…";
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(/\s+/);
  let line = "";
  let cy = y;
  for (let i = 0; i < words.length; i++) {
    const test = line ? line + " " + words[i] : words[i];
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cy);
      line = words[i];
      cy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, cy);
  return cy;
}

export async function shareOrDownload({
  result,
  fileName,
  protocolo,
}: ShareImageInput): Promise<"shared" | "downloaded"> {
  const blob = await generateLaudoPdf({ result, fileName, protocolo });
  const stamp = VERDICT_LABEL[result.verdict].stamp;
  const safeProto = protocolo.replace(/[^A-Za-z0-9-]/g, "-");
  const file = new File([blob], `tonelens-relatorio-${safeProto}.pdf`, {
    type: "application/pdf",
  });
  const shareText = `Relatório ToneLens: ${stamp} — ${result.dangerScore}/100 de risco de tom de voz. ${SHARE_URL}`;

  type ShareNav = Navigator & {
    canShare?: (data: ShareData) => boolean;
    share?: (data: ShareData) => Promise<void>;
  };
  const nav: ShareNav = navigator;
  if (
    typeof nav !== "undefined" &&
    nav.canShare &&
    nav.share &&
    nav.canShare({ files: [file] })
  ) {
    try {
      await nav.share({
        files: [file],
        title: "Relatório ToneLens",
        text: shareText,
      });
      return "shared";
    } catch (e) {
      if ((e as DOMException)?.name === "AbortError") {
        throw e;
      }
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "downloaded";
}
