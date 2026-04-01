# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PillPal is a single-page vanilla JavaScript web app for medication tracking. It uses **ES6 modules** with no build system—modules are imported directly in the browser.

**Note:** README.md is a public-facing project description. Module architecture and exports are documented inline below.

## Architecture Summary

- **Module system**: ES6 modules in `js_modules/` folder
- **Core module**: `state.js` manages all application state and localStorage persistence
- **Entry point**: `app.js` imports all modules, exposes functions on `window` object for HTML onclick handlers
- **Storage**: localStorage key is `'pillTrackerState'` (JSON object)
- **UI cycle**: updateUI() runs every 500ms via setInterval

### Critical Module Dependencies

```
app.js (coordinator)
├── state.js (core state + localStorage)
├── ui.js (depends on state.js)
├── actions.js (depends on state.js, scheduler.js)
├── scheduler.js (depends on state.js)
├── audio.js (depends on state.js)
├── watchdog.js (depends on state.js, scheduler.js, actions.js)
└── settings.js (depends on state.js, scheduler.js)
```

**Critical rule**: All state mutations must go through `setState()` and `saveState()` in state.js. This ensures localStorage stays in sync.

## Common Development Tasks

### Adding a New Feature

1. Identify which module(s) it belongs to (logic in actions.js, UI updates in ui.js, state in state.js)
2. Add the function to that module with proper exports
3. If it needs to be called from HTML buttons, expose it on `window` in app.js
4. Import the function in modules that depend on it
5. For state changes: always call `saveState()` at the end (this triggers localStorage + updateUI)

### Debugging State

```javascript
// In browser console:
localStorage.getItem('pillTrackerState') // View current state
JSON.parse(localStorage.getItem('pillTrackerState')) // Pretty view
// Clear everything:
localStorage.clear()
```

The watchdog (watchdog.js:runWatchdog) runs on startup to validate state integrity. If debugging state issues, check console logs and consider calling `runWatchdog()` manually.

### Testing Time-Dependent Logic

The `applyTimeOffset()` function in settings.js allows simulating time changes for testing. `getNow()` in state.js always uses this offset when calculating current time.

### Key Files to Understand Before Making Changes

- **state.js**: DEFAULT_STATE object defines entire app structure. Any new feature needing state must add properties here.
- **app.js**: Look here to see what functions are exposed to HTML. Modify if adding new buttons/onclick handlers.
- **ui.js**: Responsible for all DOM updates. Modify to change display logic.
- **actions.js**: User action handlers (takePill, snooze, etc). Add new user actions here.
- **scheduler.js**: Dose interval calculations. Complex logic—read comments before modifying.

## Module Responsibilities At A Glance

| Module | Purpose | Key Functions |
|--------|---------|---|
| state.js | State + localStorage | getState(), setState(), saveState(), pushHistory(), undoLastAction() |
| ui.js | DOM updates | updateUI(), updateLoadingText() |
| actions.js | User actions | takePill(), snooze(), checkReset(), manualResetDay(), confirmResetDay(), resetDayFromButton() |
| scheduler.js | Dose timing | calculateSchedule() |
| audio.js | Beeping | playBeep(), handleBeeping() |
| watchdog.js | State validation | runWatchdog() |
| settings.js | Settings UI | toggleSettings(), saveSettings(), applyTimeOffset(), hardReset() |
| app.js | Coordination | initializeApp() |

## Important Implementation Details

- **No build system**: All JS is vanilla. Uses Tailwind CSS (minified version).
- **HTML onclick handlers**: Functions must be on `window` object. See how actions are exposed in app.js. Exception: the main `#btn-take` button uses a click listener in initializeApp() and switches behavior via `data-action` attribute (`"pill"` vs `"reset"`).
- **History/Undo**: pushHistory() saves state snapshots. undoLastAction() restores. Limited to 5 snapshots (older entries are dropped).
- **Day reset logic**: checkReset() runs every 500ms and handles daily reset at midnight (respects time offset).
- **Beeping**: Handled by handleBeeping() which runs every 500ms. Uses Web Audio API for sound.
- **localStorage format**: Single JSON string stored at key 'pillTrackerState'. No backup—modifications are permanent.

## Testing Checklist When Adding Features

- State persists after refresh (check localStorage)
- UI updates reflect state changes (500ms cycle is running)
- Undo/history works if the feature is undoable
- Watchdog doesn't flag new state as invalid
- Time offset doesn't break the feature
- Edge cases handled (what if someone snoozes at midnight? Takes pill at 23:59:59?)
