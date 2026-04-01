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

let snoozeDebounce = false;
export function snooze() {
    if (snoozeDebounce) return;
    snoozeDebounce = true;
    
    // Disable button temporarily
    const btnSnooze = document.getElementById('btn-snooze');
    if (btnSnooze) {
        btnSnooze.disabled = true;
        btnSnooze.classList.add('opacity-50', 'cursor-not-allowed');
    }
    
    pushHistory();
    const state = getState();
    const d = state.data;
    if (d.snoozesUsedForCurrent >= 4) {
        snoozeDebounce = false;
        if (btnSnooze) {
            btnSnooze.disabled = false;
            btnSnooze.classList.remove('opacity-50', 'cursor-not-allowed');
        }
        return;
    }

    d.snoozesUsedForCurrent++;
    // Add 15 mins (15 * 60 * 1000)
    d.nextDoseScheduled += (15 * 60 * 1000);
    
    saveState();
    
    // Re-enable after 1.5 seconds
    setTimeout(() => {
        snoozeDebounce = false;
        if (btnSnooze) {
            btnSnooze.disabled = false;
            btnSnooze.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }, 1500);
}

export function checkReset() {
    const now = getNow();
    const state = getState();
    
    // Only auto-reset if enabled
    if (!state.settings.autoResetEnabled) return;
    
    const resetHour = state.settings.autoResetHour || 0;
    
    // Check if first dose time was before the reset hour today
    if (state.data.firstDoseTime) {
        const doseDate = new Date(state.data.firstDoseTime);
        const resetTimeToday = new Date(now);
        resetTimeToday.setHours(resetHour, 0, 0, 0);
        
        // If current time is past reset hour, and dose was taken before reset hour today,
        // or dose was taken on a different day, reset
        if (now >= resetTimeToday && doseDate < resetTimeToday) {
            manualResetDay();
        } else if (now.getFullYear() !== doseDate.getFullYear() ||
                   now.getMonth() !== doseDate.getMonth() ||
                   now.getDate() !== doseDate.getDate()) {
            // Different day entirely
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

export function resetDayFromButton() {
    
    // Confirm with the user before resetting
    if (typeof window !== 'undefined' && window.confirm) {
        const ok = window.confirm('Start a new day? This will reset all doses. Proceed?');
        if (!ok) return;
    }
    
    manualResetDay();
}
