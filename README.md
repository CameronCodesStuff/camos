# CamOS v3.0

> A browser-based desktop OS. Still a work in progress.

---

**Password:** `1234` (or just press Enter)

---

## Apps

| App | What it does |
|-----|-------------|
| **Terminal** | Full shell — `ls`, `cd`, `cat`, `mkdir`, `touch`, `rm`, `echo`, `neofetch`, history with ↑↓ |
| **Browser** | Multi-tab browser with CORS proxy engine, download manager, search bar |
| **Notepad** | Editor with New / Save / Open / Find & Replace / word count |
| **System Info** | Live hardware stats, CPU meter, uptime |

---

## Browser

Pages are fetched via three proxies tried in sequence:

1. `corsproxy.io`
2. `allorigins.win`
3. `thingproxy.freeboard.io`

If all three fail, an error screen appears with an **Open in browser** button and a **Try download** option. The download manager (↓ icon in the toolbar) saves files via `Blob URL` — works for images, PDFs, ZIPs, audio, and more.

Tabs sit side by side in a scrollable strip. Click `+` for a new tab, click the `×` on any tab to close it.

---

## Keyboard Shortcuts

| Where | Key | Action |
|-------|-----|--------|
| Terminal | `↑` / `↓` | Navigate command history |
| Terminal | `Tab` | Insert two spaces |
| Browser URL bar | `Enter` | Navigate / search |
| Notepad | `Tab` | Indent two spaces |
| Any modal | `Enter` | Confirm |
| Any modal | `Esc` | Cancel |

---

## Customisation

**Wallpaper** — right-click the desktop or use Start → Change Wallpaper. Cycles through 7 gradients.

**Virtual filesystem** — files you create in Terminal or save from Notepad persist for the session and are accessible across both apps.

**Adding apps** — duplicate a `.win` block in `index.html`, add a matching `openApp` call, and wire up the logic in `script.js`.

---

## Built by Cameron

[github.com/CameronCodesStuff](https://github.com/CameronCodesStuff)
