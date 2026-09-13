/** Zie `test-resolver.mjs` — dit zijn de hooks zelf, die in een eigen thread draaien. */
import { pathToFileURL } from "node:url";
import path from "node:path";

const wortel = path.resolve(import.meta.dirname, "..");

/** Heeft de specifier al een extensie die Node zelf aankan? */
function heeftExtensie(specifier) {
  return /\.[cm]?[jt]sx?$/.test(specifier) || /\.json$/.test(specifier);
}

export async function resolve(specifier, context, next) {
  // `@/lib/kanalen/kubus` → het echte pad, met de extensie erbij.
  if (specifier.startsWith("@/")) {
    const pad = path.join(wortel, specifier.slice(2));
    const doel = heeftExtensie(pad) ? pad : `${pad}.ts`;
    return next(pathToFileURL(doel).href, context);
  }

  // `./kubus` → `./kubus.ts`; valt terug op het origineel als dat bestand niet bestaat.
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && !heeftExtensie(specifier)) {
    try {
      return await next(`${specifier}.ts`, context);
    } catch {
      return next(specifier, context);
    }
  }

  return next(specifier, context);
}
