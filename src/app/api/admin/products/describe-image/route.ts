import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

const PROMPT =
  "Write a concise marketplace listing description (2-4 sentences) for this resale item. Mention visible brand, color, type, material if clear. Do not invent facts not visible. Tone: clean, trustworthy, suitable for LIMWARE.";

const MISSING_KEY_ERROR =
  "Add OPENAI_API_KEY in Vercel env vars to enable AI descriptions";

function getVisionConfig():
  | { apiUrl: string; apiKey: string; model: string }
  | { error: string } {
  // Prefer Vercel AI Gateway when configured.
  const gatewayKey =
    process.env.AI_GATEWAY_API_KEY?.trim() ||
    process.env.VERCEL_AI_GATEWAY_API_KEY?.trim();
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

  return { error: MISSING_KEY_ERROR };
}

function isUsableImagePayload(imageUrl: string): boolean {
  if (imageUrl.startsWith("data:image/")) return true;
  if (imageUrl.startsWith("https://") || imageUrl.startsWith("http://")) return true;
  return false;
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

  // Browser blob: URLs are not reachable by the vision model — client must send
  // a public https URL or a data:image/... base64 payload.
  if (imageUrl.startsWith("blob:")) {
    return NextResponse.json(
      {
        error:
          "Photo is still a local preview. Wait for upload to finish, or try again.",
      },
      { status: 400 }
    );
  }

  if (!isUsableImagePayload(imageUrl)) {
    return NextResponse.json(
      { error: "A public photo URL or image data is required" },
      { status: 400 }
    );
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
      const providerMessage = data.error?.message || "Vision model request failed";
      // Surface missing/invalid key clearly when the provider rejects auth.
      if (res.status === 401 || /api key|unauthorized|authentication/i.test(providerMessage)) {
        return NextResponse.json({ error: MISSING_KEY_ERROR }, { status: 503 });
      }
      return NextResponse.json({ error: providerMessage }, { status: 502 });
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
