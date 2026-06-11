/**
 * After a successful write/edit, suggest a language-appropriate command to
 * compile or syntax-check the file. The agent loop tends to skip the "now test
 * it" step; returning a concrete command in the tool result nudges it to run
 * run_bash and catch errors it introduced, then re-fix.
 */
export function verifyHint(path: string): string {
  const ext = path.slice(path.lastIndexOf('.') + 1).toLowerCase()
  const cmds: Record<string, string> = {
    ts:   `npx tsc --noEmit`,
    tsx:  `npx tsc --noEmit`,
    js:   `node --check ${path}`,
    jsx:  `node --check ${path}`,
    mjs:  `node --check ${path}`,
    cjs:  `node --check ${path}`,
    py:   `python -m py_compile ${path}`,
    go:   `go build ./...`,
    rs:   `cargo check`,
    rb:   `ruby -c ${path}`,
    php:  `php -l ${path}`,
    sh:   `bash -n ${path}`,
    bash: `bash -n ${path}`,
    c:    `gcc -fsyntax-only ${path}`,
    h:    `gcc -fsyntax-only ${path}`,
    cpp:  `g++ -fsyntax-only ${path}`,
    cc:   `g++ -fsyntax-only ${path}`,
    java: `javac -d /tmp ${path}`,
  }
  const cmd = cmds[ext]
  if (!cmd) return ''
  return ` Now verify via run_bash: ${cmd} — fix any errors it reports before continuing.`
}
