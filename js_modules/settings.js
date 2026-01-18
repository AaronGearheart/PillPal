/**
 * Settings Module
 * Handles settings UI and configuration
 */

import { getState, saveState } from './state.js';
import { calculateSchedule } from './scheduler.js';

export function toggleSettings() {
    const state = getState();
    const el = document.getElementById('settings-overlay');
    el.classList.toggle('hidden');
    if(!el.classList.contains('hidden')) {
        // Populate inputs
        document.getElementById('set-doses').value = state.settings.totalDoses;
        // Convert endHour to HH:00 format for time input
        const endTimeStr = String(state.settings.endHour).padStart(2, '0') + ':00';
        document.getElementById('set-endtime').value = endTimeStr;
        document.getElementById('set-interval').value = state.settings.standardInterval;
        document.getElementById('set-min-interval').value = state.settings.minInterval;
        document.getElementById('set-step').value = state.settings.step;
        document.getElementById('set-beep-interval-1').value = state.settings.beepInterval1 || 1;
        document.getElementById('set-beep-interval-2').value = state.settings.beepInterval2 || 30;
    }
}

export function saveSettings() {
    const state = getState();
    state.settings.totalDoses = parseInt(document.getElementById('set-doses').value);
    // Extract hour from HH:MM format
    const endTimeInput = document.getElementById('set-endtime').value; // HH:MM
    const [endHour] = endTimeInput.split(':');
    state.settings.endHour = parseInt(endHour);
    state.settings.standardInterval = parseFloat(document.getElementById('set-interval').value);
    state.settings.minInterval = parseFloat(document.getElementById('set-min-interval').value);
    state.settings.step = parseFloat(document.getElementById('set-step').value);
    state.settings.beepInterval1 = parseInt(document.getElementById('set-beep-interval-1').value) || 2;
    state.settings.beepInterval2 = parseInt(document.getElementById('set-beep-interval-2').value) || 30;
    
    // Reset effective total temporarily so calculateSchedule can re-evaluate
    state.data.effectiveTotalDoses = state.settings.totalDoses;

    // Recalculate if in middle of day
    if (state.data.dosesTaken > 0) calculateSchedule();
    
    toggleSettings();
    saveState();
}

export function applyTimeOffset() {
    const state = getState();
    const input = document.getElementById('set-time-input').value; // HH:MM
    if (!input) return;
    const [h, m] = input.split(':');
    
    const nowReal = new Date();
    const desired = new Date();
    desired.setHours(h, m, 0, 0);
    
    state.data.timeOffset = desired.getTime() - nowReal.getTime();
    
    // Recalculate schedule if in middle of day to trigger proper state updates
    if (state.data.dosesTaken > 0 && state.data.dosesTaken < (state.data.effectiveTotalDoses || state.settings.totalDoses)) {
        calculateSchedule();
    }
    
    saveState();
}

export function clearTimeOffset() {
    const state = getState();
    state.data.timeOffset = 0;
    saveState();
}

export function hardReset() {
    if(confirm("Erase all settings completely?")) {
        localStorage.removeItem('pillTrackerState');
        location.reload();
    }
}
