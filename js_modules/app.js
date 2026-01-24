/**
 * Main Application Module
 * Initializes and coordinates all modules
 */

import { getState, saveState, undoLastAction } from './state.js';
import { handleBeeping } from './audio.js';
import { runWatchdog } from './watchdog.js';
import { takePill, snooze, checkReset, manualResetDay, confirmResetDay, resetDayFromButton } from './actions.js';
import { toggleSettings, saveSettings, applyTimeOffset, clearTimeOffset, hardReset, updateSettingsVisibility } from './settings.js';
import { updateUI, updateLoadingText } from './ui.js';

// Export functions to global scope for HTML onclick handlers
window.takePill = () => {
    takePill();
    updateUI();
};
window.snooze = () => {
    snooze();
    updateUI();
};
window.undoLastAction = () => {
    undoLastAction();
    updateUI();
};
window.manualResetDay = manualResetDay;
window.confirmResetDay = confirmResetDay;
window.resetDayFromButton = resetDayFromButton;
window.toggleSettings = toggleSettings;
window.saveSettings = () => {
    saveSettings();
    // Immediate UI update to sync button state with new settings
    setTimeout(() => updateUI(), 10);
};
window.applyTimeOffset = () => {
    applyTimeOffset();
    updateUI();
};
window.clearTimeOffset = () => {
    clearTimeOffset();
    updateUI();
};
window.hardReset = hardReset;
window.updateLoadingText = updateLoadingText;
window.updateSettingsVisibility = updateSettingsVisibility;

// Initialize application
export function initializeApp() {
    // Add single click handler for take pill button
    const btnTake = document.getElementById('btn-take');
    if (btnTake) {
        btnTake.addEventListener('click', function() {
            const action = this.dataset.action;
            // Safety check: Don't allow taking pill if day is complete
            if (action === 'pill') {
                const state = getState();
                const effectiveTotal = state.data.effectiveTotalDoses || state.settings.totalDoses;
                // Only allow if we haven't reached the limit
                if (state.data.dosesTaken < effectiveTotal) {
                    takePill();
                    updateUI();
                }
            } else if (action === 'reset') {
                resetDayFromButton();
            }
        });
    }
    
    // Run watchdog on startup to verify state integrity
    runWatchdog();
    checkReset();
    updateUI();
    
    // Hide loading screen after initial UI update completes
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.animation = 'fade-out 0.5s ease-in-out forwards';
    }
    
    // Main update interval - check twice per second for responsive audio
    setInterval(() => {
        checkReset();
        updateUI();
        handleBeeping();
    }, 500);
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
