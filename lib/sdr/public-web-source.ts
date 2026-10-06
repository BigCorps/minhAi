import "server-only";
import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { isIP } from "node:net";

export function publicSourceUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2000) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port ||
        isIP(url.hostname) || !url.hostname.includes(".") || url.hostname.length > 253 ||
        !url.hostname.split(".").every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label)) ||
        /\.(localhost|local|internal|test|invalid)$/i.test(url.hostname) ||
        [...url.searchParams.keys()].some((key) => /token|secret|api.?key|password|authorization/i.test(key))) return null;
    url.hash = "";
    return url.href;
  } catch { return null; }
}
export function publicIpv4(address: string): boolean {
  if (isIP(address) !== 4) return false;
  const [a, b, c] = address.split(".").map(Number);
  return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || (b === 0 && (c === 0 || c === 2)))) ||
    (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) || (a === 203 && b === 0 && c === 113));
}
export function publicPageText(html: string): string {
  return html.replace(/<!--[^]*?-->/g, " ")
    .replace(/<(script|style|noscript)\b[^>]*>[^]*?<\/\1>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&#(x[0-9a-f]+|[0-9]+);/gi, (_, code: string) => {
      const point = code[0].toLowerCase() === "x" ? parseInt(code.slice(1), 16) : Number(code);
      return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : " ";
    })
    .replace(/&(nbsp|amp|quot|apos|lt|gt);/gi, (_, entity: string) =>
      ({ nbsp: " ", amp: "&", quot: '"', apos: "'", lt: "<", gt: ">" })[entity.toLowerCase()] || " ")
    .replace(/\s+/g, " ").trim();
}
// Read only a tool-cited public HTTPS page. Pin DNS, reject redirects and bound size/time.
// Its contents are evidence only; they are never executed or fed back as instructions.
export async function readPublicSource(value: string): Promise<string | null> {
  const safe = publicSourceUrl(value);
  if (!safe) return null;
  try {
    const url = new URL(safe);
    const addresses = await lookup(url.hostname, { family: 4, all: true });
    if (!addresses.length || addresses.some(({ address }) => !publicIpv4(address))) return null;
    return await new Promise<string | null>((resolve) => {
      const req = request(url, {
        method: "GET", family: 4, agent: false, signal: AbortSignal.timeout(5000),
        lookup: (_host, _options, callback) => callback(null, addresses[0].address, 4),
        headers: { Accept: "text/html,text/plain", "Accept-Encoding": "identity" },
      }, (response) => {
        if (response.statusCode !== 200 || !/^(text\/html|text\/plain)/i.test(String(response.headers["content-type"] || ""))) {
          response.destroy(); resolve(null); return;
        }
        let size = 0;
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > 512000) { response.destroy(); resolve(null); }
          else chunks.push(chunk);
        });
        response.on("end", () => resolve(publicPageText(Buffer.concat(chunks).toString("utf8"))));
        response.on("error", () => resolve(null));
      });
      req.setTimeout(5000, () => { req.destroy(); resolve(null); });
      req.on("error", () => resolve(null));
      req.end();
    });
  } catch { return null; }
}
