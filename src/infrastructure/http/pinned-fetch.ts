import "server-only";

import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import { request } from "node:https";
import type { LookupFunction } from "node:net";
import { Readable } from "node:stream";
import {
  isPrivateAddress,
  isPublicImageUrl,
} from "@omerdlw/base-framework/ambient/server";

export const isPublicHttps = (url: URL) =>
  url.protocol === "https:" && isPublicImageUrl(url);

const publicOnlyLookup: LookupFunction = (hostname, options, callback) => {
  dnsLookup(hostname, { ...options, all: true }, (error, found) => {
    if (error) return callback(error, "", 0);
    const addresses = found as LookupAddress[];
    if (
      !addresses.length ||
      addresses.some((a) => isPrivateAddress(a.address))
    ) {
      const refused = Object.assign(new Error(`Refused ${hostname}`), {
        code: "ENOTFOUND",
      });
      return callback(refused, "", 0);
    }
    if (options.all) return callback(null, addresses);
    callback(null, addresses[0].address, addresses[0].family);
  });
};

const BODILESS = new Set([101, 204, 205, 304]);

export const pinnedFetch = ((input: URL | RequestInfo, init?: RequestInit) =>
  new Promise<Response>((resolve, reject) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.protocol !== "https:") {
      reject(new Error("Only https is read"));
      return;
    }
    const outgoing = request(
      url,
      {
        headers: { accept: "image/*" },
        lookup: publicOnlyLookup,
        method: "GET",
        signal: init?.signal ?? undefined,
      },
      (incoming) => {
        const headers = new Headers();
        for (const [name, value] of Object.entries(incoming.headers)) {
          if (value === undefined) continue;
          for (const item of Array.isArray(value) ? value : [value]) {
            headers.append(name, item);
          }
        }
        const status = incoming.statusCode ?? 502;
        if (BODILESS.has(status)) incoming.resume();
        resolve(
          new Response(
            BODILESS.has(status)
              ? null
              : (Readable.toWeb(incoming) as ReadableStream<Uint8Array>),
            { headers, status },
          ),
        );
      },
    );
    outgoing.on("error", reject);
    outgoing.end();
  })) as typeof fetch;
