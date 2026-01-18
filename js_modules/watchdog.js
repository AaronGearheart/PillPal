/**
 * Watchdog Module
 * Verifies state integrity and corrects issues on page load
 */

import { getState, getNow, saveState, DEFAULT_STATE } from './state.js';
import { calculateSchedule } from './scheduler.js';
import { manualResetDay } from './actions.js';

export function runWatchdog() {
    const now = getNow();
    const state = getState();
    const d = state.data;
    const s = state.settings;
    let watchdogIssuesFound = [];

    // 1. Verify day hasn't changed - if so, reset
    if (d.firstDoseTime) {
        const doseDate = new Date(d.firstDoseTime);
        if (now.getDate() !== doseDate.getDate()) {
            watchdogIssuesFound.push("Day changed - resetting state");
            manualResetDay();
            return; // Exit after reset
        }
    }

    // 2. Verify dosesTaken is valid
    if (d.dosesTaken < 0) {
        watchdogIssuesFound.push("Invalid dosesTaken (negative) - resetting to 0");
        d.dosesTaken = 0;
    }
    if (d.dosesTaken > s.totalDoses) {
        watchdogIssuesFound.push("dosesTaken exceeds totalDoses - capping at totalDoses");
        d.dosesTaken = s.totalDoses;
    }

    // 3. Verify timestamps are valid
    if (d.lastDoseTime && typeof d.lastDoseTime !== 'number') {
        watchdogIssuesFound.push("Invalid lastDoseTime format - clearing");
        d.lastDoseTime = null;
    }
    if (d.firstDoseTime && typeof d.firstDoseTime !== 'number') {
        watchdogIssuesFound.push("Invalid firstDoseTime format - clearing");
        d.firstDoseTime = null;
    }

    // 4. Verify timestamps are not in the future (more than 1 hour ahead)
    const oneHour = 60 * 60 * 1000;
    if (d.lastDoseTime && d.lastDoseTime > now.getTime() + oneHour) {
        watchdogIssuesFound.push("lastDoseTime is far in the future - resetting");
        d.lastDoseTime = null;
    }
    if (d.firstDoseTime && d.firstDoseTime > now.getTime() + oneHour) {
        watchdogIssuesFound.push("firstDoseTime is far in the future - resetting");
        d.firstDoseTime = null;
    }

    // 5. Verify nextDoseScheduled is valid
    if (d.nextDoseScheduled && typeof d.nextDoseScheduled !== 'number') {
        watchdogIssuesFound.push("Invalid nextDoseScheduled format - will recalculate");
        d.nextDoseScheduled = null;
    }

    // 6. Verify snoozesUsedForCurrent doesn't exceed maximum
    if (d.snoozesUsedForCurrent > 4) {
        watchdogIssuesFound.push("snoozesUsedForCurrent exceeds 4 - capping at 4");
        d.snoozesUsedForCurrent = 4;
    }
    if (d.snoozesUsedForCurrent < 0) {
        watchdogIssuesFound.push("snoozesUsedForCurrent is negative - resetting to 0");
        d.snoozesUsedForCurrent = 0;
    }

    // 7. Verify effectiveTotalDoses exists and is reasonable
    if (d.effectiveTotalDoses === undefined || d.effectiveTotalDoses === null) {
        watchdogIssuesFound.push("effectiveTotalDoses not set - using totalDoses");
        d.effectiveTotalDoses = s.totalDoses;
    }
    if (d.effectiveTotalDoses < d.dosesTaken) {
        watchdogIssuesFound.push("effectiveTotalDoses < dosesTaken - adjusting");
        d.effectiveTotalDoses = d.dosesTaken;
    }

    // 8. Verify currentInterval is reasonable
    if (d.currentInterval < s.minInterval || d.currentInterval > s.standardInterval) {
        if (d.dosesTaken === 0) {
            // Not started, use standard
            d.currentInterval = s.standardInterval;
            watchdogIssuesFound.push("currentInterval invalid (not started) - reset to standardInterval");
        } else {
            // In progress, recalculate
            watchdogIssuesFound.push("currentInterval invalid (in progress) - will recalculate");
            d.currentInterval = s.standardInterval; // Will be overwritten by calculateSchedule
        }
    }

    // 9. Verify dayCompleted flag matches reality
    const effectiveTotal = d.effectiveTotalDoses || s.totalDoses;
    if (d.dayCompleted && d.dosesTaken < effectiveTotal) {
        watchdogIssuesFound.push("dayCompleted is true but doses incomplete - fixing flag");
        d.dayCompleted = false;
    }
    if (!d.dayCompleted && d.dosesTaken >= effectiveTotal && d.dosesTaken > 0) {
        watchdogIssuesFound.push("Day is complete but flag not set - setting flag");
        d.dayCompleted = true;
    }

    // 10. Verify timeOffset is reasonable (not more than 24 hours)
    const maxOffsetMs = 24 * 60 * 60 * 1000;
    if (Math.abs(d.timeOffset) > maxOffsetMs) {
        watchdogIssuesFound.push("timeOffset exceeds 24 hours - clearing");
        d.timeOffset = 0;
    }

    // 11. Verify consistency: if dosesTaken > 0, should have lastDoseTime and firstDoseTime
    if (d.dosesTaken > 0 && !d.firstDoseTime) {
        watchdogIssuesFound.push("dosesTaken > 0 but no firstDoseTime - resetting day");
        manualResetDay();
        return;
    }
    if (d.dosesTaken > 0 && !d.lastDoseTime) {
        watchdogIssuesFound.push("dosesTaken > 0 but no lastDoseTime - resetting day");
        manualResetDay();
        return;
    }

    // 12. Recalculate schedule if in active dosing period
    if (d.dosesTaken > 0 && d.dosesTaken < effectiveTotal) {
        const prevInterval = d.currentInterval;
        const prevNextDose = d.nextDoseScheduled;
        
        calculateSchedule();

        if (prevInterval !== d.currentInterval || prevNextDose !== d.nextDoseScheduled) {
            watchdogIssuesFound.push("Schedule recalculated after watchdog check");
        }
    }

    // 13. Verify history array integrity
    if (!Array.isArray(state.history)) {
        watchdogIssuesFound.push("history is not an array - resetting");
        state.history = [];
    }

    // Log watchdog results
    if (watchdogIssuesFound.length > 0) {
        console.warn("🐕 WATCHDOG: Issues found and corrected:", watchdogIssuesFound);
        saveState(); // Save corrected state
    } else {
        console.log("✅ WATCHDOG: All states verified and correct");
    }

    return watchdogIssuesFound;
}
