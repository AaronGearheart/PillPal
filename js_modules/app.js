/**
 * Main Application Module
 * Initializes and coordinates all modules
 */

import { saveState, undoLastAction } from './state.js';
import { handleBeeping } from './audio.js';
import { runWatchdog } from './watchdog.js';
import { takePill, snooze, checkReset, manualResetDay, confirmResetDay } from './actions.js';
import { toggleSettings, saveSettings, applyTimeOffset, clearTimeOffset, hardReset } from './settings.js';
import { updateUI, updateLoadingText } from './ui.js';

// Export functions to global scope for HTML onclick handlers
window.takePill = takePill;
window.snooze = snooze;
window.undoLastAction = () => {
    undoLastAction();
    updateUI();
};
window.manualResetDay = manualResetDay;
window.confirmResetDay = confirmResetDay;
window.toggleSettings = toggleSettings;
window.saveSettings = () => {
    saveSettings();
    updateUI();
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

// Initialize application
export function initializeApp() {
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
