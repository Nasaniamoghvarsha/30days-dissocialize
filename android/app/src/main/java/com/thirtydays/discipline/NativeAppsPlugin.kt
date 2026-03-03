package com.thirtydays.discipline

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.provider.Settings
import android.util.Log
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import org.json.JSONArray

@CapacitorPlugin(name = "NativeApps")
class NativeAppsPlugin : Plugin() {

    companion object {
        private const val TAG = "NativeAppsPlugin"
        private const val PREFS_FILE = "CapacitorStorage"

        // Keys WITHOUT _cap_ prefix — Capacitor v8 stores keys as-is
        private const val KEY_MONITORED_APPS = "monitored_apps"
        private const val KEY_TIME_USED_SECONDS = "time_used_seconds"
        private const val KEY_DAILY_BUDGET = "daily_budget"
        private const val KEY_URGES_RESISTED = "urges_resisted"
        private const val KEY_HEARTBEAT = "accessibility_heartbeat"
        private const val KEY_OVERLAY_TRIGGERED = "overlay_triggered"
        private const val KEY_OVERLAY_PACKAGE = "overlay_package"
        private const val KEY_STREAK_DAYS = "streak_days"
        private const val KEY_LONGEST_STREAK = "longest_streak"
        private const val KEY_CURRENT_DAY = "current_day"
        private const val KEY_SHIELDS_LEFT = "shields_left"
        private const val KEY_HOURS_SAVED = "hours_saved"
    }

    private fun getCapacitorPrefs(): SharedPreferences {
        return context.getSharedPreferences(PREFS_FILE, Context.MODE_PRIVATE)
    }

    private fun getMonitoredApps(): Set<String> {
        val json = getCapacitorPrefs().getString(KEY_MONITORED_APPS, null) ?: return emptySet()
        return try {
            val jsonArray = JSONArray(json)
            val result = mutableSetOf<String>()
            for (i in 0 until jsonArray.length()) {
                val pkg = jsonArray.getString(i).trim()
                if (pkg.isNotEmpty()) result.add(pkg)
            }
            result
        } catch (e: Exception) {
            Log.e(TAG, "Failed to parse monitored_apps: ${e.message}")
            emptySet()
        }
    }

    @PluginMethod
    fun getInstalledApps(call: PluginCall) {
        try {
            val pm = context.packageManager
            val mainIntent = Intent(Intent.ACTION_MAIN, null)
            mainIntent.addCategory(Intent.CATEGORY_LAUNCHER)

            val resolveInfos = pm.queryIntentActivities(mainIntent, 0)
            val jsArray = JSArray()
            val seenPackages = mutableSetOf<String>()
            val monitoredApps = getMonitoredApps()
            val ownPackage = context.packageName

            for (resolveInfo in resolveInfos) {
                val packageName = resolveInfo.activityInfo.packageName

                if (packageName == ownPackage) continue
                if (seenPackages.contains(packageName)) continue

                val label = resolveInfo.loadLabel(pm).toString().trim()
                if (label.isEmpty() || label == packageName) continue

                val jsObject = JSObject()
                jsObject.put("name", label)
                jsObject.put("packageName", packageName)
                jsObject.put("isSocial", monitoredApps.contains(packageName))

                jsArray.put(jsObject)
                seenPackages.add(packageName)
            }

            val ret = JSObject()
            ret.put("apps", jsArray)
            call.resolve(ret)
        } catch (e: Exception) {
            Log.e(TAG, "getInstalledApps failed", e)
            call.reject("Failed to get installed apps: ${e.localizedMessage}")
        }
    }

    @PluginMethod
    fun launchApp(call: PluginCall) {
        val packageName = call.getString("packageName")
        if (packageName.isNullOrEmpty()) {
            call.reject("packageName is required")
            return
        }
        try {
            val launchIntent = context.packageManager.getLaunchIntentForPackage(packageName)
            if (launchIntent != null) {
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(launchIntent)
                call.resolve()
            } else {
                call.reject("App not launchable: $packageName")
            }
        } catch (e: Exception) {
            call.reject("Launch failed: ${e.localizedMessage}")
        }
    }

    @PluginMethod
    fun checkAccessibilityStatus(call: PluginCall) {
        try {
            val expectedComponent = ComponentName(context, AppInterceptorService::class.java)
            val enabledServices = Settings.Secure.getString(
                context.contentResolver,
                Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
            )
            val isEnabled = enabledServices?.contains(expectedComponent.flattenToString()) == true

            // Check heartbeat
            val lastHeartbeat = getCapacitorPrefs().getLong(KEY_HEARTBEAT, 0L)
            val heartbeatAlive = (System.currentTimeMillis() - lastHeartbeat) < 5000

            Log.d(TAG, "Accessibility check: enabled=$isEnabled heartbeat=$heartbeatAlive lastBeat=${System.currentTimeMillis() - lastHeartbeat}ms ago")

            val ret = JSObject()
            ret.put("isActive", isEnabled && heartbeatAlive)
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to check accessibility status: ${e.localizedMessage}")
        }
    }

    @PluginMethod
    fun getUsageData(call: PluginCall) {
        try {
            val prefs = getCapacitorPrefs()
            val timeUsedSeconds = prefs.getString(KEY_TIME_USED_SECONDS, "0")?.toLongOrNull() ?: 0L
            val timeUsedMinutes = (timeUsedSeconds / 60).toInt()
            val dailyBudget = prefs.getString(KEY_DAILY_BUDGET, "60")?.toIntOrNull() ?: 60
            val urgesResisted = prefs.getString(KEY_URGES_RESISTED, "0")?.toIntOrNull() ?: 0

            Log.d(TAG, "getUsageData: time=${timeUsedSeconds}s (${timeUsedMinutes}m) budget=${dailyBudget}m urges=$urgesResisted")

            val ret = JSObject()
            ret.put("timeUsedMinutes", timeUsedMinutes)
            ret.put("dailyBudget", dailyBudget)
            ret.put("urgesResisted", urgesResisted)
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("getUsageData failed: ${e.localizedMessage}")
        }
    }

    @PluginMethod
    fun resetDailyUsage(call: PluginCall) {
        getCapacitorPrefs().edit().putString(KEY_TIME_USED_SECONDS, "0").apply()
        call.resolve()
    }

    @PluginMethod
    fun getStreakData(call: PluginCall) {
        try {
            val prefs = getCapacitorPrefs()
            val ret = JSObject()
            ret.put("streakDays", prefs.getString(KEY_STREAK_DAYS, "0")?.toIntOrNull() ?: 0)
            ret.put("longestStreak", prefs.getString(KEY_LONGEST_STREAK, "0")?.toIntOrNull() ?: 0)
            ret.put("currentDay", prefs.getString(KEY_CURRENT_DAY, "1")?.toIntOrNull() ?: 1)
            ret.put("shieldsLeft", prefs.getString(KEY_SHIELDS_LEFT, "1")?.toIntOrNull() ?: 1)
            ret.put("hoursSaved", prefs.getString(KEY_HOURS_SAVED, "0")?.toFloatOrNull() ?: 0f)
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("getStreakData failed: ${e.localizedMessage}")
        }
    }

    @PluginMethod
    fun getOverlayTrigger(call: PluginCall) {
        try {
            val prefs = getCapacitorPrefs()
            val triggered = prefs.getString(KEY_OVERLAY_TRIGGERED, "false") == "true"
            val packageName = prefs.getString(KEY_OVERLAY_PACKAGE, "") ?: ""

            val ret = JSObject()
            ret.put("triggered", triggered)
            ret.put("packageName", packageName)
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("getOverlayTrigger failed: ${e.localizedMessage}")
        }
    }

    @PluginMethod
    fun clearOverlayTrigger(call: PluginCall) {
        getCapacitorPrefs().edit()
            .putString(KEY_OVERLAY_TRIGGERED, "false")
            .putString(KEY_OVERLAY_PACKAGE, "")
            .apply()
        call.resolve()
    }

    @PluginMethod
    fun openAccessibilitySettings(call: PluginCall) {
        try {
            val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
            context.startActivity(intent)
            call.resolve()
        } catch (e: Exception) {
            call.reject("Could not open accessibility settings: ${e.localizedMessage}")
        }
    }

    /**
     * Debug method — dumps all SharedPrefs keys for Logcat debugging
     */
    @PluginMethod
    fun getDebugInfo(call: PluginCall) {
        try {
            val prefs = getCapacitorPrefs()
            val allEntries = prefs.all
            val ret = JSObject()

            for ((key, value) in allEntries) {
                ret.put(key, value?.toString() ?: "null")
            }

            Log.d(TAG, "=== SharedPrefs Debug Dump ===")
            for ((key, value) in allEntries) {
                Log.d(TAG, "  $key = $value")
            }

            ret.put("_keyCount", allEntries.size)
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("getDebugInfo failed: ${e.localizedMessage}")
        }
    }
}
