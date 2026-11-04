// Reading cited files from the repo, shared by the plan renderer (code exhibits, at="path:line") and the state-machine model
// (its imports and the at: of a hand-written step). Only files under the root, and never one named like a secrets file.
import { readFileSync, realpathSync, statSync } from "node:fs";
import { relative, resolve, sep } from "node:path";

const SECRET_NAME = /(^|\/)\.(git|ssh|aws|gnupg|kube)(\/|$)|(^|\/)(\.env(\.[^/]*)?|\.npmrc|\.netrc|\.pypirc|\.pgpass|\.git-credentials|id_(rsa|dsa|ecdsa|ed25519)[^/]*|credentials[^/]*|secrets?(\.[^/]*)?)$|\.(pem|key|p12|pfx|tfstate|kdbx|keystore)$/i;

/** A cached reader for paths relative to realRoot: { text, abs } or { error } (plus missing: true when nothing is there). */
export function fileReader(realRoot) {
  const cache = new Map();
  return (path) => {
    if (cache.has(path)) return cache.get(path);
    let out;
    try {
      const requested = relative(realRoot, resolve(realRoot, path)).split(sep).join("/");
      const real = realpathSync(resolve(realRoot, path));
      const rel = relative(realRoot, real);
      if (rel.startsWith("..") || rel.startsWith(sep) || /^[a-z]:/i.test(rel)) out = { error: `${path} is outside ${realRoot}` };
      // check the cited name and the link target both, so a link named .env cannot pass as config.txt
      else if (SECRET_NAME.test(requested) || SECRET_NAME.test(rel.split(sep).join("/"))) out = { error: `${path} looks like a secrets file; not reading it` };
      else if (!statSync(real).isFile()) out = { error: `${path} is not a file` };
      else out = { text: readFileSync(real, "utf8").replace(/\r\n/g, "\n"), abs: real };
    } catch {
      out = { missing: true, error: `${path} not found under ${realRoot}` };
    }
    cache.set(path, out);
    return out;
  };
}

/** Checks at="path" or at="path:line": { error } when it is malformed or names nothing, and abs when the file exists.
 * A path alone may name a file that does not exist yet (a plan creates it); a line must exist. */
export function checkAt(at, read) {
  const [path, line] = at.split(":");
  const r = read(path);
  if (line !== undefined && !/^[1-9]\d*$/.test(line)) return { error: `at="${at}"; write at="path" or at="path:line" with a line number from 1` };
  if (r.error && (!r.missing || line)) return { error: `at="${at}": ${r.error}` };
  if (!r.missing && line && +line > r.text.split("\n").length) return { error: `at="${at}", but ${path} has ${r.text.split("\n").length} lines`, abs: r.abs };
  return { abs: r.abs };
}
