/**
 * UI Module
 * Handles all UI updates and display logic
 */

import { getState, getNow, saveState } from './state.js';

export function updateUI() {
    const now = getNow();
    const state = getState();
    const d = state.data;
    const s = state.settings;

    // 1. Clock
    document.getElementById('clock-display').innerText = now.toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'});
    document.getElementById('date-display').innerText = now.toLocaleDateString([], {weekday: 'long', month: 'long', day: 'numeric'});

    // 2. Info Grid
    document.getElementById('interval-display').innerText = d.currentInterval + "h";
    const intervalBadgeEl = document.getElementById('reduced-interval-badge');
    if (d.currentInterval < s.standardInterval) {
        intervalBadgeEl.classList.remove('hidden');
        document.getElementById('interval-display').classList.add('text-red-400');
    } else {
        intervalBadgeEl.classList.add('hidden');
        document.getElementById('interval-display').classList.remove('text-red-400');
    }
    
    // Doses Display Logic
    // In fixed interval mode, always use totalDoses; in adaptive, use effectiveTotalDoses
    const effectiveTotal = s.intervalMode === 'fixed' ? s.totalDoses : (d.effectiveTotalDoses || s.totalDoses);
    const displayEl = document.getElementById('doses-display');
    const badgeEl = document.getElementById('reduced-badge');
    
    if (effectiveTotal < s.totalDoses) {
        displayEl.innerText = `${d.dosesTaken} / ${effectiveTotal}`;
        displayEl.classList.add('text-red-400');
        badgeEl.classList.remove('hidden');
        badgeEl.innerText = "Reduced";
    } else {
        displayEl.innerText = `${d.dosesTaken} / ${s.totalDoses}`;
        displayEl.classList.remove('text-red-400');
        badgeEl.classList.add('hidden');
    }
    
    let endDisp = s.endHour + ":00";
    if(s.endHour > 12) endDisp = (s.endHour - 12) + ":00 PM";
    
    // Show "N/A" if end time is disabled
    if (!s.useEndTime) {
        endDisp = "N/A (Disabled)";
    }
    
    document.getElementById('target-end-display').innerText = endDisp;

    // 3. Next Dose Calculation & Button State
    const btnTake = document.getElementById('btn-take');
    const btnSnooze = document.getElementById('btn-snooze');
    const nextDoseDisp = document.getElementById('next-dose-display');
    const nextEatDisp = document.getElementById('next-eat-display');
    const eatPanel = document.getElementById('eating-panel');
    const eatText = document.getElementById('eat-status-text');
    const eatTimer = document.getElementById('eat-timer-text');
    const oneHour = 60 * 60 * 1000;

    if (d.dosesTaken === 0) {
        // Not started yet
        nextDoseDisp.innerText = "--:--";
        nextDoseDisp.classList.remove('text-yellow-400');
        nextDoseDisp.classList.add('text-emerald-400');
        nextEatDisp.innerText = "--:--";
        nextEatDisp.classList.remove('text-emerald-400', 'text-red-400');
        nextEatDisp.classList.add('text-slate-500');
        
        btnTake.disabled = false;
        btnTake.innerText = "Take First Pill";
        btnTake.classList.remove('bg-slate-600', 'pulse-btn', 'bg-red-600');
        btnTake.classList.add('bg-emerald-600');
        btnTake.dataset.action = 'pill';
        
        btnSnooze.disabled = true;
        btnSnooze.innerHTML = `
            <div><i class="fa-solid fa-bed mr-2"></i>4 Snoozes (15m)</div>
        `;

        eatPanel.className = "p-6 rounded-2xl mb-6 text-center transition-colors duration-500 bg-emerald-600";
        eatText.innerText = "You Can Eat";
        eatTimer.innerText = "Timer starts after first pill";

    } else if (d.dosesTaken >= effectiveTotal) {
        // Done
        nextDoseDisp.innerText = "All Done";
        nextDoseDisp.classList.remove('text-emerald-400');
        nextDoseDisp.classList.add('text-yellow-400');
        
        // Show when can eat next (1h after last pill)
        let timeSinceLast = now.getTime() - d.lastDoseTime;
        if (timeSinceLast < oneHour) {
            // Still in 1h post-pill restriction
            let nextEatTime = new Date(d.lastDoseTime + oneHour);
            nextEatDisp.innerText = nextEatTime.toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'});
            nextEatDisp.classList.remove('text-slate-500', 'text-emerald-400');
            nextEatDisp.classList.add('text-red-400');
        } else {
            // Can eat now, no more doses today
            nextEatDisp.innerText = "--:--";
            nextEatDisp.classList.remove('text-red-400', 'text-emerald-400');
            nextEatDisp.classList.add('text-slate-500');
        }
        // If auto-reset is disabled, make button clickable to reset
        if (!s.autoResetEnabled) {
            btnTake.disabled = false;
            btnTake.innerText = "RESET DAY?";
            btnTake.classList.remove('bg-slate-600', 'bg-emerald-600');
            btnTake.classList.add('pulse-btn', 'bg-red-600');
            btnTake.dataset.action = 'reset'; // Use data attribute to track action
        } else {
            btnTake.disabled = true;
            btnTake.innerText = "ALL PILLS FINISHED";
            btnTake.classList.remove('bg-slate-600', 'pulse-btn', 'bg-red-600');
            btnTake.classList.add('bg-emerald-600');
            btnTake.dataset.action = 'none';
        }
        
        btnSnooze.disabled = true;
        btnSnooze.innerHTML = `
            <div><i class="fa-solid fa-bed mr-2"></i>4 Snoozes (15m)</div>
            <div class="text-4xl opacity-80 font-normal">All done</div>
        `;
        
        // Eat Check (1 hr after last pill)
        timeSinceLast = now.getTime() - d.lastDoseTime;
        
        if (timeSinceLast < oneHour) {
            eatPanel.className = "p-6 rounded-2xl mb-6 text-center transition-colors duration-500 bg-red-600";
            eatText.innerText = "No Protein";
            let minsLeft = Math.ceil((oneHour - timeSinceLast) / 60000);
            eatTimer.innerText = `Wait ${minsLeft} mins`;
        } else {
            eatPanel.className = "p-6 rounded-2xl mb-6 text-center transition-colors duration-500 bg-emerald-600";
            eatText.innerText = "Yes Protein";
            eatTimer.innerText = "All clear";
        }
        
        // Update Reset Day button if auto-reset is disabled
        updateResetDayButton(s.autoResetEnabled, true);

    } else {
        // In Progress
        let dueTime = new Date(d.nextDoseScheduled);
        nextDoseDisp.innerText = dueTime.toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'});
        nextDoseDisp.classList.add('text-yellow-400');
        
        // Calculate next eat time based on restrictions:
        // - Cannot eat for 1h AFTER taking a pill
        // - Cannot eat for 1h BEFORE the next scheduled pill
        let timeSinceLast = now.getTime() - d.lastDoseTime;
        let timeUntilNext = d.nextDoseScheduled - now.getTime();
        
        let canEatAfterLast = new Date(d.lastDoseTime + oneHour); // 1h after last pill
        let mustStopBeforeNext = new Date(d.nextDoseScheduled - oneHour); // 1h before next pill
        
        if (timeSinceLast < oneHour) {
            // Still in 1h post-pill restriction, can't eat yet
            // Show when the 1h post-pill window ends (but this might overlap with pre-pill restriction)
            nextEatDisp.innerText = canEatAfterLast.toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'});
            nextEatDisp.classList.remove('text-emerald-400', 'text-slate-500');
            nextEatDisp.classList.add('text-red-400');
        } else if (timeUntilNext <= oneHour && timeUntilNext > 0) {
            // In 1h pre-pill restriction zone, can't eat
            // Show when can eat again (1h AFTER the next pill)
            let canEatAfterNext = new Date(d.nextDoseScheduled + oneHour);
            nextEatDisp.innerText = canEatAfterNext.toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'});
            nextEatDisp.classList.remove('text-emerald-400', 'text-slate-500');
            nextEatDisp.classList.add('text-red-400');
        } else {
            // Can eat now! Clear the time
            nextEatDisp.innerText = "--:--";
            nextEatDisp.classList.remove('text-red-400', 'text-emerald-400');
            nextEatDisp.classList.add('text-slate-500');
        }

        // Button Logic
        if (now >= dueTime) {
            // DUE NOW
            btnTake.disabled = false;
            btnTake.innerText = "TAKE PILL";
            btnTake.classList.remove('bg-emerald-600', 'bg-slate-600', 'bg-slate-700', 'text-slate-500');
            btnTake.classList.add('pulse-btn', 'bg-red-600');
            btnTake.dataset.action = 'pill';
            
            // Allow snoozing even when pill is due
            if (d.snoozesUsedForCurrent >= 4) {
                btnSnooze.disabled = true;
                btnSnooze.innerHTML = `
                    <div><i class="fa-solid fa-bed mr-2"></i>No Snoozes (15m)</div>
                `;
            } else {
                btnSnooze.disabled = false;
                btnSnooze.innerHTML = `
                    <div><i class="fa-solid fa-bed mr-2"></i>${4 - d.snoozesUsedForCurrent} Snoozes (15m)</div>
                `;
            }
        } else {
            // WAITING
            btnTake.disabled = true;
            // Calculate time left
            let diffMins = Math.ceil((dueTime - now) / 60000);
            let hours = Math.floor(diffMins / 60);
            let mins = diffMins % 60;
            btnTake.innerText = `Wait ${hours}h ${mins}m`;
            btnTake.classList.remove('pulse-btn', 'bg-red-600', 'bg-emerald-600', 'bg-slate-700', 'text-slate-500');
            btnTake.classList.add('bg-slate-600');
            btnTake.dataset.action = 'none';

            // Snooze Logic - Enable snoozing when waiting
            if (d.snoozesUsedForCurrent >= 4) {
                btnSnooze.disabled = true;
                btnSnooze.innerHTML = `
                    <div><i class="fa-solid fa-bed mr-2"></i>No Snoozes (15m)</div>
                `;
            } else {
                btnSnooze.disabled = false;
                btnSnooze.innerHTML = `
                    <div><i class="fa-solid fa-bed mr-2"></i>${4 - d.snoozesUsedForCurrent} Snoozes (15m)</div>
                `;
            }
        }

        // Eating Logic
        // Forbidden: 1h after Last Dose OR 1h before Next Dose
        let isForbidden = false;
        let reason = "";

        if (timeSinceLast < oneHour) {
            isForbidden = true;
            let m = Math.ceil((oneHour - timeSinceLast)/60000);
            reason = `Wait ${m}m (Post-pill)`;
        } else if (timeUntilNext < oneHour && timeUntilNext > 0) {
            isForbidden = true;
            let m = Math.ceil(timeUntilNext/60000);
            reason = `Wait ${m}m (Pre-pill)`;
        }

        if (isForbidden) {
            eatPanel.className = "p-6 rounded-2xl mb-6 text-center transition-colors duration-500 bg-red-600";
            eatText.innerText = "No Protein";
            eatTimer.innerText = reason;
        } else {
            eatPanel.className = "p-6 rounded-2xl mb-6 text-center transition-colors duration-500 bg-emerald-600";
            eatText.innerText = "Yes Protein";
            
            // Show when next forbidden zone starts
            // It starts 1h before next dose
            let forbiddenStart = d.nextDoseScheduled - oneHour;
            let minsUntilForbidden = Math.ceil((forbiddenStart - now.getTime()) / 60000);
            
            if (minsUntilForbidden > 0) {
                let h = Math.floor(minsUntilForbidden / 60);
                let m = minsUntilForbidden % 60;
                eatTimer.innerText = `You have ${h}h ${m}m left`;
            } else {
                // Should technically be caught by logic above, but fallback
                eatTimer.innerText = "All clear";
            }
        }
    }
    
    // Update Reset Day button based on state and settings
    const isDayCompleted = d.dosesTaken >= effectiveTotal;
    updateResetDayButton(s.autoResetEnabled, isDayCompleted);
}

export function updateLoadingText(newText) {
    const splashText = document.getElementById('loading-splash-text');
    if (splashText) {
        splashText.innerText = newText;
    }
}

function updateResetDayButton(autoResetEnabled, isDayCompleted) {
    const resetBtn = document.getElementById('btn-reset-day');
    if (!resetBtn) return;
    
    // Always keep it as normal state - main button handles day completion reset
    resetBtn.classList.remove('bg-red-600', 'hover:bg-red-500', 'pulse-btn');
    resetBtn.classList.add('bg-red-700', 'hover:bg-red-600');
    resetBtn.innerHTML = `
        <span class="text-sm block"><i class="fa-solid fa-exclamation mr-2"></i>Reset Day</span>
        <span class="text-sm">Reset Day In Case Of Application Error</span>
    `;
}
