import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

const PROMPT = `Write a concise marketplace listing description for this resale item.
Focus on clothing, shoes, bags, jewelry, toys, or collectibles as applicable.
Note only what is clearly visible: brand, color, material cues, style, and condition cues.
Do not invent facts, sizes, authenticity claims, or details you cannot see.
Keep it to 2–4 short sentences suitable for a product listing. No markdown or bullet points.`;

function getVisionConfig():
  | { apiUrl: string; apiKey: string; model: string }
  | { error: string } {
  const gatewayKey = process.env.AI_GATEWAY_API_KEY?.trim();
  if (gatewayKey) {
    return {
      apiUrl: "https://ai-gateway.vercel.sh/v1/chat/completions",
      apiKey: gatewayKey,
      model: "openai/gpt-4o-mini",
    };
  }

  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (openaiKey) {
    return {
      apiUrl: "https://api.openai.com/v1/chat/completions",
      apiKey: openaiKey,
      model: "gpt-4o-mini",
    };
  }

  return {
    error: "Add OPENAI_API_KEY or AI_GATEWAY_API_KEY to enable AI descriptions",
  };
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const config = getVisionConfig();
  if ("error" in config) {
    return NextResponse.json({ error: config.error }, { status: 503 });
  }

  let imageUrl = "";
  try {
    const body = await request.json();
    imageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!imageUrl) {
    return NextResponse.json({ error: "imageUrl is required" }, { status: 400 });
  }

  try {
    const res = await fetch(config.apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: PROMPT },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        max_tokens: 300,
        temperature: 0.4,
      }),
    });

    const data = (await res.json()) as {
      error?: { message?: string };
      choices?: { message?: { content?: string } }[];
    };

    if (!res.ok) {
      return NextResponse.json(
        { error: data.error?.message || "Vision model request failed" },
        { status: 502 }
      );
    }

    const description = data.choices?.[0]?.message?.content?.trim();
    if (!description) {
      return NextResponse.json({ error: "No description returned" }, { status: 502 });
    }

    return NextResponse.json({ description });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI description failed" },
      { status: 502 }
    );
  }
}
