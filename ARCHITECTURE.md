# PillTracker Module Architecture

## File Structure
```
PillTracker/
├── index.html                 # Main HTML file
├── js_modules/               # ES6 Module Folder
│   ├── app.js               # Main entry point & coordinator
│   ├── state.js             # State management & persistence
│   ├── audio.js             # Beeping & audio notifications
│   ├── scheduler.js         # Dose scheduling logic
│   ├── watchdog.js          # State integrity checker
│   ├── actions.js           # User actions (take pill, snooze)
│   ├── settings.js          # Settings management
│   ├── ui.js                # UI updates & display
│   └── README.md            # Module documentation
├── css/                      # Font Awesome styles
├── js/                       # Font Awesome scripts (legacy)
└── webfonts/                 # Font files
```

## Module Interaction Flow

### 1. Application Startup
```
index.html loads
    ↓
app.js (type="module")
    ↓
├── Imports all modules
├── Exposes functions to window
├── Calls initializeApp()
    ↓
    ├── runWatchdog() - Verify state
    ├── checkReset() - Check if day changed
    ├── updateUI() - Initial display
    └── setInterval() - 500ms updates
```

### 2. Taking a Pill
```
User clicks "Take Pill"
    ↓
takePill() in actions.js
    ↓
├── pushHistory() - Save for undo
├── Update timestamps
├── Increment dose count
├── calculateSchedule() - Reschedule
└── saveState() → updateUI()
```

### 3. State Flow
```
┌─────────────────────────────────────────┐
│          state.js (Core State)          │
│  ┌───────────────────────────────────┐  │
│  │ DEFAULT_STATE                     │  │
│  │ - settings: {...}                 │  │
│  │ - history: [...]                  │  │
│  │ - data: {...}                     │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
         ↕ (read/write)
┌─────────────────────────────────────────┐
│         localStorage                     │
│   Key: 'pillTrackerState'               │
└─────────────────────────────────────────┘
```

### 4. UI Update Cycle (Every 500ms)
```
setInterval(500ms)
    ↓
├── checkReset() → Check day change
├── updateUI() → Refresh display
│   ├── Update clock
│   ├── Update dose counter
│   ├── Update button states
│   └── Update eating panel
└── handleBeeping() → Check if beep needed
    └── playBeep() if due
```

## Key Functions by Purpose

### 📊 State Management
- `getState()`, `setState()`, `saveState()` - State CRUD
- `pushHistory()`, `undoLastAction()` - Undo functionality

### 🎯 Core Actions
- `takePill()` - Record dose taken
- `snooze()` - Delay next dose
- `checkReset()` - Daily reset check
- `manualResetDay()` - Force reset

### 📅 Scheduling
- `calculateSchedule()` - Optimize dose timing
- Handles interval reduction
- Drops doses if needed

### 🐕 Watchdog
- `runWatchdog()` - Verify state integrity
- Corrects invalid data
- Logs issues

### 🎨 UI
- `updateUI()` - Refresh all displays
- Manages button states
- Updates timers and colors

### 🔊 Audio
- `playBeep()` - Sound alert
- `handleBeeping()` - Beep scheduling

### ⚙️ Settings
- `toggleSettings()` - Show/hide panel
- `saveSettings()` - Persist preferences
- `applyTimeOffset()` - Testing feature

## Data Flow Example: Snoozing

```
1. User clicks Snooze button
   └─> onclick="snooze()" in HTML

2. snooze() in actions.js
   ├─> pushHistory() - Save current state
   ├─> Check snooze limit (max 4)
   ├─> Add 15 minutes to nextDoseScheduled
   └─> saveState()

3. saveState() in state.js
   ├─> Save to localStorage
   └─> Call updateUI()

4. updateUI() in ui.js
   ├─> Read state
   ├─> Update button text
   ├─> Update snooze counter
   └─> Refresh timers
```

## Benefits of This Architecture

✅ **Modularity** - Each file has a single, clear purpose  
✅ **Testability** - Functions can be tested independently  
✅ **Maintainability** - Easy to find and fix issues  
✅ **Scalability** - Easy to add new features  
✅ **Debugging** - Clear module boundaries help isolate bugs  
✅ **Reusability** - Modules can be used elsewhere  

## Migration from Inline Scripts

**Before:**
- 750+ lines of inline JavaScript in HTML
- Everything in global scope
- Hard to maintain and debug

**After:**
- Clean HTML with single module import
- 8 focused modules (~100-200 lines each)
- Clear separation of concerns
- Easy to navigate and maintain

## Adding New Features

To add a new feature:

1. Identify which module it belongs to
2. Add the function to that module
3. Export it if other modules need it
4. If needed by HTML, expose on `window` in app.js
5. Import in modules that use it

Example: Adding a "Skip Dose" feature
- Add `skipDose()` to [actions.js](js_modules/actions.js)
- Export it
- Expose on `window` in [app.js](js_modules/app.js)
- Call it from HTML button
