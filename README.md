# PillPal

> Don't forget your meds. Again.

A personal medication tracking web app built for people who need a big, obvious, hard-to-ignore UI telling them when to take their pills — and when they're allowed to eat.

---

## What It Does

- Giant clock. You will always know what time it is.
- Tracks your daily doses with a configurable maximum per day
- Calculates optimal dose intervals based on how much time is left in the day
- Eating window tracker — shows whether you can eat right now, and when that changes
- Buzzes at you (audibly) when a dose is due
- Snooze a dose by 15 minutes when you're not ready
- Undo button — because accidents happen
- Resets automatically at midnight
- Everything persists across refreshes (localStorage, no server needed)

---

## Getting Started

PillPal uses ES6 modules, which means it **cannot be opened as a plain file** (`file://`) due to browser CORS restrictions. You need to run it through a local dev server.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended)

### Install & Run

```bash
npm install
npm run dev
```

Then open the URL Vite gives you (usually `http://localhost:5173`).

### Build for Production

```bash
npm run build
npm run preview
```

---

## Tech Stack

| Thing | What |
|---|---|
| JavaScript | Vanilla ES6 modules, no framework |
| CSS | Tailwind CSS v4 |
| Icons | Font Awesome 6 |
| Audio | Web Audio API |
| Build | Vite 6 |
| Storage | localStorage (no backend) |

---

## Browser Support

Any modern browser with ES6 module support:

- Chrome 61+
- Firefox 60+
- Safari 11+
- Edge 16+

---

## License

Copyright &copy; 2026 Jett Stauver. All rights reserved.

This software and its source code are proprietary and confidential. No part of this project — including but not limited to the source code, design, logic, or assets — may be copied, modified, distributed, sublicensed, or used in any form without the express written permission of the author.

**This is not open source software.**

Font Awesome icons are used under their respective license. See [LICENSE.txt](LICENSE.txt) for details.
