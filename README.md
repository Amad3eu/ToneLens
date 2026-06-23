# ToneLens

> **Aviso importante: este projeto é um protótipo de análise de áudio.** O objetivo é explorar transcrição e identificação de tom emocional em mensagens de voz. O sistema é experimental e pode errar em qualquer direção.

Ferramenta web que analisa se a voz está muito alta, grave ou carregada e gera uma transcrição inicial de arquivos de áudio e vídeo.

Toda a análise roda **no seu navegador** — nenhum arquivo é enviado para servidor.

## Como funciona (V1 — heurística de tom e transcrição)

Esta versão não compara o áudio com um modelo canônico. Em vez disso, procura padrões acústicos de voz carregada:

- **Razão pico vs. fundo** — quanto o trecho mais alto sobressai sobre o silêncio de fundo.
- **Salto repentino** — se o RMS dispara em poucos milissegundos depois de um período mais quieto.
- **Saturação (clipping)** — fração de amostras estouradas, comum em áudios muito altos.
- **Pico de amplitude** — quão perto da saturação total a faixa chega.
- **Trecho alto contínuo** — duração somada acima de 60% do pico.

Esses sinais são combinados num score de 0 a 100 que vira um veredito carimbado: **APROVADO**, **SUSPEITO** ou **REPROVADO**.

## V2 (futuro)

Vai usar fingerprint de áudio (estilo Shazam / Chromaprint) comparado com exemplos de voz e tom para melhorar a estimativa. Por enquanto, o sistema ainda não tem um conjunto de referência oficial.

## Rodando localmente

```bash
npm install
npm run dev
```

### Configuração de transcrição

Para ativar a transcrição automática, configure a variável de ambiente:

```bash
export OPENAI_API_KEY="sua_chave_aqui"
```

A aplicação envia o arquivo para a rota de API `/api/transcribe`, que usa o modelo `whisper-1` da OpenAI.

Abra [http://localhost:3000](http://localhost:3000).

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4
- Web Audio API (`decodeAudioData`) para extrair amostras de áudio de arquivos MP3, WAV, M4A, OGG, MP4, WebM…
- Canvas 2D para o gráfico de forma de onda

## Deploy

Pensado para Vercel — `npm run build` gera build estático e a página é pré-renderizada.

## Estrutura

- `src/lib/audioAnalysis.ts` — decode + análise pura (RMS, detecção de salto, score).
- `src/components/Analyzer.tsx` — UI (upload, laudo carimbado, waveform, evidências).
- `src/app/page.tsx` — página que monta o `<Analyzer />`.

## Licença

Faça o que quiser. Mas lembre: **é uma brincadeira**.
