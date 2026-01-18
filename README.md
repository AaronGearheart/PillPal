# JavaScript Modules Structure

This project has been refactored to use ES6 modules for better code organization and maintainability. All JavaScript modules are located in the `js_modules/` folder.

## Module Overview

### 📦 **state.js**
**Purpose:** Core state management and localStorage operations

**Exports:**
- `DEFAULT_STATE` - Initial application state
- `getState()` - Get current application state
- `setState()` - Set application state
- `saveState()` - Save state to localStorage
- `pushHistory()` - Save current state to history stack for undo
- `undoLastAction()` - Undo last action from history
- `getNow()` - Get current time adjusted for time offset

**Responsibilities:**
- Manages application state structure
- Handles localStorage persistence
- Provides undo/redo history
- Time offset calculations

---

### 🔊 **audio.js**
**Purpose:** Audio notifications and beeping logic

**Exports:**
- `playBeep()` - Play a single beep sound
- `handleBeeping()` - Manage beeping schedule when pills are due

**Responsibilities:**
- Creates buzzer sounds using Web Audio API
- Manages beeping intervals and patterns
- Handles different beep patterns (first minute vs after)

---

### 📅 **scheduler.js**
**Purpose:** Dose scheduling calculations

**Exports:**
- `calculateSchedule()` - Calculate optimal dosing schedule

**Responsibilities:**
- Calculates dose intervals based on remaining time
- Adjusts intervals when time is tight
- Reduces total doses if necessary to fit schedule
- Handles edge cases and time constraints

---

### 🐕 **watchdog.js**
**Purpose:** State integrity verification

**Exports:**
- `runWatchdog()` - Verify and correct state issues

**Responsibilities:**
- Validates state on page load
- Checks for data inconsistencies
- Corrects invalid values
- Handles day transitions
- Logs issues found

---

### ⚡ **actions.js**
**Purpose:** Core user actions

**Exports:**
- `takePill()` - Record taking a pill
- `snooze()` - Snooze next dose by 15 minutes
- `checkReset()` - Check if day should be reset
- `manualResetDay()` - Reset the day manually

**Responsibilities:**
- Handles pill taking logic
- Manages snooze functionality
- Resets daily state
- Updates completion status

---

### ⚙️ **settings.js**
**Purpose:** Settings management

**Exports:**
- `toggleSettings()` - Show/hide settings overlay
- `saveSettings()` - Save settings from form
- `applyTimeOffset()` - Apply manual time offset
- `clearTimeOffset()` - Clear time offset
- `hardReset()` - Complete data wipe

**Responsibilities:**
- Manages settings UI
- Validates and saves user preferences
- Handles time offset for testing
- Performs hard reset

---

### 🎨 **ui.js**
**Purpose:** User interface updates

**Exports:**
- `updateUI()` - Update all UI elements
- `updateLoadingText()` - Update loading screen text

**Responsibilities:**
- Updates clock and date displays
- Updates button states and text
- Manages eating panel colors
- Handles countdown timers
- Shows/hides badges and warnings

---

### 🚀 **app.js**
**Purpose:** Main application entry point

**Exports:**
- `initializeApp()` - Initialize and start the application

**Responsibilities:**
- Imports all other modules
- Exposes functions to global scope for HTML onclick handlers
- Initializes the application on page load
- Sets up main update interval
- Coordinates all modules

---

## Module Dependency Graph

```
app.js (entry point)
├── state.js (core state)
├── audio.js
│   └── state.js
├── scheduler.js
│   └── state.js
├── watchdog.js
│   ├── state.js
│   ├── scheduler.js
│   └── actions.js
├── actions.js
│   ├── state.js
│   └── scheduler.js
├── settings.js
│   ├── state.js
│   └── scheduler.js
└── ui.js
    └── state.js
```

## Usage in HTML

The modules are loaded using ES6 module syntax in the HTML:

```html
<script type="module" src="js_modules/app.js"></script>
```

This automatically loads all dependencies and initializes the application when the DOM is ready.

## Benefits of Modular Structure

1. **Separation of Concerns** - Each module has a clear, single responsibility
2. **Easier Debugging** - Problems are isolated to specific modules
3. **Better Testing** - Modules can be tested independently
4. **Improved Maintainability** - Changes to one module don't affect others
5. **Code Reusability** - Modules can be reused in other projects
6. **Cleaner Code** - No more massive inline scripts

## Development Notes

- All modules use ES6 `import`/`export` syntax
- Functions needed by HTML onclick handlers are exposed on the `window` object in app.js
- State is managed centrally through state.js
- UI updates are separated from business logic
- Audio and beeping logic is isolated in its own module

## Browser Compatibility

ES6 modules are supported in all modern browsers:
- Chrome 61+
- Firefox 60+
- Safari 11+
- Edge 16+

For older browser support, you would need to use a bundler like Webpack or Rollup.
