# ToneLens

> ToneLens é um protótipo de análise de áudio que combina transcrição e avaliação de tom vocal em mensagens de voz.

O foco do projeto é ajudar a identificar rapidamente se um áudio está com tom carregado, alto ou emocional, enquanto também gera uma transcrição inicial do conteúdo.

## O que faz

- Analisa arquivos de áudio e vídeo enviados pelo usuário.
- Extrai métricas de amplitude, dinâmica e saturação.
- Gera um veredito simples sobre o tom do áudio.
- Cria uma transcrição inicial via API de transcrição.
- Exibe resultados no navegador com waveform e indicadores de evidência.

## Como funciona

A análise combina heurísticas de sinal de áudio com informações de amplitude e ruído, buscando padrões que indiquem voz intensa ou carregada. A transcrição é realizada por uma rota de API que encaminha o arquivo para o modelo `whisper-1` da OpenAI.

## Executando localmente

```bash
npm install
npm run dev
```

Em seguida, abra [http://localhost:3000](http://localhost:3000).

## Configuração de ambiente

Crie um arquivo `.env.local` na raiz do projeto contendo:

```bash
OPENAI_API_KEY="sua_chave_aqui"
```

A chave é usada pela rota de API `/api/transcribe` para gerar a transcrição.

## Stack do projeto

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- Web Audio API
- OpenAI Whisper (`whisper-1`)

## Estrutura principal

- `src/app/page.tsx` — página principal do app
- `src/components/Analyzer.tsx` — interface de upload e resultados
- `src/lib/audioAnalysis.ts` — lógica de análise de áudio
- `src/app/api/transcribe/route.ts` — rota de transcrição com OpenAI

## Observações

- Este projeto é experimental e serve como protótipo.
- A análise não substitui avaliações profissionais ou soluções comerciais.
