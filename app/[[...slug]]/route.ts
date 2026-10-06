import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const PUBLIC_DIR = path.join(process.cwd(), "public");

const STATIC_PAGES = [
  [],
  ["services"],
  ["realisations"],
  ["realisations", "alric"],
  ["realisations", "vauclair"],
  ["realisations", "lacets"],
  ["realisations", "sublimessence"],
  ["realisations", "veillee"],
  ["methode"],
  ["copilot"],
  ["parrainage"],
  ["a-propos"],
  ["contact"],
  ["mentions-legales"],
  ["confidentialite"],
];

export function generateStaticParams() {
  return STATIC_PAGES.map((slug) => ({ slug }));
}

function resolveHtml(slug: string[] = []) {
  const target =
    slug.length === 0
      ? path.join(PUBLIC_DIR, "index.html")
      : path.join(PUBLIC_DIR, ...slug, "index.html");
  const resolved = path.resolve(target);
  if (!resolved.startsWith(PUBLIC_DIR + path.sep) && resolved !== path.join(PUBLIC_DIR, "index.html")) {
    return null;
  }
  return resolved;
}

export async function GET(
  _request: Request,
  context: RouteContext<"/[[...slug]]">,
) {
  const { slug = [] } = await context.params;
  const file = resolveHtml(slug);

  if (file && existsSync(file)) {
    const html = await readFile(file, "utf8");
    return new NextResponse(html, {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  const notFound = await readFile(path.join(PUBLIC_DIR, "404.html"), "utf8");
  return new NextResponse(notFound, {
    status: 404,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
