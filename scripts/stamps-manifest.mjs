// Lists every image in public/stamps into lib/stamps.json so the postcard editor
// can show them in the stamp picker. A browser can't read a folder, so this runs
// before `npm run dev` and `npm run build` (see "predev" / "prebuild" in package.json).
// Added a new stamp while the dev server is running? Restart `npm run dev`.
import { existsSync, readdirSync, writeFileSync } from "node:fs";

const dir = "public/stamps";
const files = existsSync(dir)
  ? readdirSync(dir)
      .filter((name) => /\.(svg|png|webp|jpe?g|gif)$/i.test(name))
      .sort()
  : [];

writeFileSync("lib/stamps.json", JSON.stringify(files.map((name) => `/stamps/${encodeURIComponent(name)}`), null, 2) + "\n");
console.log(`stamps: ${files.length} file(s) found in ${dir}`);
