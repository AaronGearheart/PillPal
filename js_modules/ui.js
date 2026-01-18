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
    const effectiveTotal = d.effectiveTotalDoses || s.totalDoses;
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
        nextDoseDisp.innerText = "Ready to Start";
        nextDoseDisp.classList.remove('text-yellow-400');
        nextDoseDisp.classList.add('text-emerald-400');
        nextEatDisp.innerText = "--:--";
        nextEatDisp.classList.remove('text-emerald-400', 'text-red-400');
        nextEatDisp.classList.add('text-slate-500');
        
        btnTake.disabled = false;
        btnTake.innerText = "Take First Pill";
        btnTake.classList.remove('bg-slate-600', 'pulse-btn', 'bg-red-600');
        btnTake.classList.add('bg-emerald-600');
        
        btnSnooze.disabled = true;
        btnSnooze.innerHTML = `
            <div><i class="fa-solid fa-bed mr-2"></i>Snooze (+15m)</div>
            <div class="text-sm opacity-80 font-normal">Not active yet</div>
        `;

        // Eating: Always allowed before start? Assuming yes until 1h before first pill... 
        // but we don't know when first pill is until he hits it. So Eat is GREEN.
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
            let nextEatTime = new Date(d.lastDoseTime + oneHour);
            nextEatDisp.innerText = nextEatTime.toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'});
            nextEatDisp.classList.remove('text-slate-500');
            nextEatDisp.classList.add('text-red-400');
        } else {
            nextEatDisp.innerText = "Now";
            nextEatDisp.classList.remove('text-slate-500', 'text-red-400');
            nextEatDisp.classList.add('text-emerald-400');
        }
        btnTake.disabled = true;
        btnTake.innerText = "ALL PILLS FINISHED";
        btnTake.classList.remove('bg-slate-600', 'pulse-btn', 'bg-red-600');
        btnTake.classList.add('bg-emerald-600');
        
        btnSnooze.disabled = true;
        btnSnooze.innerHTML = `
            <div><i class="fa-solid fa-bed mr-2"></i>Snooze (+15m)</div>
            <div class="text-sm opacity-80 font-normal">All done</div>
        `;
        
        // Eat Check (1 hr after last pill)
        timeSinceLast = now.getTime() - d.lastDoseTime;
        
        if (timeSinceLast < oneHour) {
            eatPanel.className = "p-6 rounded-2xl mb-6 text-center transition-colors duration-500 bg-red-600";
            eatText.innerText = "Do Not Eat";
            let minsLeft = Math.ceil((oneHour - timeSinceLast) / 60000);
            eatTimer.innerText = `Wait ${minsLeft} mins`;
        } else {
            eatPanel.className = "p-6 rounded-2xl mb-6 text-center transition-colors duration-500 bg-emerald-600";
            eatText.innerText = "You Can Eat";
            eatTimer.innerText = "All clear";
        }

    } else {
        // In Progress
        let dueTime = new Date(d.nextDoseScheduled);
        nextDoseDisp.innerText = dueTime.toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'});
        nextDoseDisp.classList.add('text-yellow-400');
        
        // Calculate next eat time
        let timeSinceLast = now.getTime() - d.lastDoseTime;
        let timeUntilNext = d.nextDoseScheduled - now.getTime();

        // Next eat is either 1h after last dose or 1h before next dose, whichever comes first
        let nextEatTime = new Date(d.lastDoseTime + oneHour);
        let stopEatTime = new Date(d.nextDoseScheduled - oneHour);
        
        if (timeSinceLast < oneHour) {
            // Still in post-pill zone, can't eat
            nextEatDisp.innerText = nextEatTime.toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'});
            nextEatDisp.classList.remove('text-emerald-400', 'text-slate-500');
            nextEatDisp.classList.add('text-red-400');
        } else if (timeUntilNext < oneHour && timeUntilNext > 0) {
            // In pre-pill zone, can't eat - show same as next dose
            nextEatDisp.innerText = dueTime.toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'});
            nextEatDisp.classList.remove('text-emerald-400', 'text-slate-500');
            nextEatDisp.classList.add('text-red-400');
        } else {
            // Can eat now
            let forbiddenStart = new Date(d.nextDoseScheduled - oneHour);
            nextEatDisp.innerText = forbiddenStart.toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'});
            nextEatDisp.classList.remove('text-red-400', 'text-slate-500');
            nextEatDisp.classList.add('text-emerald-400');
        }

        // Button Logic
        if (now >= dueTime) {
            // DUE NOW
            btnTake.disabled = false;
            btnTake.innerText = "TAKE PILL";
            btnTake.classList.remove('bg-emerald-600', 'bg-slate-600', 'bg-slate-700', 'text-slate-500');
            btnTake.classList.add('pulse-btn', 'bg-red-600');
            
            // Allow snoozing even when pill is due
            if (d.snoozesUsedForCurrent >= 4) {
                btnSnooze.disabled = true;
                btnSnooze.innerHTML = `
                    <div><i class="fa-solid fa-bed mr-2"></i>Snooze (+15m)</div>
                    <div class="text-sm opacity-80 font-normal">No snoozes left</div>
                `;
            } else {
                btnSnooze.disabled = false;
                btnSnooze.innerHTML = `
                    <div><i class="fa-solid fa-bed mr-2"></i>Snooze (+15m)</div>
                    <div class="text-sm opacity-80 font-normal">${4 - d.snoozesUsedForCurrent} left for this dose</div>
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

            // Snooze Logic - Enable snoozing when waiting
            if (d.snoozesUsedForCurrent >= 4) {
                btnSnooze.disabled = true;
                btnSnooze.innerHTML = `
                    <div><i class="fa-solid fa-bed mr-2"></i>Snooze (+15m)</div>
                    <div class="text-sm opacity-80 font-normal">No snoozes left</div>
                `;
            } else {
                btnSnooze.disabled = false;
                btnSnooze.innerHTML = `
                    <div><i class="fa-solid fa-bed mr-2"></i>Snooze (+15m)</div>
                    <div class="text-sm opacity-80 font-normal">${4 - d.snoozesUsedForCurrent} left for this dose</div>
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
            let m = Math.ceil(timeUntilNext/60000); // Actually, we stop 1h BEFORE. 
            reason = `Stop Eating (Pre-pill)`;
        }

        if (isForbidden) {
            eatPanel.className = "p-6 rounded-2xl mb-6 text-center transition-colors duration-500 bg-red-600";
            eatText.innerText = "Do Not Eat";
            eatTimer.innerText = reason;
        } else {
            eatPanel.className = "p-6 rounded-2xl mb-6 text-center transition-colors duration-500 bg-emerald-600";
            eatText.innerText = "You Can Eat";
            
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
                eatTimer.innerText = "Almost time to stop";
            }
        }
    }
}

export function updateLoadingText(newText) {
    const splashText = document.getElementById('loading-splash-text');
    if (splashText) {
        splashText.innerText = newText;
    }
}
