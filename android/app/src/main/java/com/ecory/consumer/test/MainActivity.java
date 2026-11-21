package com.ecory.consumer.test;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // API 35/36 enforce edge-to-edge. Keep the WebView clear of system bars,
        // cutouts and the keyboard without adding padding on every inset dispatch.
        if (Build.VERSION.SDK_INT >= 35) {
            WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
            View content = findViewById(android.R.id.content);
            if (content != null) {
                final int left = content.getPaddingLeft();
                final int top = content.getPaddingTop();
                final int right = content.getPaddingRight();
                final int bottom = content.getPaddingBottom();
                content.setBackgroundColor(Color.WHITE);
                ViewCompat.setOnApplyWindowInsetsListener(content, (view, windowInsets) -> {
                    Insets bars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars()
                            | WindowInsetsCompat.Type.displayCutout());
                    Insets keyboard = windowInsets.getInsets(WindowInsetsCompat.Type.ime());
                    view.setPadding(left + bars.left, top + bars.top,
                            right + bars.right, bottom + Math.max(bars.bottom, keyboard.bottom));
                    return WindowInsetsCompat.CONSUMED;
                });
                ViewCompat.requestApplyInsets(content);
            }
            WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(
                    getWindow(), getWindow().getDecorView());
            controller.setAppearanceLightStatusBars(true);
            controller.setAppearanceLightNavigationBars(true);
        }
    }
}
