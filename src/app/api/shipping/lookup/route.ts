import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const zip = searchParams.get("zip")?.trim() || "";
  const country = searchParams.get("country") || "US";

  if (country === "US") {
    const digits = zip.replace(/\D/g, "").slice(0, 5);
    if (digits.length !== 5) {
      return NextResponse.json({ error: "Enter a 5-digit ZIP code" }, { status: 400 });
    }

    const res = await fetch(`https://api.zippopotam.us/us/${digits}`, {
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "ZIP code not found" }, { status: 404 });
    }

    const data = (await res.json()) as {
      places: { "place name": string; "state abbreviation": string }[];
    };
    const place = data.places[0];
    if (!place) {
      return NextResponse.json({ error: "ZIP code not found" }, { status: 404 });
    }

    return NextResponse.json({
      city: place["place name"],
      state: place["state abbreviation"],
      zip: digits,
    });
  }

  if (country === "CA") {
    const normalized = zip.toUpperCase().replace(/\s+/g, "");
    if (normalized.length < 3) {
      return NextResponse.json({ error: "Enter a postal code" }, { status: 400 });
    }

    const res = await fetch(`https://api.zippopotam.us/ca/${encodeURIComponent(normalized)}`, {
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Postal code not found" }, { status: 404 });
    }

    const data = (await res.json()) as {
      places: { "place name": string; "state abbreviation": string }[];
    };
    const place = data.places[0];
    if (!place) {
      return NextResponse.json({ error: "Postal code not found" }, { status: 404 });
    }

    return NextResponse.json({
      city: place["place name"],
      state: place["state abbreviation"],
      zip: formatCaPostalFromApi(normalized),
    });
  }

  return NextResponse.json({ error: "Unsupported country" }, { status: 400 });
}

function formatCaPostalFromApi(value: string): string {
  const raw = value.replace(/[^A-Z0-9]/g, "").slice(0, 6);
  if (raw.length <= 3) return raw;
  return `${raw.slice(0, 3)} ${raw.slice(3)}`;
}
