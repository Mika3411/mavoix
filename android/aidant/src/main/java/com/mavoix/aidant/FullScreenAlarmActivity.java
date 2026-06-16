package com.mavoix.aidant;

import android.app.Activity;
import android.app.KeyguardManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.Window;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

public class FullScreenAlarmActivity extends Activity {
  private static final int COLOR_PAGE = Color.rgb(15, 23, 42);
  private static final int COLOR_TEXT = Color.rgb(248, 250, 252);
  private static final int COLOR_MUTED = Color.rgb(203, 213, 225);
  private static final int COLOR_DANGER = Color.rgb(220, 38, 38);
  private static final int COLOR_SECONDARY = Color.rgb(30, 41, 59);

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    configureLockScreenDisplay();

    if (AlertContract.ACTION_STOP_ALARM.equals(getIntent().getAction())) {
      stopAlarmAndFinish();
      return;
    }

    buildLayout();
  }

  @Override
  protected void onNewIntent(Intent intent) {
    super.onNewIntent(intent);
    setIntent(intent);
    if (AlertContract.ACTION_STOP_ALARM.equals(intent.getAction())) {
      stopAlarmAndFinish();
    }
  }

  private void configureLockScreenDisplay() {
    Window window = getWindow();
    window.addFlags(
        WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
            | WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
            | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            | WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
    );

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true);
      setTurnScreenOn(true);
      KeyguardManager keyguardManager = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
      if (keyguardManager != null) {
        keyguardManager.requestDismissKeyguard(this, null);
      }
    }
  }

  private void buildLayout() {
    String patientName = getIntent().getStringExtra(AlertContract.EXTRA_PATIENT_NAME);
    if (patientName == null || patientName.trim().isEmpty()) {
      patientName = "un patient";
    }

    LinearLayout root = new LinearLayout(this);
    root.setOrientation(LinearLayout.VERTICAL);
    root.setGravity(Gravity.CENTER);
    root.setPadding(dp(28), dp(28), dp(28), dp(28));
    root.setBackgroundColor(COLOR_PAGE);

    ImageView logo = new ImageView(this);
    logo.setImageResource(R.drawable.picturetitle);
    logo.setAdjustViewBounds(true);
    logo.setScaleType(ImageView.ScaleType.FIT_CENTER);
    root.addView(logo, new LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.MATCH_PARENT,
        dp(86)
    ));

    TextView title = text("Appel aidant", 34, COLOR_TEXT, true);
    title.setGravity(Gravity.CENTER);
    root.addView(title, spacedParams(0, dp(28), 0, 0));

    TextView patient = text(patientName, 28, COLOR_TEXT, true);
    patient.setGravity(Gravity.CENTER);
    root.addView(patient, spacedParams(0, dp(12), 0, 0));

    TextView subtitle = text("Ma Voix demande de l'aide.", 20, COLOR_MUTED, false);
    subtitle.setGravity(Gravity.CENTER);
    root.addView(subtitle, spacedParams(0, dp(12), 0, dp(26)));

    Button stopButton = new Button(this);
    stopButton.setAllCaps(false);
    stopButton.setText("STOP");
    stopButton.setTextSize(34);
    stopButton.setTypeface(Typeface.DEFAULT_BOLD);
    stopButton.setTextColor(COLOR_TEXT);
    stopButton.setMinHeight(dp(110));
    stopButton.setBackgroundColor(COLOR_DANGER);
    stopButton.setOnClickListener(v -> stopAlarmAndFinish());
    root.addView(stopButton, new LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.MATCH_PARENT,
        LinearLayout.LayoutParams.WRAP_CONTENT
    ));

    Button openButton = new Button(this);
    openButton.setAllCaps(false);
    openButton.setText("Ouvrir Ma Voix Aidant");
    openButton.setTextSize(18);
    openButton.setTextColor(COLOR_TEXT);
    openButton.setBackgroundColor(COLOR_SECONDARY);
    openButton.setOnClickListener(v -> openMainApp());
    root.addView(openButton, spacedParams(0, dp(14), 0, 0));

    setContentView(root);
  }

  private TextView text(String value, float size, int color, boolean bold) {
    TextView textView = new TextView(this);
    textView.setText(value);
    textView.setTextColor(color);
    textView.setTextSize(size);
    textView.setLineSpacing(0, 1.08f);
    if (bold) {
      textView.setTypeface(Typeface.DEFAULT_BOLD);
    }
    return textView;
  }

  private LinearLayout.LayoutParams spacedParams(int left, int top, int right, int bottom) {
    LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.MATCH_PARENT,
        LinearLayout.LayoutParams.WRAP_CONTENT
    );
    params.setMargins(left, top, right, bottom);
    return params;
  }

  private void stopAlarmAndFinish() {
    Intent intent = new Intent(this, AlarmListenerService.class);
    intent.setAction(AlertContract.ACTION_STOP_ALARM);
    startService(intent);
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
      finishAndRemoveTask();
    } else {
      finish();
    }
  }

  private void openMainApp() {
    Intent intent = new Intent(this, AidantActivity.class);
    intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
    startActivity(intent);
  }

  private int dp(int value) {
    return (int) (value * getResources().getDisplayMetrics().density + 0.5f);
  }
}

