package com.mavoix.aidant;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.AudioAttributes;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class AlarmListenerService extends Service {
  private static final String NOTIFICATION_CHANNEL_ID = "ma_voix_aidant_urgent_alerts_v2";
  private static final int NOTIFICATION_ID = 4108;
  private static final long FULL_SCREEN_FALLBACK_DELAY_MS = 350L;

  private final ExecutorService executor = Executors.newCachedThreadPool();
  private final Map<String, HttpURLConnection> connections = new ConcurrentHashMap<>();
  private final Handler mainHandler = new Handler(Looper.getMainLooper());
  private SharedPreferences prefs;
  private volatile boolean shouldListen;
  private volatile int listenVersion;
  private AlarmSoundPlayer.Session alarmSoundSession;
  private PowerManager.WakeLock wakeLock;

  @Override
  public void onCreate() {
    super.onCreate();
    prefs = getSharedPreferences(AlertContract.PREFS, MODE_PRIVATE);
    createNotificationChannel();
  }

  @Override
  public int onStartCommand(Intent intent, int flags, int startId) {
    String action = intent != null ? intent.getAction() : null;

    if (AlertContract.ACTION_STOP_ALARM.equals(action)) {
      stopAlarm();
      return START_STICKY;
    }

    if (AlertContract.ACTION_TEST_ALARM.equals(action)) {
      ensureForeground("Test du son", "Apercu du son aidant.");
      triggerAlarm("test", false);
      return START_STICKY;
    }

    if (AlertContract.ACTION_TEST_FULL_SCREEN_ALARM.equals(action)) {
      triggerAlarm("test", true);
      return START_STICKY;
    }

    String apiBase = intent != null ? intent.getStringExtra(AlertContract.EXTRA_API_BASE) : null;
    String channel = intent != null ? intent.getStringExtra(AlertContract.EXTRA_CHANNEL) : null;

    if (channel != null && !channel.trim().isEmpty()) {
      PatientLinkStore.addOrSelect(prefs, apiBase, channel);
    }

    ArrayList<PatientLinkStore.Link> links = PatientLinkStore.read(prefs);
    if (links.isEmpty()) {
      stopSelf();
      return START_NOT_STICKY;
    }

    ensureForeground("Connexion de l'alarme", "Verification de " + patientCountLabel(links.size()) + ".");
    startListening(links);
    return START_STICKY;
  }

  private void startListening(ArrayList<PatientLinkStore.Link> links) {
    shouldListen = false;
    disconnectAll();
    int version = listenVersion + 1;
    listenVersion = version;
    shouldListen = true;

    for (PatientLinkStore.Link link : links) {
      executor.execute(() -> listenLoop(link, version, links.size()));
    }
  }

  private void listenLoop(PatientLinkStore.Link link, int version, int patientCount) {
    while (shouldListen && version == listenVersion) {
      HttpURLConnection nextConnection = null;
      try {
        String streamUrl = link.apiBase
            + "/api/caregiver-alert/stream?channel="
            + URLEncoder.encode(link.channel, "UTF-8");
        nextConnection = (HttpURLConnection) new URL(streamUrl).openConnection();
        connections.put(link.id, nextConnection);
        nextConnection.setConnectTimeout(15000);
        nextConnection.setReadTimeout(0);
        nextConnection.setRequestProperty("Accept", "text/event-stream");
        nextConnection.setRequestProperty("Cache-Control", "no-cache");

        int statusCode = nextConnection.getResponseCode();
        if (statusCode < 200 || statusCode >= 300) {
          throw new IllegalStateException("Stream HTTP " + statusCode);
        }

        ensureForeground("Alarme connectee", "En attente pour " + patientCountLabel(patientCount) + ".");
        BufferedReader reader = new BufferedReader(new InputStreamReader(
            nextConnection.getInputStream(),
            StandardCharsets.UTF_8
        ));

        String line;
        boolean caregiverAlertEvent = false;
        while (shouldListen && version == listenVersion && (line = reader.readLine()) != null) {
          if (line.startsWith("event:")) {
            caregiverAlertEvent = line.contains("caregiver-alert");
          } else if (line.isEmpty()) {
            if (caregiverAlertEvent) {
              triggerAlarm(link.name);
            }
            caregiverAlertEvent = false;
          }
        }
      } catch (Exception ex) {
        String message = ex.getMessage();
        if (message != null && message.contains("Stream HTTP 404")) {
          ensureForeground(
              "Serveur d'alerte non deploye",
              "La route d'alerte manque sur le backend Ma Voix."
          );
          sleep(10000);
        } else {
          ensureForeground("Reconnexion de l'alarme", "La connexion va etre relancee.");
        }
        sleep(3000);
      } finally {
        disconnect(link.id, nextConnection);
      }
    }
  }

  private void triggerAlarm(String patientName) {
    triggerAlarm(patientName, true);
  }

  private void triggerAlarm(String patientName, boolean showCallNotification) {
    acquireWakeLock();
    stopAlarmPlaybackOnly();
    String label = patientName == null || patientName.trim().isEmpty()
        ? "un patient"
        : patientName.trim();
    if (showCallNotification) {
      ensureForeground("Appel aidant", "Ma Voix demande de l'aide pour " + label + ".", true, label);
      scheduleFullScreenAlarmLaunch(label);
    }
    vibrate();

    try {
      alarmSoundSession = AlarmSoundPlayer.startSelected(this, prefs, true);
    } catch (Exception ex) {
      stopAlarmPlaybackOnly();
      trySystemFallbackTone();
    }
  }

  private void trySystemFallbackTone() {
    try {
      alarmSoundSession = AlarmSoundPlayer.startSystemFallback(this, true);
    } catch (Exception ignored) {
      // The vibration and notification still signal the call if audio playback fails.
    }
  }

  private void stopAlarm() {
    stopAlarmPlaybackOnly();
    stopVibration();
    releaseWakeLock();
    ensureForeground("Alarme connectee", "En attente des appels patients.");
  }

  private void stopAlarmPlaybackOnly() {
    if (alarmSoundSession == null) {
      return;
    }

    alarmSoundSession.stopAndRelease();
    alarmSoundSession = null;
  }

  private void vibrate() {
    Vibrator vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
    if (vibrator == null) {
      return;
    }

    long[] pattern = new long[] { 0, 900, 400, 900, 400 };
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0));
    } else {
      vibrator.vibrate(pattern, 0);
    }
  }

  private void stopVibration() {
    Vibrator vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
    if (vibrator != null) {
      vibrator.cancel();
    }
  }

  private void acquireWakeLock() {
    if (wakeLock != null && wakeLock.isHeld()) {
      return;
    }

    PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
    if (powerManager == null) {
      return;
    }

    wakeLock = powerManager.newWakeLock(
        PowerManager.PARTIAL_WAKE_LOCK,
        "MaVoixAidant:AlertWakeLock"
    );
    wakeLock.acquire(10 * 60 * 1000L);
  }

  private void releaseWakeLock() {
    if (wakeLock != null && wakeLock.isHeld()) {
      wakeLock.release();
    }
    wakeLock = null;
  }

  private void ensureForeground(String title, String content) {
    ensureForeground(title, content, false, null);
  }

  private void ensureForeground(String title, String content, boolean fullScreenAlarm, String patientName) {
    Intent openIntent = new Intent(this, AidantActivity.class);
    PendingIntent openPendingIntent = PendingIntent.getActivity(
        this,
        1,
        openIntent,
        pendingIntentFlags()
    );

    Intent alarmIntent = fullScreenAlarmIntent(patientName);
    PendingIntent alarmPendingIntent = PendingIntent.getActivity(
        this,
        3,
        alarmIntent,
        pendingIntentFlags()
    );

    PendingIntent stopPendingIntent = fullScreenAlarm
        ? fullScreenStopPendingIntent()
        : serviceStopPendingIntent();

    Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
        ? new Notification.Builder(this, NOTIFICATION_CHANNEL_ID)
        : new Notification.Builder(this);

    builder
        .setSmallIcon(android.R.drawable.ic_dialog_info)
        .setContentTitle(title)
        .setContentText(content)
        .setContentIntent(fullScreenAlarm ? alarmPendingIntent : openPendingIntent)
        .setOngoing(true)
        .setShowWhen(true)
        .setWhen(System.currentTimeMillis())
        .setPriority(fullScreenAlarm ? Notification.PRIORITY_MAX : Notification.PRIORITY_HIGH)
        .setCategory(fullScreenAlarm ? Notification.CATEGORY_ALARM : Notification.CATEGORY_SERVICE)
        .setVisibility(Notification.VISIBILITY_PUBLIC)
        .addAction(android.R.drawable.ic_media_pause, fullScreenAlarm ? "STOP" : "Arreter", stopPendingIntent);

    if (fullScreenAlarm) {
      builder.setFullScreenIntent(alarmPendingIntent, true);
      builder.setOnlyAlertOnce(false);
      builder.setSound(null);
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        builder.setForegroundServiceBehavior(Notification.FOREGROUND_SERVICE_IMMEDIATE);
      }
    }

    Notification notification = builder.build();

    startForeground(NOTIFICATION_ID, notification);
  }

  private Intent fullScreenAlarmIntent(String patientName) {
    Intent alarmIntent = new Intent(this, FullScreenAlarmActivity.class);
    alarmIntent.putExtra(AlertContract.EXTRA_PATIENT_NAME, patientName);
    alarmIntent.addFlags(
        Intent.FLAG_ACTIVITY_NEW_TASK
            | Intent.FLAG_ACTIVITY_CLEAR_TOP
            | Intent.FLAG_ACTIVITY_SINGLE_TOP
            | Intent.FLAG_ACTIVITY_NO_USER_ACTION
    );
    return alarmIntent;
  }

  private void scheduleFullScreenAlarmLaunch(String patientName) {
    mainHandler.postDelayed(() -> launchFullScreenAlarm(patientName), FULL_SCREEN_FALLBACK_DELAY_MS);
  }

  private void launchFullScreenAlarm(String patientName) {
    try {
      startActivity(fullScreenAlarmIntent(patientName));
    } catch (Exception ignored) {
      // Android may block direct background launches; the full-screen notification remains active.
    }
  }

  private PendingIntent serviceStopPendingIntent() {
    Intent stopIntent = new Intent(this, AlarmListenerService.class);
    stopIntent.setAction(AlertContract.ACTION_STOP_ALARM);
    return PendingIntent.getService(
        this,
        2,
        stopIntent,
        pendingIntentFlags()
    );
  }

  private PendingIntent fullScreenStopPendingIntent() {
    Intent stopIntent = new Intent(this, FullScreenAlarmActivity.class);
    stopIntent.setAction(AlertContract.ACTION_STOP_ALARM);
    stopIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
    return PendingIntent.getActivity(
        this,
        4,
        stopIntent,
        pendingIntentFlags()
    );
  }

  private int pendingIntentFlags() {
    int flags = PendingIntent.FLAG_UPDATE_CURRENT;
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      flags |= PendingIntent.FLAG_IMMUTABLE;
    }
    return flags;
  }

  private void createNotificationChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return;
    }

    NotificationChannel channel = new NotificationChannel(
        NOTIFICATION_CHANNEL_ID,
        "Alertes Ma Voix",
        NotificationManager.IMPORTANCE_MAX
    );
    channel.setDescription("Connexion et alarme pour le telephone aidant.");
    channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
    channel.enableVibration(true);
    channel.setVibrationPattern(new long[] { 0, 900, 400, 900, 400 });
    channel.setSound(
        null,
        new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()
    );

    NotificationManager manager = getSystemService(NotificationManager.class);
    if (manager != null) {
      manager.createNotificationChannel(channel);
    }
  }

  private String patientCountLabel(int count) {
    return count <= 1 ? "1 patient" : count + " patients";
  }

  private void disconnect(String id, HttpURLConnection expectedConnection) {
    boolean shouldClose = false;
    synchronized (connections) {
      HttpURLConnection existingConnection = connections.get(id);
      if (existingConnection == expectedConnection) {
        connections.remove(id);
      }
      if (expectedConnection != null) {
        shouldClose = true;
      }
    }

    if (shouldClose) {
      expectedConnection.disconnect();
    }
  }

  private void disconnectAll() {
    ArrayList<HttpURLConnection> connectionsToClose = new ArrayList<>();
    synchronized (connections) {
      connectionsToClose.addAll(connections.values());
      connections.clear();
    }

    for (HttpURLConnection existingConnection : connectionsToClose) {
      if (existingConnection != null) {
        existingConnection.disconnect();
      }
    }
  }

  private void sleep(long millis) {
    try {
      Thread.sleep(millis);
    } catch (InterruptedException interrupted) {
      Thread.currentThread().interrupt();
    }
  }

  @Override
  public void onDestroy() {
    shouldListen = false;
    disconnectAll();
    stopAlarmPlaybackOnly();
    stopVibration();
    releaseWakeLock();
    mainHandler.removeCallbacksAndMessages(null);
    executor.shutdownNow();
    super.onDestroy();
  }

  @Override
  public IBinder onBind(Intent intent) {
    return null;
  }
}
