"""
Capture marketing screenshots and demo videos of the renderer UI.

Why this works without Electron: the renderer talks to the main process only
through the single `window.electron` object that src/main/preload.cts exposes.
It boots fine in an ordinary browser and then waits on that object, so a stub
for it renders the real UI - no Electron, no login, no backend, no audio.

Why it lives here rather than in the marketing site repo: everything it mirrors
is in this repo. When the preload surface or the app-state shape changes, this
is what has to change with it, and it should break next to the code that broke
it. Same reasoning as test/manual/.

Demo content is illustrative, not a recording of a real session - a generic
backend-engineering question, no real names, companies or people. Do not put a
real candidate's transcript in here.

    pnpm dev                                    # renderer on :15173
    python tools/marketing-capture/capture.py shots  out/
    python tools/marketing-capture/capture.py videos out/   # needs ffmpeg

See README.md in this directory.
"""

import json
import os
import shutil
import subprocess
import sys

from playwright.sync_api import sync_playwright

URL = os.environ.get('CAPTURE_URL', 'http://localhost:15173/')

NOW = 1750000000000

QUESTION = (
    "Walk me through how you'd approach indexing a table that has grown to "
    'about forty million rows and is getting slow on reads.'
)

ANSWER = (
    "I'd start with the **query patterns**, not the table. Pull the slow statements first "
    'and look at what they actually filter and sort on.\n\n'
    'From there:\n\n'
    '- A **composite index** on the `WHERE` columns plus whatever the query orders by, in '
    'that order - the leading column has to be the one that filters hardest.\n'
    '- Check whether a **covering index** removes the heap lookup entirely, since at forty '
    'million rows that round trip is usually where the time goes.\n'
    '- Confirm with `EXPLAIN ANALYZE` before and after rather than assuming.\n\n'
    "I'd also ask whether reads are skewed to recent rows - if so **partitioning** by date "
    'may do more than any single index.'
)

CODE_ANSWER = (
    'Breadth-first search over the grid, counting how many times a new component is '
    'entered.\n\n'
    '```python\n'
    'def count_islands(grid):\n'
    '    if not grid:\n'
    '        return 0\n'
    '    rows, cols = len(grid), len(grid[0])\n'
    '    seen, count = set(), 0\n\n'
    '    for r in range(rows):\n'
    '        for c in range(cols):\n'
    "            if grid[r][c] != '1' or (r, c) in seen:\n"
    '                continue\n'
    '            count += 1\n'
    '            stack = [(r, c)]\n'
    '            while stack:\n'
    '                y, x = stack.pop()\n'
    '                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):\n'
    '                    ny, nx = y + dy, x + dx\n'
    '                    if 0 <= ny < rows and 0 <= nx < cols \\\n'
    "                       and grid[ny][nx] == '1' and (ny, nx) not in seen:\n"
    '                        seen.add((ny, nx))\n'
    '                        stack.append((ny, nx))\n'
    '    return count\n'
    '```\n\n'
    '`O(rows x cols)` time, and the visited set bounds memory to the same.'
)

TRANSCRIPTS = [
    ("Thanks for joining. Let's start with something practical.", 'other', 62000),
    ('Sounds good.', 'self', 55000),
    (QUESTION, 'other', 40000),
]


def transcript(text, speaker, ago):
    return {
        'timestamp': NOW - ago,
        'text': text,
        'speaker': speaker,
        'isFinal': True,
        'endTimestamp': NOW - ago + 4000,
        'language': 'en',
    }


def live(answer, state='success', mode='normal'):
    return {
        'timestamp': NOW - 30000,
        'last_question': QUESTION,
        'answer': answer,
        'state': state,
        'error': '',
        'mode': mode,
    }


def action(answer, state='success'):
    return {
        'timestamp': NOW - 12000,
        'last_question': 'Screenshot: coding challenge',
        'answer': answer,
        'image_urls': [None, None, None, None],
        'state': state,
        'error': '',
    }


EMPTY = {'transcripts': [], 'liveSuggestions': [], 'actionSuggestions': []}
FULL = {
    'transcripts': [transcript(*t) for t in TRANSCRIPTS],
    'liveSuggestions': [live(ANSWER)],
    'actionSuggestions': [action(CODE_ANSWER)],
}


def build_stub(state_extra, config_extra=None):
    app_state = {
        'isStealth': False,
        'isBackendLive': True,
        'isLoggedIn': True,
        'runningState': 'running',
        'credits': 4820,
        'userRole': 'user',
        'providedLLMModel': 'SOTA model',
        'interviewConfig': {'fullName': 'Alex Morgan', 'hasProfileData': True},
        'interviewConfigLoaded': True,
    }
    app_state.update(EMPTY)
    app_state.update(state_extra)

    config = {
        'language': 'en',
        'sessionToken': 'demo',
        'rememberMe': True,
        'email': 'demo@example.com',
        'password': '',
        # Must match a device Chromium actually enumerates, or the control bar
        # raises its "configured microphone is missing" badge on every frame.
        # This is what --use-fake-device-for-media-stream provides.
        'audioInputDeviceName': 'Fake Default Audio Input',
        'llmConf': None,
        'autoScrollLiveSuggestions': True,
        'autoScrollActionSuggestions': True,
        'autoScrollTranscript': True,
        'showTranscriptPanel': True,
        'transcriptDockHeight': None,
        'professionalMode': False,
    }
    if config_extra:
        config.update(config_extra)

    return _STUB % (json.dumps(app_state), json.dumps(config))


# STATE is mutated in place and re-broadcast, which is what lets the video mode
# animate the panels the way a real session does. appState.get() resolves the
# same object, so it stays in step.
_STUB = """
(() => {
  const STATE = %s;
  const CONFIG = %s;
  const subs = [];
  const noop = () => {};
  const off = () => noop;
  const ok = (v) => () => Promise.resolve(v);

  window.__push = (patch) => {
    Object.assign(STATE, patch);
    subs.slice().forEach((cb) => { try { cb(STATE); } catch (e) {} });
  };

  const api = {
    platform: 'win32',
    isElectron: true,

    onHotkeyScroll: off,
    onHotkeyStopAssistant: off,
    onHotkeyToggleTranscript: off,
    onHotkeyToggleProfessionalMode: off,
    onPushNotification: off,
    onAppStateUpdated: (cb) => {
      subs.push(cb);
      setTimeout(() => cb(STATE), 0);
      return () => { const i = subs.indexOf(cb); if (i >= 0) subs.splice(i, 1); };
    },

    config:  { get: ok(CONFIG), update: ok(CONFIG) },
    auth:    { login: ok(true), logout: ok(true), signup: ok(true),
               sendVerificationCode: ok(true), verifyEmailCode: ok(true),
               changePassword: ok(true), forgotPassword: ok(true),
               verifyPasswordResetCode: ok(true), resetPassword: ok(true) },
    account: { get: ok({ fullName: 'Alex Morgan', profileData: '', context: '' }),
               update: ok(true), refresh: ok(true) },
    payment: { getPlans: ok([]), getCurrencies: ok([]), create: ok(null),
               getStatus: ok(null), getHistory: ok([]), getCredits: ok(STATE.credits) },
    llm:     { listModels: ok([]), validate: ok(true) },
    appState:{ get: ok(STATE), update: ok(STATE) },

    transcription: { clear: ok(true), start: ok(true), stop: ok(true), ingest: ok(true),
                     setSessionToken: ok(true), channelDisconnected: ok(true),
                     enableLoopbackAudio: ok(true), disableLoopbackAudio: ok(true) },
    liveSuggestion:   { clear: ok(true), stop: ok(true) },
    actionSuggestion: { clear: ok(true), stop: ok(true) },
    tools: { exportTranscript: ok(''), clearAll: ok(true),
             setPlaceholderData: ok(true), saveImage: ok(true) },
    autoUpdater: { checkForUpdates: ok(null), quitAndInstall: noop,
                   getVersion: ok('1.7.0'), onStatusUpdate: off },

    close: noop, minimize: noop, maximize: noop,
    // A multiplier, not a percentage - the control renders factor * 100.
    zoom: { increase: noop, decrease: noop, reset: noop, getFactor: ok(1), onChange: off },
    permissions: { checkAll: ok({ microphone: true, screen: true }),
                   requestMicrophone: ok(true), openSettings: ok(true), relaunch: ok(true) },

    openExternal: ok(true), openFile: ok(true), showInFolder: ok(true),
    setStealth: noop, toggleStealth: noop, toggleOpacity: noop,
    ping: noop,
  };

  window.electron = api;
  window.electronAPI = api;

  // Stealth is a body class the preload toggles, not only app state.
  if (STATE.isStealth) {
    const mark = () => document.body && document.body.classList.add('stealth');
    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', mark, { once: true });
    } else { mark(); }
  }
})();
"""

# Fake media devices, or useMediaDevices raises the "no microphone" badge on
# every shot - headless Chromium enumerates none.
LAUNCH_ARGS = ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream']

TRANSCRIPT_ONLY = dict(FULL, liveSuggestions=[], actionSuggestions=[])
LIVE_ONLY = dict(FULL, actionSuggestions=[])
IDLE = dict(EMPTY, runningState='idle')
STEALTH = dict(FULL, isStealth=True)

SHOTS = [
    # name,                   w,     h,  state,           theme,   config
    ('step-install',          800,  450, IDLE,            'light', None),
    ('step-context',          800,  450, TRANSCRIPT_ONLY, 'light', None),
    ('step-live',             800,  450, LIVE_ONLY,       'light', None),
    ('feature-export',       1600,  900, FULL,            'light', None),
    ('feature-stealth',      1600,  900, STEALTH,         'dark',  None),
    ('poster-live-interview', 1920, 1080, LIVE_ONLY,      'light', None),
    ('poster-coding-1',      1920, 1080, FULL,            'light', None),
    ('poster-coding-2',      1920, 1080, FULL,            'dark',  None),
    ('poster-coding-3',      1920, 1080, FULL,            'dark',  {'professionalMode': True}),
]


def shots(out):
    os.makedirs(out, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(args=LAUNCH_ARGS)
        for name, w, h, state, theme, cfg in SHOTS:
            ctx = browser.new_context(
                viewport={'width': w, 'height': h},
                device_scale_factor=1,
                color_scheme=theme,
            )
            ctx.grant_permissions(['microphone'])
            page = ctx.new_page()
            page.add_init_script(build_stub(state, cfg))
            errs = []
            page.on('pageerror', lambda e: errs.append(str(e)[:140]))
            page.goto(URL, wait_until='networkidle', timeout=45000)
            page.wait_for_timeout(2200)
            page.screenshot(path=os.path.join(out, name + '.png'))
            print('  %-24s %4dx%-5d %-5s%s' % (
                name, w, h, theme, ('  ERROR: ' + errs[0]) if errs else ''))
            ctx.close()
        browser.close()


# Each step is (delay_ms_before, state patch). Together they play a session the
# way it actually arrives: the interviewer speaks, a card goes pending, the
# answer streams in, then a screenshot solution lands.
def script_live():
    ts = [transcript(*t) for t in TRANSCRIPTS]
    partial = ANSWER[: ANSWER.index('From there:')]
    return [
        (1200, {'transcripts': ts[:1]}),
        (1600, {'transcripts': ts[:2]}),
        (1800, {'transcripts': ts}),
        (900, {'liveSuggestions': [live('', state='loading')]}),
        (1100, {'liveSuggestions': [live(partial, state='loading')]}),
        (1400, {'liveSuggestions': [live(ANSWER)]}),
        (2600, {'actionSuggestions': [action('', state='loading')]}),
        (1500, {'actionSuggestions': [action(CODE_ANSWER)]}),
        (3000, {}),
    ]


VIDEOS = [('demo-live-session', 1920, 1080, 'light', script_live)]


def videos(out):
    ffmpeg = shutil.which('ffmpeg')
    if not ffmpeg:
        sys.exit('ffmpeg not found on PATH - needed to convert Playwright webm to mp4')

    os.makedirs(out, exist_ok=True)
    raw = os.path.join(out, '_raw')
    os.makedirs(raw, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(args=LAUNCH_ARGS)
        for name, w, h, theme, script in VIDEOS:
            ctx = browser.new_context(
                viewport={'width': w, 'height': h},
                color_scheme=theme,
                record_video_dir=raw,
                record_video_size={'width': w, 'height': h},
            )
            ctx.grant_permissions(['microphone'])
            page = ctx.new_page()
            page.add_init_script(build_stub(EMPTY))
            page.goto(URL, wait_until='networkidle', timeout=45000)
            page.wait_for_timeout(1200)

            for delay, patch in script():
                page.wait_for_timeout(delay)
                if patch:
                    page.evaluate('(p) => window.__push(p)', patch)

            video = page.video
            ctx.close()  # the webm is only finalised on context close
            src = video.path()
            dst = os.path.join(out, name + '.mp4')
            subprocess.run(
                [ffmpeg, '-loglevel', 'error', '-y', '-i', src,
                 '-c:v', 'libx264', '-preset', 'slow', '-crf', '23',
                 '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', dst],
                check=True,
            )
            os.remove(src)
            print('  %-24s %4dx%-5d %6d KB' % (name, w, h, os.path.getsize(dst) // 1024))
        browser.close()

    shutil.rmtree(raw, ignore_errors=True)


if __name__ == '__main__':
    mode = sys.argv[1] if len(sys.argv) > 1 else 'shots'
    out = sys.argv[2] if len(sys.argv) > 2 else 'capture-out'
    if mode == 'shots':
        print('Screenshots ->', out)
        shots(out)
    elif mode == 'videos':
        print('Videos ->', out)
        videos(out)
    else:
        sys.exit('usage: capture.py [shots|videos] <out-dir>')
