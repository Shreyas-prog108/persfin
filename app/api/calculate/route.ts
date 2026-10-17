import { NextResponse } from "next/server";
import { z } from "zod";
import { executeCalculator } from "@/lib/agent/tools";
import { allowRequest } from "@/lib/security/rate-limit";
import type { FormSeed } from "@/features/calculators/types";

const bodySchema = z.object({
  slug: z.string().min(1).max(80),
  scalars: z.record(z.string(), z.string()).optional(),
  rows: z.record(z.string(), z.array(z.record(z.string(), z.string()))).optional(),
});

export async function POST(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!allowRequest(`calculate:${forwarded}`)) {
    return NextResponse.json({ ok: false, error: "Too many calculations from this address. Wait a minute." }, { status: 429 });
  }
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Send JSON." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Slug and input fields were not valid." }, { status: 400 });
  }
  const seed: FormSeed | undefined =
    parsed.data.scalars || parsed.data.rows
      ? { scalars: parsed.data.scalars ?? {}, rows: parsed.data.rows ?? {} }
      : undefined;
  const result = executeCalculator(parsed.data.slug, seed);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
