/**
 * Module-resolutie voor de testrunner.
 *
 * `node --test` draait zonder bundler en kent daarom twee dingen niet die in de app
 * gewoon werken: het `@/`-alias uit `tsconfig.json`, en imports zonder bestandsextensie.
 * Zonder deze hook is een `lib/`-module alleen te testen als hij toevallig niets anders
 * importeert dan types — en dat is een rare eis aan code die juist rekenwerk doet.
 *
 * Geregistreerd via `--import ./scripts/test-resolver.mjs` in het testscript.
 */
import { register } from "node:module";

register(new URL("./test-resolver-hooks.mjs", import.meta.url));
