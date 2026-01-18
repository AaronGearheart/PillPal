/**
 * State Management Module
 * Handles application state, localStorage, and history management
 */

export const DEFAULT_STATE = {
    settings: {
        totalDoses: 4,
        endHour: 22,
        standardInterval: 4,
        minInterval: 2,
        step: 0.5,
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

export function undoLastAction() {
    if (state.history.length === 0) return;
    state.data = state.history.pop();
    saveState();
}

export function getNow() {
    return new Date(Date.now() + state.data.timeOffset);
}
