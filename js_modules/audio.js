/**
 * Audio Module
 * Handles beeping and audio notifications
 */

import { getState, getNow } from './state.js';

let beepStartTime = null; // When beeping should start (when pill is due)
let lastBeepCount = 0; // Track how many beeps in current sequence

// Reuse a single AudioContext to avoid creating many contexts
let _audioCtx = null;

function getAudioContext() {
    if (!_audioCtx) {
        _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return _audioCtx;
}

// Play a longer, alarm-like beep. durationMs defaults to ~1.2s.
export function playBeep(durationMs = 220) {
    const audioContext = getAudioContext();
    const now = audioContext.currentTime;
    const duration = Math.max(50, durationMs) / 1000; // seconds

    // Gentle timbre: sine + triangle, lower volume
    const osc1 = audioContext.createOscillator();
    const osc2 = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();

    osc1.type = 'sine';
    osc2.type = 'triangle';
    osc1.frequency.value = 440; // A4, pleasant
    osc2.frequency.value = 660; // minor harmonic

    filter.type = 'lowpass';
    filter.frequency.value = 3500;

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(audioContext.destination);

    // Gentle envelope: very quick attack, short sustain, short release
    const attack = 0.005;
    const release = Math.min(0.06, duration * 0.3);
    const sustainEnd = now + duration - release;

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.25, now + attack);
    gain.gain.setValueAtTime(0.25, sustainEnd);
    gain.gain.exponentialRampToValueAtTime(0.0001, sustainEnd + release);

    // Small frequency wobble for a softer, natural sound
    osc1.frequency.setValueAtTime(430, now);
    osc1.frequency.exponentialRampToValueAtTime(450, sustainEnd);
    osc2.frequency.setValueAtTime(650, now);
    osc2.frequency.exponentialRampToValueAtTime(670, sustainEnd);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(sustainEnd + release + 0.02);
    osc2.stop(sustainEnd + release + 0.02);
}

export function handleBeeping() {
    const now = getNow();
    const state = getState();
    
    // Check if a pill is currently due
    const d = state.data;
    if (d.dosesTaken === 0 || d.dosesTaken >= (d.effectiveTotalDoses || state.settings.totalDoses)) {
        beepStartTime = null;
        lastBeepCount = 0;
        return; // Not in active dosing period
    }
    
    // Check if due
    if (d.nextDoseScheduled && now >= new Date(d.nextDoseScheduled)) {
        if (!beepStartTime) {
            beepStartTime = now.getTime();
            lastBeepCount = 0;
        }
        
        const elapsedMs = now.getTime() - beepStartTime;
        const elapsedSecs = elapsedMs / 1000;
        const interval1 = state.settings.beepInterval1 || 2; // First minute interval
        const interval2 = state.settings.beepInterval2 || 30; // After first minute interval
        
        // First minute: beep at interval1 seconds
        if (elapsedSecs < 60) {
            const beepsExpected = Math.floor(elapsedSecs / interval1) + 1;
            if (beepsExpected > lastBeepCount) {
                // Longer single alarm-like beep during first minute
                playBeep(1000);
                lastBeepCount = beepsExpected;
            }
        } else {
            // After first minute: play a short sequence of longer alarm beeps
            const beepsInFirstMin = Math.floor(60 / interval1);
            const timeAfterMin = elapsedSecs - 60;
            const sequencesAfterMin = Math.floor(timeAfterMin / interval2) + 1;
            const totalBeepsExpected = beepsInFirstMin + (sequencesAfterMin * 3);

            if (totalBeepsExpected > lastBeepCount) {
                // Play 3 alarm-style beeps in sequence (non-overlapping)
                playBeep(1200);
                setTimeout(() => playBeep(1200), 600);
                setTimeout(() => playBeep(1200), 1300);
                lastBeepCount = totalBeepsExpected;
            }
        }
    } else {
        // Not due anymore
        beepStartTime = null;
        lastBeepCount = 0;
    }
}
