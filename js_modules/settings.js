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
        document.getElementById('set-interval-mode').value = state.settings.intervalMode || 'fixed';
        document.getElementById('set-doses').value = state.settings.totalDoses;
        
        // End time toggle
        document.getElementById('set-use-endtime').checked = state.settings.useEndTime || false;
        const endTimeStr = String(state.settings.endHour).padStart(2, '0') + ':00';
        document.getElementById('set-endtime').value = endTimeStr;
        
        // Standard interval
        document.getElementById('set-interval').value = state.settings.standardInterval;
        
        // Adaptive mode settings
        document.getElementById('set-min-interval').value = state.settings.minInterval;
        document.getElementById('set-step').value = state.settings.step;
        document.getElementById('set-allow-dose-reduction').checked = state.settings.allowDoseReduction !== false;
        document.getElementById('set-min-doses').value = state.settings.minDoses || state.settings.totalDoses;
        
        // Auto-reset settings
        document.getElementById('set-auto-reset-enabled').checked = state.settings.autoResetEnabled || false;
        const resetHourStr = String(state.settings.autoResetHour || 0).padStart(2, '0') + ':00';
        document.getElementById('set-reset-hour').value = resetHourStr;
        
        // Beep settings
        document.getElementById('set-beep-interval-1').value = state.settings.beepInterval1 || 1;
        document.getElementById('set-beep-interval-2').value = state.settings.beepInterval2 || 30;
        
        // Show/hide adaptive settings based on mode
        updateSettingsVisibility();
    }
}

export function saveSettings() {
    const state = getState();
    
    // Mode settings
    state.settings.intervalMode = document.getElementById('set-interval-mode').value;
    
    // Basic settings
    state.settings.totalDoses = parseInt(document.getElementById('set-doses').value);
    state.settings.useEndTime = document.getElementById('set-use-endtime').checked;
    
    // Extract hour from HH:MM format for end time
    const endTimeInput = document.getElementById('set-endtime').value;
    const [endHour] = endTimeInput.split(':');
    state.settings.endHour = parseInt(endHour);
    
    state.settings.standardInterval = parseFloat(document.getElementById('set-interval').value);
    
    // Adaptive mode settings
    state.settings.minInterval = parseFloat(document.getElementById('set-min-interval').value);
    state.settings.step = parseFloat(document.getElementById('set-step').value);
    state.settings.allowDoseReduction = document.getElementById('set-allow-dose-reduction').checked;
    state.settings.minDoses = parseInt(document.getElementById('set-min-doses').value);
    
    // Auto-reset settings
    state.settings.autoResetEnabled = document.getElementById('set-auto-reset-enabled').checked;
    const resetHourInput = document.getElementById('set-reset-hour').value;
    const [resetHour] = resetHourInput.split(':');
    state.settings.autoResetHour = parseInt(resetHour);
    
    // Beep settings
    state.settings.beepInterval1 = parseInt(document.getElementById('set-beep-interval-1').value) || 2;
    state.settings.beepInterval2 = parseInt(document.getElementById('set-beep-interval-2').value) || 30;
    
    // Reset effective total temporarily so calculateSchedule can re-evaluate
    state.data.effectiveTotalDoses = state.settings.totalDoses;

    // Recalculate if in middle of day
    if (state.data.dosesTaken > 0) calculateSchedule();
    
    // After recalculate, ensure effectiveTotalDoses doesn't exceed the new totalDoses
    if (state.data.effectiveTotalDoses > state.settings.totalDoses) {
        state.data.effectiveTotalDoses = state.settings.totalDoses;
    }
    
    toggleSettings();
    saveState();
}

export function updateSettingsVisibility() {
    const mode = document.getElementById('set-interval-mode').value;
    const adaptiveSection = document.getElementById('adaptive-settings-section');
    const endTimeInput = document.getElementById('set-endtime');
    const useEndTime = document.getElementById('set-use-endtime').checked;
    
    // Show/hide adaptive settings
    if (mode === 'adaptive') {
        adaptiveSection.classList.remove('hidden');
    } else {
        adaptiveSection.classList.add('hidden');
    }
    
    // Enable/disable end time input
    endTimeInput.disabled = !useEndTime;
    if (!useEndTime) {
        endTimeInput.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
        endTimeInput.classList.remove('opacity-50', 'cursor-not-allowed');
    }
    
    // Show/hide min doses based on dose reduction setting
    const minDosesRow = document.getElementById('min-doses-row');
    const allowReduction = document.getElementById('set-allow-dose-reduction').checked;
    if (allowReduction && mode === 'adaptive') {
        minDosesRow.classList.remove('hidden');
    } else {
        minDosesRow.classList.add('hidden');
    }
    
    // Enable/disable reset hour based on auto-reset enabled
    const resetHourInput = document.getElementById('set-reset-hour');
    const autoResetEnabled = document.getElementById('set-auto-reset-enabled').checked;
    resetHourInput.disabled = !autoResetEnabled;
    if (!autoResetEnabled) {
        resetHourInput.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
        resetHourInput.classList.remove('opacity-50', 'cursor-not-allowed');
    }
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
