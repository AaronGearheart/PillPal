/**
 * State Management Module
 * Handles application state, localStorage, and history management
 */

export const DEFAULT_STATE = {
    settings: {
        // Mode settings
        intervalMode: 'fixed', // 'fixed' or 'adaptive'
        
        // Basic settings
        totalDoses: 4,
        endHour: 22,
        useEndTime: false, // If false, no end time constraint
        standardInterval: 4,
        
        // Adaptive mode settings (hidden when intervalMode === 'fixed')
        minInterval: 2,
        step: 0.5,
        allowDoseReduction: true, // If false, won't drop doses
        minDoses: 4, // Minimum doses to take (only used if allowDoseReduction is true)
        
        // Auto-reset settings
        autoResetEnabled: false, // Whether to automatically reset the day
        autoResetHour: 0, // Hour (0-23) to automatically reset the day
        
        // Beep settings
        beepInterval1: 1,  // First minute: beep every N seconds
        beepInterval2: 30  // After 1 minute: beep every N seconds
    },
    history: [], // Stack for Undo
    data: {
        dosesTaken: 0,
        lastDoseTime: null, // timestamp
        firstDoseTime: null, // timestamp of the first dose of the day
        nextDoseScheduled: null, // timestamp
        currentInterval: 4,
        snoozesUsedForCurrent: 0,
        timeOffset: 0, // ms difference
        dayCompleted: false,
        effectiveTotalDoses: 4 // Stores the max achievable doses
    }
};

let state = JSON.parse(localStorage.getItem('pillTrackerState')) || JSON.parse(JSON.stringify(DEFAULT_STATE));

export function getState() {
    return state;
}

export function setState(newState) {
    state = newState;
}

export function saveState() {
    localStorage.setItem('pillTrackerState', JSON.stringify(state));
}

export function pushHistory() {
    // limit history stack to 5
    if (state.history.length > 5) state.history.shift();
    // Deep copy current data to history
    state.history.push(JSON.parse(JSON.stringify(state.data)));
}

let undoDebounce = false;
export function undoLastAction() {
    if (undoDebounce) return;
    if (state.history.length === 0) return;
    
    undoDebounce = true;
    
    // Disable button temporarily
    const btnUndo = document.getElementById('btn-undo');
    if (btnUndo) {
        btnUndo.disabled = true;
        btnUndo.classList.add('opacity-50', 'cursor-not-allowed');
    }
    
    state.data = state.history.pop();
    saveState();
    
    // Re-enable after 1.5 seconds
    setTimeout(() => {
        undoDebounce = false;
        if (btnUndo) {
            btnUndo.disabled = false;
            btnUndo.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }, 1500);
}

export function getNow() {
    return new Date(Date.now() + state.data.timeOffset);
}
