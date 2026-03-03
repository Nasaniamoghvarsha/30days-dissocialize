package com.thirtydays.discipline

import android.accessibilityservice.AccessibilityService
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import org.json.JSONArray

class AppInterceptorService : AccessibilityService() {

    companion object {
        private const val TAG = "DisciplineInterceptor"
        private const val PREFS_FILE = "CapacitorStorage"

        // Keys — no _cap_ prefix (Capacitor v8 stores as-is)
        private const val KEY_MONITORED_APPS = "monitored_apps"
        private const val KEY_TIME_USED_SECONDS = "time_used_seconds"
        private const val KEY_DAILY_BUDGET = "daily_budget"
        private const val KEY_OVERLAY_TRIGGERED = "overlay_triggered"
        private const val KEY_OVERLAY_PACKAGE = "overlay_package"
        private const val KEY_HEARTBEAT = "accessibility_heartbeat"

        // Milestone tracking — controls WHEN to show the popup
        private const val KEY_LAST_MILESTONE = "intercept_milestone"
        // Emergency bypass — user chose to lose streak, no more popups today
        private const val KEY_EMERGENCY_BYPASS = "emergency_bypass_today"
    }

    private var activeAppStartTime: Long? = null
    private var currentMonitoredPackage: String? = null
    private val handler = Handler(Looper.getMainLooper())

    private val heartbeatRunnable: Runnable = object : Runnable {
        override fun run() {
            try {
                val prefs = getSharedPreferences(PREFS_FILE, Context.MODE_PRIVATE)
                prefs.edit().putLong(KEY_HEARTBEAT, System.currentTimeMillis()).apply()
            } catch (e: Exception) {
                Log.e(TAG, "Heartbeat write failed", e)
            }
            handler.postDelayed(this, 2000)
        }
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        Log.d(TAG, "=== Accessibility service connected ===")
        handler.post(heartbeatRunnable)

        val prefs = getSharedPreferences(PREFS_FILE, Context.MODE_PRIVATE)
        val apps = getMonitoredApps(prefs)
        Log.d(TAG, "Monitored apps: $apps (count: ${apps.size})")
        Log.d(TAG, "Current milestone: ${prefs.getString(KEY_LAST_MILESTONE, "none")}")
        Log.d(TAG, "Emergency bypass: ${prefs.getString(KEY_EMERGENCY_BYPASS, "false")}")
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null || event.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
        val packageName = event.packageName?.toString() ?: return

        val prefs = getSharedPreferences(PREFS_FILE, Context.MODE_PRIVATE)
        val monitoredApps = getMonitoredApps(prefs)

        // Save tracked time when LEAVING a monitored app
        if (currentMonitoredPackage != null && packageName != currentMonitoredPackage) {
            val startTime = activeAppStartTime
            if (startTime != null) {
                val timeSpentSeconds = (System.currentTimeMillis() - startTime) / 1000
                val existingSeconds = prefs.getString(KEY_TIME_USED_SECONDS, "0")?.toLongOrNull() ?: 0L
                val newTotal = existingSeconds + timeSpentSeconds
                prefs.edit().putString(KEY_TIME_USED_SECONDS, newTotal.toString()).apply()
                Log.d(TAG, "TIME SAVED: ${timeSpentSeconds}s for $currentMonitoredPackage | Total: ${newTotal}s (${newTotal / 60}m)")
            }
            activeAppStartTime = null
            currentMonitoredPackage = null
        }

        // Skip own package
        if (packageName == applicationContext.packageName) return

        val isMonitored = monitoredApps.contains(packageName)
        if (!isMonitored) return

        // ── MILESTONE-BASED INTERCEPTION ──────────────────────────────────
        // Only show popup at: first open, 50% budget used, 100% budget used
        // Otherwise, just track time silently.

        // Always start tracking time
        activeAppStartTime = System.currentTimeMillis()
        currentMonitoredPackage = packageName

        // Check if user already bypassed for today (emergency mode)
        val emergencyBypass = prefs.getString(KEY_EMERGENCY_BYPASS, "false") == "true"
        if (emergencyBypass) {
            Log.d(TAG, "Emergency bypass active — tracking silently: $packageName")
            return
        }

        // Calculate current usage state
        val timeUsedSeconds = prefs.getString(KEY_TIME_USED_SECONDS, "0")?.toLongOrNull() ?: 0L
        val budgetMinutes = prefs.getString(KEY_DAILY_BUDGET, "60")?.toIntOrNull() ?: 60
        val budgetSeconds = budgetMinutes * 60L
        val percentUsed = if (budgetSeconds > 0) (timeUsedSeconds.toDouble() / budgetSeconds * 100) else 100.0
        val currentMilestone = prefs.getString(KEY_LAST_MILESTONE, "none") ?: "none"

        Log.d(TAG, "Usage check: ${timeUsedSeconds}s / ${budgetSeconds}s (${percentUsed.toInt()}%) milestone=$currentMilestone")

        // Determine if we should intercept based on milestones
        val shouldIntercept = when {
            // First open of the day — always show
            currentMilestone == "none" -> {
                Log.d(TAG, ">>> MILESTONE: First open of the day")
                prefs.edit().putString(KEY_LAST_MILESTONE, "first").apply()
                true
            }
            // 50%+ used and haven't shown half warning yet
            percentUsed >= 50 && currentMilestone == "first" -> {
                Log.d(TAG, ">>> MILESTONE: 50% budget used")
                prefs.edit().putString(KEY_LAST_MILESTONE, "half").apply()
                true
            }
            // 100%+ used and haven't shown full warning yet
            percentUsed >= 100 && currentMilestone == "half" -> {
                Log.d(TAG, ">>> MILESTONE: Budget exhausted!")
                prefs.edit().putString(KEY_LAST_MILESTONE, "full").apply()
                true
            }
            // Budget exceeded and user keeps trying
            percentUsed >= 100 && currentMilestone == "full" -> {
                Log.d(TAG, ">>> MILESTONE: Still over budget — re-intercepting")
                true
            }
            else -> {
                Log.d(TAG, "No milestone hit — tracking silently: $packageName")
                false
            }
        }

        if (shouldIntercept) {
            // Trigger the overlay
            prefs.edit()
                .putString(KEY_OVERLAY_TRIGGERED, "true")
                .putString(KEY_OVERLAY_PACKAGE, packageName)
                .apply()

            val intent = Intent(this, MainActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
                putExtra("trigger_overlay", true)
                putExtra("overlay_package", packageName)
            }
            startActivity(intent)
        }
    }

    private fun getMonitoredApps(prefs: SharedPreferences): Set<String> {
        val json = prefs.getString(KEY_MONITORED_APPS, null)
        if (json.isNullOrBlank()) return emptySet()

        return try {
            val jsonArray = JSONArray(json)
            val result = mutableSetOf<String>()
            for (i in 0 until jsonArray.length()) {
                val pkg = jsonArray.getString(i).trim()
                if (pkg.isNotEmpty()) result.add(pkg)
            }
            result
        } catch (e: Exception) {
            Log.e(TAG, "Failed to parse monitored_apps", e)
            emptySet()
        }
    }

    override fun onInterrupt() {}

    override fun onDestroy() {
        super.onDestroy()
        handler.removeCallbacks(heartbeatRunnable)
    }
}
