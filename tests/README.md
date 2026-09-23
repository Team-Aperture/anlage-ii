# Tests

Playwright suites and analytical audits for the game. Nothing here ships to the
player; GitHub Pages serves these files but nothing runs them.

```
npm i -g playwright http-server        # once
npx playwright install chromium        # once
npx http-server -p 8099 -s &           # serve the repo
NODE_PATH=$(npm root -g) node tests/run.js         # every suite
NODE_PATH=$(npm root -g) node tests/test_dlgspace.js
```

`analyse_*.js` need no browser: they lift the real generators out of the
shipped source and run them tens of thousands of times.

The access-page suites need the KA-I code. Put it in `tests/.local.json` as
`{"KA1_CODE":"…"}` (git-ignored) or pass `KA1_CODE=… node …`. It is never
committed and never appears in a shipped file.
