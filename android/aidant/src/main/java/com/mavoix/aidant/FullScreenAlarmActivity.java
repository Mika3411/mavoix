package com.mavoix.aidant;

import android.animation.Animator;
import android.animation.AnimatorSet;
import android.animation.ObjectAnimator;
import android.animation.ValueAnimator;
import android.app.Activity;
import android.app.KeyguardManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Bundle;
import android.text.TextUtils;
import android.view.Gravity;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.view.animation.AccelerateDecelerateInterpolator;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import java.util.ArrayList;
import java.util.List;

public class FullScreenAlarmActivity extends Activity {
  private static final int COLOR_PAGE_TOP = Color.rgb(2, 6, 23);
  private static final int COLOR_PAGE = Color.rgb(15, 23, 42);
  private static final int COLOR_PAGE_BOTTOM = Color.rgb(23, 37, 84);
  private static final int COLOR_CARD = Color.argb(235, 15, 23, 42);
  private static final int COLOR_TEXT = Color.rgb(248, 250, 252);
  private static final int COLOR_MUTED = Color.rgb(203, 213, 225);
  private static final int COLOR_DANGER = Color.rgb(220, 38, 38);
  private static final int COLOR_DANGER_DARK = Color.rgb(127, 29, 29);
  private static final int COLOR_DANGER_SHADOW = Color.rgb(69, 10, 10);
  private static final int COLOR_SECONDARY = Color.rgb(30, 41, 59);

  private final List<Animator> runningAnimators = new ArrayList<>();

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
    configureLockScreenDisplay();
    if (AlertContract.ACTION_STOP_ALARM.equals(intent.getAction())) {
      stopAlarmAndFinish();
      return;
    }
    buildLayout();
  }

  @Override
  protected void onResume() {
    super.onResume();
    configureLockScreenDisplay();
  }

  @Override
  protected void onDestroy() {
    cancelAnimations();
    super.onDestroy();
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
    cancelAnimations();

    String patientName = getIntent().getStringExtra(AlertContract.EXTRA_PATIENT_NAME);
    if (patientName == null || patientName.trim().isEmpty()) {
      patientName = "un patient";
    }

    ScrollView scrollView = new ScrollView(this);
    scrollView.setFillViewport(true);
    scrollView.setBackground(pageBackground());

    LinearLayout root = new LinearLayout(this);
    root.setOrientation(LinearLayout.VERTICAL);
    root.setGravity(Gravity.CENTER);
    root.setPadding(dp(22), dp(30), dp(22), dp(30));
    scrollView.addView(root, new ScrollView.LayoutParams(
        ScrollView.LayoutParams.MATCH_PARENT,
        ScrollView.LayoutParams.MATCH_PARENT
    ));

    LinearLayout card = new LinearLayout(this);
    card.setOrientation(LinearLayout.VERTICAL);
    card.setGravity(Gravity.CENTER);
    card.setPadding(dp(22), dp(24), dp(22), dp(24));
    card.setBackground(roundedStroke(COLOR_CARD, Color.argb(120, 96, 165, 250), 30, 1));
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
      card.setElevation(dp(12));
    }
    root.addView(card, new LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.MATCH_PARENT,
        LinearLayout.LayoutParams.WRAP_CONTENT
    ));

    ImageView logo = new ImageView(this);
    logo.setImageResource(R.drawable.picturetitle);
    logo.setAdjustViewBounds(true);
    logo.setScaleType(ImageView.ScaleType.FIT_CENTER);
    logo.setAlpha(0.92f);
    card.addView(logo, new LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.MATCH_PARENT,
        dp(70)
    ));

    TextView pill = text("ALERTE ACTIVE", 13, Color.rgb(254, 243, 199), true);
    pill.setGravity(Gravity.CENTER);
    pill.setLetterSpacing(0.08f);
    pill.setPadding(dp(14), dp(7), dp(14), dp(7));
    pill.setBackground(roundedStroke(Color.argb(70, 245, 158, 11), Color.argb(160, 251, 191, 36), 999, 1));
    card.addView(pill, wrapCentered(dp(18), 0, 0, 0));

    FrameLayout bellStage = new FrameLayout(this);
    View ringOne = pulseRing(Color.argb(85, 96, 165, 250), Color.argb(170, 96, 165, 250));
    View ringTwo = pulseRing(Color.argb(70, 245, 158, 11), Color.argb(155, 245, 158, 11));
    bellStage.addView(ringOne, centeredFrame(dp(122), dp(122)));
    bellStage.addView(ringTwo, centeredFrame(dp(122), dp(122)));

    View bellGlow = new View(this);
    bellGlow.setBackground(ovalGradient(
        new int[] { Color.rgb(251, 191, 36), Color.rgb(245, 158, 11) },
        GradientDrawable.Orientation.TOP_BOTTOM
    ));
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
      bellGlow.setElevation(dp(6));
    }
    bellStage.addView(bellGlow, centeredFrame(dp(82), dp(82)));

    ImageView bell = new ImageView(this);
    bell.setImageResource(R.drawable.ic_alarm_bell_modern);
    bell.setAdjustViewBounds(true);
    bell.setScaleType(ImageView.ScaleType.FIT_CENTER);
    bellStage.addView(bell, centeredFrame(dp(72), dp(72)));

    card.addView(bellStage, wrapCentered(dp(16), 0, 0, 0, dp(132), dp(132)));

    TextView title = text("Appel aidant", 32, COLOR_TEXT, true);
    title.setGravity(Gravity.CENTER);
    title.setIncludeFontPadding(false);
    card.addView(title, spacedParams(0, dp(10), 0, 0));

    TextView patient = text(patientName, 25, COLOR_TEXT, true);
    patient.setGravity(Gravity.CENTER);
    patient.setMaxLines(2);
    patient.setEllipsize(TextUtils.TruncateAt.END);
    card.addView(patient, spacedParams(0, dp(10), 0, 0));

    TextView subtitle = text("Ma Voix demande de l'aide.", 18, COLOR_MUTED, false);
    subtitle.setGravity(Gravity.CENTER);
    card.addView(subtitle, spacedParams(0, dp(10), 0, dp(20)));

    String lastUnreadMessage = getIntent().getStringExtra(AlertContract.EXTRA_LAST_UNREAD_MESSAGE);
    if (lastUnreadMessage != null && !lastUnreadMessage.trim().isEmpty()) {
      card.addView(messagePanel(lastUnreadMessage.trim()), spacedParams(0, 0, 0, dp(18)));
    }

    FrameLayout stopButton = stopButton();
    card.addView(stopButton, wrapCentered(0, dp(2), 0, 0, dp(214), dp(214)));

    TextView helper = text("Touchez STOP pour couper l'alarme", 15, Color.rgb(226, 232, 240), false);
    helper.setGravity(Gravity.CENTER);
    card.addView(helper, spacedParams(0, dp(8), 0, 0));

    TextView openButton = text("Ouvrir Ma Voix Aidant", 17, COLOR_TEXT, true);
    openButton.setGravity(Gravity.CENTER);
    openButton.setMinHeight(dp(54));
    openButton.setPadding(dp(16), 0, dp(16), 0);
    openButton.setBackground(roundedStroke(COLOR_SECONDARY, Color.argb(150, 96, 165, 250), 18, 1));
    openButton.setOnClickListener(v -> openMainApp());
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
      openButton.setElevation(dp(3));
    }
    card.addView(openButton, spacedParams(0, dp(18), 0, 0));

    setContentView(scrollView);
    startAlarmAnimations(bell, ringOne, ringTwo, stopButton);
  }

  private FrameLayout stopButton() {
    FrameLayout stack = new FrameLayout(this);
    stack.setClickable(true);
    stack.setFocusable(true);
    stack.setContentDescription("STOP. Arreter l'alarme.");
    stack.setOnClickListener(v -> stopAlarmAndFinish());

    View shadow = new View(this);
    shadow.setBackground(oval(COLOR_DANGER_SHADOW));
    FrameLayout.LayoutParams shadowParams = centeredFrame(dp(184), dp(184));
    shadowParams.topMargin = dp(18);
    stack.addView(shadow, shadowParams);

    TextView face = text("STOP", 34, Color.WHITE, true);
    face.setGravity(Gravity.CENTER);
    face.setIncludeFontPadding(false);
    face.setBackground(ovalGradient(
        new int[] { Color.rgb(255, 78, 74), COLOR_DANGER, COLOR_DANGER_DARK },
        GradientDrawable.Orientation.TOP_BOTTOM
    ));
    face.setPadding(0, dp(4), 0, 0);
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
      face.setElevation(dp(10));
    }
    stack.addView(face, centeredFrame(dp(184), dp(184)));

    View shine = new View(this);
    shine.setBackground(oval(Color.argb(64, 255, 255, 255)));
    FrameLayout.LayoutParams shineParams = centeredFrame(dp(104), dp(32));
    shineParams.topMargin = dp(24);
    stack.addView(shine, shineParams);

    return stack;
  }

  private LinearLayout messagePanel(String message) {
    LinearLayout panel = new LinearLayout(this);
    panel.setOrientation(LinearLayout.VERTICAL);
    panel.setGravity(Gravity.CENTER);
    panel.setPadding(dp(18), dp(16), dp(18), dp(16));
    panel.setBackground(roundedStroke(Color.argb(210, 30, 64, 175), Color.argb(190, 96, 165, 250), 18, 1));

    TextView label = text("Dernier message non lu", 15, Color.rgb(191, 219, 254), true);
    label.setGravity(Gravity.CENTER);
    panel.addView(label, new LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.MATCH_PARENT,
        LinearLayout.LayoutParams.WRAP_CONTENT
    ));

    TextView body = text(message, 21, COLOR_TEXT, false);
    body.setGravity(Gravity.CENTER);
    body.setMaxLines(4);
    body.setEllipsize(TextUtils.TruncateAt.END);
    panel.addView(body, spacedParams(0, dp(8), 0, 0));

    return panel;
  }

  private View pulseRing(int fillColor, int strokeColor) {
    View ring = new View(this);
    ring.setScaleX(0.72f);
    ring.setScaleY(0.72f);
    ring.setAlpha(0.7f);
    ring.setBackground(ovalStroke(fillColor, strokeColor, 2));
    return ring;
  }

  private void startAlarmAnimations(View bell, View ringOne, View ringTwo, View stopButton) {
    ObjectAnimator bellSwing = ObjectAnimator.ofFloat(bell, "rotation", -11f, 11f);
    bellSwing.setDuration(420);
    bellSwing.setRepeatCount(ValueAnimator.INFINITE);
    bellSwing.setRepeatMode(ValueAnimator.REVERSE);
    bellSwing.setInterpolator(new AccelerateDecelerateInterpolator());
    startAnimator(bellSwing);

    startAnimator(ringAnimator(ringOne, 0));
    startAnimator(ringAnimator(ringTwo, 520));

    AnimatorSet stopPulse = new AnimatorSet();
    ObjectAnimator scaleX = ObjectAnimator.ofFloat(stopButton, "scaleX", 1f, 1.035f);
    ObjectAnimator scaleY = ObjectAnimator.ofFloat(stopButton, "scaleY", 1f, 1.035f);
    scaleX.setRepeatCount(ValueAnimator.INFINITE);
    scaleY.setRepeatCount(ValueAnimator.INFINITE);
    scaleX.setRepeatMode(ValueAnimator.REVERSE);
    scaleY.setRepeatMode(ValueAnimator.REVERSE);
    stopPulse.playTogether(scaleX, scaleY);
    stopPulse.setDuration(760);
    stopPulse.setInterpolator(new AccelerateDecelerateInterpolator());
    startAnimator(stopPulse);
  }

  private AnimatorSet ringAnimator(View ring, long delay) {
    AnimatorSet set = new AnimatorSet();
    ObjectAnimator scaleX = ObjectAnimator.ofFloat(ring, "scaleX", 0.72f, 1.42f);
    ObjectAnimator scaleY = ObjectAnimator.ofFloat(ring, "scaleY", 0.72f, 1.42f);
    ObjectAnimator alpha = ObjectAnimator.ofFloat(ring, "alpha", 0.72f, 0f);
    scaleX.setRepeatCount(ValueAnimator.INFINITE);
    scaleY.setRepeatCount(ValueAnimator.INFINITE);
    alpha.setRepeatCount(ValueAnimator.INFINITE);
    scaleX.setRepeatMode(ValueAnimator.RESTART);
    scaleY.setRepeatMode(ValueAnimator.RESTART);
    alpha.setRepeatMode(ValueAnimator.RESTART);
    set.playTogether(scaleX, scaleY, alpha);
    set.setStartDelay(delay);
    set.setDuration(1500);
    set.setInterpolator(new AccelerateDecelerateInterpolator());
    return set;
  }

  private void startAnimator(Animator animator) {
    runningAnimators.add(animator);
    animator.start();
  }

  private void cancelAnimations() {
    for (Animator animator : runningAnimators) {
      animator.cancel();
    }
    runningAnimators.clear();
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

  private LinearLayout.LayoutParams wrapCentered(int left, int top, int right, int bottom) {
    LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.WRAP_CONTENT,
        LinearLayout.LayoutParams.WRAP_CONTENT
    );
    params.gravity = Gravity.CENTER_HORIZONTAL;
    params.setMargins(left, top, right, bottom);
    return params;
  }

  private LinearLayout.LayoutParams wrapCentered(
      int left,
      int top,
      int right,
      int bottom,
      int width,
      int height
  ) {
    LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(width, height);
    params.gravity = Gravity.CENTER_HORIZONTAL;
    params.setMargins(left, top, right, bottom);
    return params;
  }

  private FrameLayout.LayoutParams centeredFrame(int width, int height) {
    FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(width, height);
    params.gravity = Gravity.CENTER;
    return params;
  }

  private GradientDrawable pageBackground() {
    return new GradientDrawable(
        GradientDrawable.Orientation.TOP_BOTTOM,
        new int[] { COLOR_PAGE_TOP, COLOR_PAGE, COLOR_PAGE_BOTTOM }
    );
  }

  private GradientDrawable roundedStroke(int color, int strokeColor, int radius, int strokeWidth) {
    GradientDrawable drawable = new GradientDrawable();
    drawable.setColor(color);
    drawable.setCornerRadius(dp(radius));
    drawable.setStroke(dp(strokeWidth), strokeColor);
    return drawable;
  }

  private GradientDrawable oval(int color) {
    GradientDrawable drawable = new GradientDrawable();
    drawable.setShape(GradientDrawable.OVAL);
    drawable.setColor(color);
    return drawable;
  }

  private GradientDrawable ovalStroke(int color, int strokeColor, int strokeWidth) {
    GradientDrawable drawable = oval(color);
    drawable.setStroke(dp(strokeWidth), strokeColor);
    return drawable;
  }

  private GradientDrawable ovalGradient(int[] colors, GradientDrawable.Orientation orientation) {
    GradientDrawable drawable = new GradientDrawable(orientation, colors);
    drawable.setShape(GradientDrawable.OVAL);
    return drawable;
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
