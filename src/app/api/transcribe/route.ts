import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const audio = form.get("audio");

  if (!(audio instanceof File)) {
    return NextResponse.json({ error: "Arquivo de áudio não enviado." }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Chave da OpenAI não configurada. Defina OPENAI_API_KEY." },
      { status: 500 },
    );
  }

  const body = new FormData();
  body.append("file", audio, audio.name);
  body.append("model", "whisper-1");
  body.append("language", "pt");

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body,
  });

  const data = await response.json();
  if (!response.ok) {
    return NextResponse.json({ error: data.error?.message ?? "Falha na transcrição." }, { status: response.status });
  }

  return NextResponse.json({ text: data.text ?? "", raw: data });
}
