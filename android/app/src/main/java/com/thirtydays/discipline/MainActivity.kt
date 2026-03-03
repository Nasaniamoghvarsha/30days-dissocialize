package com.thirtydays.discipline

import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.provider.Settings
import androidx.core.view.WindowCompat
import com.getcapacitor.BridgeActivity
import com.capacitorjs.plugins.preferences.PreferencesPlugin

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(PreferencesPlugin::class.java)
        registerPlugin(NativeAppsPlugin::class.java)
        super.onCreate(savedInstanceState)

        // FIX #3: Edge-to-edge with VISIBLE transparent status bar.
        // A launcher MUST show the status bar so the user can see
        // notifications, time, and battery level.
        WindowCompat.setDecorFitsSystemWindows(window, false)
        window.statusBarColor = Color.TRANSPARENT
        window.navigationBarColor = Color.TRANSPARENT
    }

    // FIX #3: Removed onWindowFocusChanged with IMMERSIVE_STICKY.
    // IMMERSIVE_STICKY hides the status bar entirely, which prevents
    // users from seeing notifications — unacceptable for a launcher.

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleIntent(intent)
    }

    private fun handleIntent(intent: Intent) {
        // Handle overlay trigger from AppInterceptorService
        val triggerOverlay = intent.getBooleanExtra("trigger_overlay", false)
        if (triggerOverlay) {
            val packageName = intent.getStringExtra("overlay_package") ?: ""
            val prefs = getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)
            prefs.edit()
                .putString("_cap_overlay_triggered", "true")
                .putString("_cap_overlay_package", packageName)
                .apply()
            return
        }

        // Handle legacy navigation targets
        val target = intent.getStringExtra("navigation_target")
        if (target == "settings") {
            startActivity(Intent(Settings.ACTION_SETTINGS))
        } else if (target == "accessibility") {
            startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
        }
    }
}
