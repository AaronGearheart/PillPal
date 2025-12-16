import time
import threading
from datetime import datetime, timedelta
from flask import Flask, render_template_string, redirect, url_for

# --- 1. Configuration Variables (Customizable) ---
# All time units are in hours (virtual) unless otherwise noted.
CONFIG = {
    # Simulation Speed: 1 virtual hour = 3 real seconds (Updated as requested)
    "VIRTUAL_HOUR_TO_REAL_SECOND": 3600,
    "TOTAL_DOSES": 4,

    # Time Constraints (in virtual hours)
    "MIN_INTERVAL_INITIAL": 4.0,       # Base interval: 4 hours
    "EATING_FORBIDDEN_DURATION": 1.0,  # 1 hour before and 1 hour after pill

    # Snooze Parameters (in virtual hours)
    "MAX_SNOOZE_TOTAL": 1.0,           # Max total snooze time per cycle (1 hour)
    "SNOOZE_INCREMENT": 0.25,          # Snooze step (15 minutes)

    # Deadline Parameters (in virtual hours)
    "FORCED_END_TIME_HOUR": 24,        # 12:00 AM (Midnight, end of day)
    "ADAPTIVE_STEP": 0.5,              # Compression step (30 minutes)
}

# --- 2. Pill Tracker Class (State and Logic) ---

class PillTracker:
    def __init__(self, config):
        self.config = config
        self.running = True
        # Store initial time for reset functionality
        self.initial_virtual_time = datetime(2025, 12, 16, 8, 0, 0)
        self._reset_state()

        # Status indicators (initialized by _reset_state, kept here for clarity)
        self.alarm_active = False
        self.eating_forbidden = False
        self.status_message = "System Initialized."
        self.start_time_real = time.time()

        # Start the clock thread
        threading.Thread(target=self._scheduler_loop, daemon=True).start()

    def _get_time_after(self, start_time, hours):
        """Helper to advance time by a number of virtual hours."""
        return start_time + timedelta(hours=hours)

    def _reset_state(self):
        """Rerests all time and dose-related variables to initial values."""
        self.virtual_time = self.initial_virtual_time
        self.last_pill_time = None
        self.next_pill_time = None
        self.eating_forbidden_until = None
        self.current_dose = 0
        self.current_interval = self.config["MIN_INTERVAL_INITIAL"]
        self.snooze_remaining = self.config["MAX_SNOOZE_TOTAL"]
        self.alarm_active = False
        self.eating_forbidden = False
        self.status_message = "Simulation Reset. Click 'Take Pill' to start the cycle."

    def reset(self):
        """Public method to reset the entire simulation state."""
        self._reset_state()

    def manual_advance(self, hours):
        """Manually advances the virtual clock by a given number of hours."""
        if hours <= 0:
            self.status_message = "Cannot advance by zero or negative time."
            return
        
        # Advance virtual time
        self.virtual_time = self._get_time_after(self.virtual_time, hours)
        
        # Run state checks immediately to reflect the jump
        self._run_scheduler_checks()

        new_status = f"Virtual clock advanced by **{hours} hour(s)** to {self.virtual_time.strftime('%I:%M %p')}."
        # If the alarm is active due to the advance, the alarm message takes precedence
        if self.alarm_active:
             self.status_message = f"**ALARM!** Time to take Dose {self.current_dose + 1}! ({new_status})"
        elif not self.eating_forbidden:
             self.status_message = new_status


    def _update_scheduling(self):
        """
        Adapts the pill interval to ensure all doses are completed by the deadline.
        This runs after every dose or snooze.
        """
        remaining_doses = self.config["TOTAL_DOSES"] - self.current_dose
        if remaining_doses <= 0:
            self.status_message = "All doses completed for the day!"
            self.next_pill_time = None
            return

        # Determine the end of the day (e.g., Midnight)
        end_of_day = self.virtual_time.replace(hour=0, minute=0, second=0) + \
                     timedelta(hours=self.config["FORCED_END_TIME_HOUR"])
        
        # Determine how many more intervals are needed (including the current one)
        total_intervals_needed = self.config["TOTAL_DOSES"] - self.current_dose + 1
        
        # Calculate the maximum time allowed for the remaining doses
        max_time_allowed = end_of_day - self.last_pill_time
        
        # Calculate the required interval to finish exactly at the deadline
        if total_intervals_needed > 0 and max_time_allowed.total_seconds() > 0:
            required_interval_seconds = max_time_allowed.total_seconds() / total_intervals_needed
            required_interval_hours = required_interval_seconds / 3600.0
        else:
            # Fallback for boundary cases
            required_interval_hours = self.config["MIN_INTERVAL_INITIAL"]

        # If the required interval is significantly less than the current, adapt
        if required_interval_hours < self.current_interval - 0.01:
            # Compress the current interval using the defined step size (e.g., 0.5h)
            new_interval = self.current_interval
            while new_interval > required_interval_hours:
                new_interval -= self.config["ADAPTIVE_STEP"]
                if new_interval < 2.0: # Enforce a minimum interval
                    new_interval = 2.0
                    break
            
            # Apply the new interval and update status
            if new_interval < self.current_interval:
                self.current_interval = new_interval
                self.status_message = f"Interval compressed to **{self.current_interval:.2f} hours** to meet the deadline."

        # Set the next scheduled pill time
        self.next_pill_time = self._get_time_after(self.last_pill_time, self.current_interval)
        
        # Reset snooze only if a new cycle is starting (after a pill)
        if self.alarm_active is False and self.current_dose > 0:
             self.snooze_remaining = self.config["MAX_SNOOZE_TOTAL"]

    def take_pill(self):
        """Action: User takes a pill."""
        if self.current_dose >= self.config["TOTAL_DOSES"]:
            self.status_message = "All doses complete. Great job!"
            return
        
        # Only allow taking the pill if it's the first dose or the alarm is active (due time reached)
        if self.current_dose > 0 and not self.alarm_active:
            self.status_message = f"Dose {self.current_dose + 1} is not due yet. Wait until **{self.next_pill_time.strftime('%I:%M %p')}**."
            return

        # If this is the first pill, the last_pill_time is the current virtual time
        if self.current_dose == 0:
            self.last_pill_time = self.virtual_time
        
        self.current_dose += 1
        self.last_pill_time = self.virtual_time
        self.alarm_active = False # Turn off alarm
        
        # Set new eating forbidden period: 1 hour AFTER the pill
        self.eating_forbidden_until = self._get_time_after(self.virtual_time, self.config["EATING_FORBIDDEN_DURATION"])
        self.eating_forbidden = True
        
        if self.current_dose < self.config["TOTAL_DOSES"]:
            self._update_scheduling()
            self.status_message = f"Dose {self.current_dose} taken at {self.virtual_time.strftime('%I:%M %p')}. Next pill due at **{self.next_pill_time.strftime('%I:%M %p')}** (Interval: {self.current_interval:.2f}h)."
        else:
            self.status_message = "All doses completed for the day!"
            self.next_pill_time = None
            self.eating_forbidden = True # Keep indicator on until 1h after last pill.

    def snooze(self):
        """Action: User snoozes the next pill time."""
        if not self.next_pill_time or self.current_dose >= self.config["TOTAL_DOSES"]:
            self.status_message = "Cannot snooze, no next dose scheduled."
            return

        if self.snooze_remaining < self.config["SNOOZE_INCREMENT"]:
            self.status_message = "Maximum snooze time for this cycle has been used (1 hour total)."
            return

        # Delay the next pill time
        snooze_time = self.config["SNOOZE_INCREMENT"]
        self.next_pill_time = self._get_time_after(self.next_pill_time, snooze_time)
        self.snooze_remaining -= snooze_time
        self.alarm_active = False # Turn off alarm if it was active
        
        self.status_message = f"Snoozed for {snooze_time*60:.0f} mins. New next pill time: **{self.next_pill_time.strftime('%I:%M %p')}**. Snooze remaining: {self.snooze_remaining*60:.0f} mins."
        # Update scheduling immediately after snoozing to check for deadline violations
        self._update_scheduling()

    def _run_scheduler_checks(self):
        """Checks the alarm and eating forbidden status based on current virtual time."""
        
        # 2. Check for ALARM
        if self.next_pill_time and self.virtual_time >= self.next_pill_time:
            # If the user has snoozed beyond the max, stop further snoozing checks
            if self.snooze_remaining <= 0 and self.alarm_active:
                # Critical overdue status
                self.status_message = f"**CRITICAL!** Dose {self.current_dose + 1} is severely delayed and cannot be snoozed further. Take it NOW!"
            else:
                self.alarm_active = True
                # Only update the message if it's not already in critical state
                if not self.status_message.startswith("**CRITICAL!"):
                    self.status_message = f"**ALARM!** Time to take Dose {self.current_dose + 1}!"
        
        # 3. Check for EATING FORBIDDEN (POST-PILL)
        if self.eating_forbidden_until and self.virtual_time >= self.eating_forbidden_until:
            self.eating_forbidden = False
            self.eating_forbidden_until = None
            # Check for pre-pill warning immediately after post-pill window closes
            if self.next_pill_time and not self.alarm_active:
                 self._check_pre_pill_forbidden()

        # 4. Check for EATING FORBIDDEN (PRE-PILL)
        elif self.next_pill_time and not self.alarm_active:
            self._check_pre_pill_forbidden()


    def _scheduler_loop(self):
        """The main simulation thread."""
        while self.running:
            # Wait for the virtual hour to pass in real-time
            time.sleep(self.config["VIRTUAL_HOUR_TO_REAL_SECOND"])
            
            # 1. Advance the virtual time by 1 hour
            self.virtual_time = self._get_time_after(self.virtual_time, 1.0)

            # --- State Checks ---
            self._run_scheduler_checks()


    def _check_pre_pill_forbidden(self):
        """Checks and sets the eating forbidden status for the 1 hour before the next pill."""
        if not self.next_pill_time:
            return

        pre_pill_forbidden_start = self._get_time_after(self.next_pill_time, -self.config["EATING_FORBIDDEN_DURATION"])
        
        if self.virtual_time >= pre_pill_forbidden_start and self.virtual_time < self.next_pill_time and not self.eating_forbidden:
            self.eating_forbidden = True
            # Set forbidden until time to the next pill time for display
            self.eating_forbidden_until = self.next_pill_time
            self.status_message = f"**WARNING!** Do not eat. Pill is due at {self.next_pill_time.strftime('%I:%M %p')}."
        elif self.virtual_time < pre_pill_forbidden_start and self.eating_forbidden and self.eating_forbidden_until == self.next_pill_time:
            # If the next pill time was snoozed outside the 1-hour window, clear the pre-pill warning
            self.eating_forbidden = False
            self.eating_forbidden_until = None
            self.status_message = f"Safe to eat. Next pill due at {self.next_pill_time.strftime('%I:%M %p')}."


# --- 3. Flask Application Setup ---

app = Flask(__name__)
tracker = PillTracker(CONFIG)

# HTML Template
HTML_TEMPLATE = """
<!doctype html>
<title>Pill Tracker Simulator</title>
<meta http-equiv="refresh" content="{{ refresh_rate }}">
<style>
    body { font-family: 'Inter', sans-serif; max-width: 700px; margin: 40px auto; padding: 20px; background-color: #f4f7f9; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    h1, h2 { color: #2c3e50; font-weight: 600; }
    .status-box { 
        border: 2px solid #ddd; 
        padding: 20px; 
        margin: 20px 0; 
        border-radius: 10px; 
        transition: all 0.3s ease;
        background-color: white;
    }
    .alarm { background-color: #ffebee; border-color: #e74c3c; box-shadow: 0 0 15px rgba(231, 76, 60, 0.5); }
    .forbidden { background-color: #fff8e1; border-color: #f39c12; }
    .success { background-color: #e8f5e9; border-color: #27ae60; }
    
    .light { 
        display: inline-block; 
        width: 25px; 
        height: 25px; 
        border-radius: 50%; 
        margin-right: 15px; 
        border: 2px solid #ccc; 
        transition: all 0.3s ease;
    }
    .light.on-alarm { background-color: #e74c3c; border-color: #c0392b; box-shadow: 0 0 8px #e74c3c; }
    .light.on-food { background-color: #f39c12; border-color: #e67e22; box-shadow: 0 0 8px #f39c12; }
    .light.off { background-color: #ecf0f1; border-color: #bdc3c7; }

    .button-container { display: flex; gap: 15px; margin-top: 20px; }
    .button-container button { 
        padding: 12px 25px; 
        font-size: 16px; 
        font-weight: bold;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        transition: transform 0.1s;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        white-space: nowrap; /* Prevent button text from wrapping */
    }
    .button-container button:active { transform: translateY(2px); box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    
    .pill-btn { background-color: #2ecc71; color: white; }
    .snooze-btn { background-color: #3498db; color: white; }
    .reset-btn { background-color: #34495e; color: white; }
    .advance-btn { background-color: #9b59b6; color: white; }

    
    strong { font-weight: 700; }
    em { font-style: normal; color: #2980b9; }
</style>

<body>
<h1>💊 Adaptive Pill Tracker Demo</h1>

<div class="status-box">
    <h2>Clock Status (3s = 1h)</h2>
    <p><strong>Virtual Time:</strong> <code>{{ tracker.virtual_time.strftime('%I:%M:%S %p') }}</code></p>
    <p><strong>Doses Taken:</strong> {{ tracker.current_dose }} of {{ tracker.config['TOTAL_DOSES'] }}</p>
</div>

<div class="status-box {% if tracker.alarm_active %}alarm{% elif tracker.eating_forbidden %}forbidden{% elif tracker.current_dose >= tracker.config['TOTAL_DOSES'] %}success{% endif %}">
    <h2>Current Cycle Status</h2>
    <p><strong>Next Dose Due:</strong> 
        {% if tracker.next_pill_time %}
            <strong style="color: #e74c3c;">{{ tracker.next_pill_time.strftime('%I:%M %p') }}</strong>
            <span style="font-size: small;"> (Interval: {{ "%.2f"|format(tracker.current_interval) }} hours)</span>
        {% else %}
            N/A (All doses taken)
        {% endif %}
    </p>
    <p><strong>Snooze Available:</strong> {{ "%.0f"|format(tracker.snooze_remaining*60) }} minutes</p>
    <p><strong>System Message:</strong> <em>{{ tracker.status_message | safe }}</em></p>
</div>

<div class="status-box">
    <h2>Device Indicators (Digital Lights)</h2>
    <p>
        <strong>Alarm Indicator:</strong> 
        <span class="light {% if tracker.alarm_active %}on-alarm{% else %}off{% endif %}"></span>
        {% if tracker.alarm_active %}<strong style="color: #e74c3c;">ACTIVE</strong>{% else %}Silent{% endif %}
    </p>
    <p>
        <strong>🍽️ No Eating Light:</strong> 
        <span class="light {% if tracker.eating_forbidden %}on-food{% else %}off{% endif %}"></span>
        {% if tracker.eating_forbidden %}ON (Forbidden until: {{ tracker.eating_forbidden_until.strftime('%I:%M %p') if tracker.eating_forbidden_until else 'N/A' }}){% else %}OFF (Safe to eat){% endif %}
    </p>
</div>

<div class="button-container">
    <form method="POST" action="{{ url_for('take_pill') }}">
        <button type="submit" class="pill-btn" 
            {% if tracker.current_dose >= tracker.config['TOTAL_DOSES'] or (tracker.current_dose > 0 and not tracker.alarm_active) %}disabled{% endif %}>
            💊 Take Pill (Dose {{ tracker.current_dose + 1 }})
        </button>
    </form>
    <form method="POST" action="{{ url_for('snooze') }}">
        <button type="submit" class="snooze-btn" {% if tracker.current_dose >= tracker.config['TOTAL_DOSES'] or not tracker.next_pill_time or tracker.snooze_remaining < tracker.config['SNOOZE_INCREMENT'] %}disabled{% endif %}>
            💤 Snooze ({{ "%.0f"|format(tracker.config['SNOOZE_INCREMENT']*60) }} min)
        </button>
    </form>
</div>

<!-- Manual Control Buttons -->
<div class="button-container" style="margin-top: 15px;">
    <form method="POST" action="{{ url_for('advance') }}">
        <button type="submit" class="advance-btn">⏩ Advance 1 Virtual Hour</button>
    </form>
    <form method="POST" action="{{ url_for('reset_app') }}">
        <button type="submit" class="reset-btn">🔄 Reset Simulation</button>
    </form>
</div>

<p style="margin-top: 20px; font-size: 0.8em; color: #7f8c8d;">
    <em>Note: The page refreshes automatically every {{ refresh_rate }} second(s) to show clock changes.</em>
</p>
</body>
"""

@app.route('/')
def index():
    # Calculate refresh rate based on simulation speed (1s minimum)
    refresh_rate = max(1, tracker.config["VIRTUAL_HOUR_TO_REAL_SECOND"])
    
    return render_template_string(HTML_TEMPLATE, tracker=tracker, refresh_rate=refresh_rate)

@app.route('/take_pill', methods=['POST'])
def take_pill():
    tracker.take_pill()
    return redirect(url_for('index'))

@app.route('/snooze', methods=['POST'])
def snooze():
    tracker.snooze()
    return redirect(url_for('index'))

@app.route('/advance', methods=['POST'])
def advance():
    """Route to manually advance the clock by 1 hour."""
    tracker.manual_advance(1.0)
    return redirect(url_for('index'))

@app.route('/reset', methods=['POST'])
def reset_app():
    """Route to reset the entire simulation state."""
    tracker.reset()
    return redirect(url_for('index'))

if __name__ == '__main__':
    # Initial trigger removed. The user must now click 'Take Pill' to start the cycle.
    
    # Run the Flask app on the main thread (use_reloader=False is crucial for threading)
    # Port 8080 used to avoid conflicts.
    app.run(debug=False, use_reloader=False, host='0.0.0.0', port=8080)