/**
 * Actions Module
 * Core user actions like taking pills, snoozing, and resetting
 */

import { getState, getNow, saveState, pushHistory, DEFAULT_STATE } from './state.js';
import { calculateSchedule } from './scheduler.js';

export function takePill() {
    pushHistory();
    const now = getNow();
    const state = getState();
    const d = state.data;

    // 1. Record Time
    d.lastDoseTime = now.getTime();
    
    // 2. If first dose, set start of day
    if (d.dosesTaken === 0) {
        d.firstDoseTime = now.getTime();
    }

    // 3. Increment Count
    d.dosesTaken++;

    // 4. Reset Snoozes for next round
    d.snoozesUsedForCurrent = 0;

    // 5. Calculate Schedule for remaining
    calculateSchedule();

    saveState();
}

export function snooze() {
    pushHistory();
    const state = getState();
    const d = state.data;
    if (d.snoozesUsedForCurrent >= 4) return;

    d.snoozesUsedForCurrent++;
    // Add 15 mins (15 * 60 * 1000)
    d.nextDoseScheduled += (15 * 60 * 1000);
    
    saveState();
}

export function checkReset() {
    const now = getNow();
    const state = getState();
    // Reset at 12am (00:00)
    // Check if first dose time was "yesterday"
    if (state.data.firstDoseTime) {
        const doseDate = new Date(state.data.firstDoseTime);
        if (now.getDate() !== doseDate.getDate()) {
            manualResetDay();
        }
    }
}

export function manualResetDay() {
    const state = getState();
    state.data = JSON.parse(JSON.stringify(DEFAULT_STATE.data));
    // Keep time offset though
    const oldOffset = JSON.parse(localStorage.getItem('pillTrackerState'))?.data?.timeOffset || 0;
    state.data.timeOffset = oldOffset;
    saveState();
}

export function confirmResetDay() {
    // Confirm with the user before resetting; push history for undo
    if (typeof window !== 'undefined' && window.confirm) {
        const ok = window.confirm('Reset day? This will clear doses taken for today. Proceed?');
        if (!ok) return;
    }
    manualResetDay();
}
