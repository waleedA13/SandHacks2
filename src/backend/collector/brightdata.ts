// The only file that knows Bright Data's endpoints and zones.
import { chromium, type Browser } from "@playwright/test";

const API = "https://api.brightdata.com/request";

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set in .env.local`);
  return v;
}

async function request(body: object): Promise<Response> {
  const res = await fetch(API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env("BRIGHTDATA_API_TOKEN")}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok)
    throw new Error(
      `Bright Data ${res.status}: ${(await res.text()).slice(0, 300)}`,
    );
  // target-side failures come back as HTTP 200 with these headers
  const err = res.headers.get("x-brd-error");
  if (err)
    throw new Error(
      `Bright Data ${res.headers.get("x-brd-status-code")}: ${err}`,
    );
  return res;
}

/** Page HTML through Web Unlocker. */
export async function unlock(url: string): Promise<string> {
  const res = await request({
    zone: env("BRIGHTDATA_UNLOCKER_ZONE"),
    url,
    format: "raw",
  });
  return res.text();
}

/** Google organic results through SERP API. */
export async function serp(
  query: string,
): Promise<{ title: string; url: string }[]> {
  // brd_json=1 makes the SERP zone return parsed JSON; format "json" returned HTML in testing
  const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&gl=us&hl=en&brd_json=1`;
  const res = await request({
    zone: env("BRIGHTDATA_SERP_ZONE"),
    url,
    format: "raw",
  });
  const text = await res.text();
  if (!text) throw new Error("SERP API returned an empty body");
  const data = JSON.parse(text) as {
    organic?: { title: string; link: string }[];
  };
  return (data.organic ?? []).map((r) => ({ title: r.title, url: r.link }));
}

/** Playwright browser running on Bright Data's Browser API. */
export function openBrowser(): Promise<Browser> {
  return chromium.connectOverCDP(env("BRIGHTDATA_BROWSER_WSS"));
}
