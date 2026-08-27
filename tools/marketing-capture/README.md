# Marketing capture

Produces screenshots and demo videos of the renderer UI for the marketing site,
without running Electron, logging in, or holding a real interview.

```bash
pnpm dev                                              # renderer on :15173
python tools/marketing-capture/capture.py shots  out/
python tools/marketing-capture/capture.py videos out/ # needs ffmpeg on PATH
```

Requires Python with `playwright` and its Chromium browser
(`pip install playwright && python -m playwright install chromium`).
Override the URL with `CAPTURE_URL` if the dev server is elsewhere.

## How it works

The renderer reaches the main process through exactly one object -
`window.electron`, exposed by [src/main/preload.cts](../../src/main/preload.cts).
It boots fine in an ordinary browser and then waits on that object, so the
script injects a stub for it via `addInitScript` and the real UI renders
against canned state. No Electron, no backend, no audio, no credentials.

Video mode uses the same stub but keeps the subscriber list live and mutates
`STATE` in place over a timeline, so the panels animate the way they do in a
real session: transcript lines arrive, a card goes pending, the answer streams
in, then a screenshot solution lands.

## Why it lives in this repo

Everything it mirrors is here - the preload surface, `RendererAppState`, the
`RuntimeConfig` defaults, the `Speaker` / `SuggestionState` / `RunningState`
enum values. When any of those change this is what has to change with them, and
it should break next to the code that broke it. Same reasoning as `test/manual/`.

It is deliberately **not** in `test/`: it asserts nothing and CI does not run it.

## Three things that are easy to get wrong

- **`zoom.getFactor()` returns a multiplier, not a percentage.** The control
  renders `factor * 100`, so returning `100` puts `10000%` on the status bar.
- **`audioInputDeviceName` has to match a device the browser really
  enumerates.** Headless Chromium has none, so the control bar raises its
  "configured microphone is missing" badge on every frame. The script launches
  with `--use-fake-device-for-media-stream` and points the config at
  `Fake Default Audio Input`.
- **Stealth is a body class, not only app state.** The preload adds
  `.stealth` to `document.body` on `window:stealth-changed`; setting
  `isStealth` alone leaves the normal chrome on screen.

## Demo content

Illustrative, not a recording of a real session: a generic backend-engineering
question about indexing, and a connected-components solution. No real names,
companies, or identifiable details.

**Do not paste a real candidate's transcript in here.** These images go on a
public marketing page.

## What it does not cover

The **stealth overlay composited over a real screen share** - the shot that
actually proves the feature - cannot come from this script, because there is no
desktop behind the window to be invisible against. That one needs the real app:

```bash
pnpm electron:dev-show -- --disable-content-protection
```

Content protection is on by default, so an ordinary screen recorder captures
the stealth window as blank; that flag
([src/main/index.ts](../../src/main/index.ts)) is what makes a real screen
recording of it possible at all.
