/**
 * Scheduler Module
 * Handles dose scheduling and interval calculations
 */

import { getState, getNow } from './state.js';

export function calculateSchedule() {
    const now = getNow();
    const state = getState();
    const s = state.settings;
    const d = state.data;

    // If we haven't started yet, interval is standard
    if (d.dosesTaken === 0) {
        d.currentInterval = s.standardInterval;
        d.nextDoseScheduled = null; // Next dose is NOW (whenever he clicks)
        d.effectiveTotalDoses = s.totalDoses; // Reset to default
        return;
    }

    // Logic: We have taken at least 1 pill.
    // Remaining doses needed
    let dosesRemaining = s.totalDoses - d.dosesTaken;
    
    if (dosesRemaining <= 0) {
        d.dayCompleted = true;
        return;
    }

    // Create a date object for the Target End Time (Today at Hour N)
    let endTimeDate = new Date(d.firstDoseTime); 
    endTimeDate.setHours(s.endHour, 0, 0, 0);

    // Time remaining until the hard stop
    // NOTE: We calculate from LAST DOSE TIME. 
    let timeRemainingMs = endTimeDate.getTime() - d.lastDoseTime;
    let timeRemainingHours = timeRemainingMs / (1000 * 60 * 60);

    // Try to fit remaining doses
    let proposedInterval = s.standardInterval;
    
    let fits = false;
    while(proposedInterval >= s.minInterval) {
        if (proposedInterval * dosesRemaining <= timeRemainingHours) {
            fits = true;
            break;
        }
        proposedInterval -= s.step;
    }

    if (fits) {
        d.currentInterval = proposedInterval;
        d.effectiveTotalDoses = s.totalDoses;
    } else {
        // If it doesn't fit even at min interval, we must drop a dose
        d.currentInterval = s.minInterval;
        
        // Calculate capacity: how many intervals of 'minInterval' fit in 'timeRemaining'?
        let maxFutureDoses = Math.floor(timeRemainingHours / s.minInterval);
        
        // Effective total is what we have taken + what we CAN take
        let newTotal = d.dosesTaken + maxFutureDoses;
        
        // Clamp it so it doesn't exceed original total (though 'fits' check handles that)
        // and doesn't drop below taken (impossible unless time travel)
        d.effectiveTotalDoses = Math.min(newTotal, s.totalDoses);
    }

    // Set next dose time based on last dose + interval
    // Always recalculate to handle manual time changes
    d.nextDoseScheduled = d.lastDoseTime + (d.currentInterval * 60 * 60 * 1000);
}
