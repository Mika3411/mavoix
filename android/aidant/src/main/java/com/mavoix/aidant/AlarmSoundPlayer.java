package com.mavoix.aidant;

import android.content.Context;
import android.content.SharedPreferences;
import android.content.res.AssetFileDescriptor;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import java.io.IOException;

final class AlarmSoundPlayer {
  private AlarmSoundPlayer() {}

  static final class Session {
    private final MediaPlayer player;
    private final AudioManager audioManager;
    private final AudioManager.OnAudioFocusChangeListener focusListener;
    private final VolumeSnapshot volumeSnapshot;
    private boolean released;

    Session(
        MediaPlayer player,
        AudioManager audioManager,
        AudioManager.OnAudioFocusChangeListener focusListener,
        VolumeSnapshot volumeSnapshot
    ) {
      this.player = player;
      this.audioManager = audioManager;
      this.focusListener = focusListener;
      this.volumeSnapshot = volumeSnapshot;
    }

    void setOnErrorListener(MediaPlayer.OnErrorListener listener) {
      player.setOnErrorListener(listener);
    }

    boolean raisedAlarmVolume() {
      return volumeSnapshot.restore;
    }

    void stopAndRelease() {
      if (released) {
        return;
      }
      released = true;

      releasePlayer(player);
      restoreAlarmVolume(audioManager, volumeSnapshot);
      abandonAudioFocus(audioManager, focusListener);
    }
  }

  private static final class VolumeSnapshot {
    final boolean restore;
    final int previousVolume;

    VolumeSnapshot(boolean restore, int previousVolume) {
      this.restore = restore;
      this.previousVolume = previousVolume;
    }
  }

  static Session startSelected(Context context, SharedPreferences prefs, boolean looping)
      throws IOException {
    return startRawResource(context, AlarmSounds.selectedResourceId(prefs), looping);
  }

  static Session startSystemFallback(Context context, boolean looping) throws IOException {
    return startUri(context, systemFallbackAlarmUri(), looping);
  }

  private static Session startRawResource(Context context, int rawResourceId, boolean looping)
      throws IOException {
    return start(context, looping, player -> {
      AssetFileDescriptor descriptor = context.getResources().openRawResourceFd(rawResourceId);
      if (descriptor == null) {
        throw new IOException("Alarm sound resource not found.");
      }
      try {
        player.setDataSource(
            descriptor.getFileDescriptor(),
            descriptor.getStartOffset(),
            descriptor.getLength()
        );
      } finally {
        descriptor.close();
      }
    });
  }

  private static Session startUri(Context context, Uri uri, boolean looping) throws IOException {
    return start(context, looping, player -> player.setDataSource(context, uri));
  }

  private static Session start(Context context, boolean looping, DataSourceSetter dataSourceSetter)
      throws IOException {
    AudioManager audioManager = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
    AudioManager.OnAudioFocusChangeListener focusListener = focusChange -> {};
    requestAudioFocus(audioManager, focusListener);
    VolumeSnapshot volumeSnapshot = raiseAlarmVolume(audioManager);

    MediaPlayer player = null;
    try {
      player = new MediaPlayer();
      configureAlarmAudio(player);
      dataSourceSetter.setDataSource(player);
      player.setLooping(looping);
      player.setVolume(1f, 1f);
      player.prepare();
      player.start();
      return new Session(player, audioManager, focusListener, volumeSnapshot);
    } catch (Exception error) {
      releasePlayer(player);
      restoreAlarmVolume(audioManager, volumeSnapshot);
      abandonAudioFocus(audioManager, focusListener);
      if (error instanceof IOException) {
        throw (IOException) error;
      }
      throw new IOException("Unable to start alarm sound.", error);
    }
  }

  private static void configureAlarmAudio(MediaPlayer player) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
      player.setAudioAttributes(new AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_ALARM)
          .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
          .build());
    } else {
      player.setAudioStreamType(AudioManager.STREAM_ALARM);
    }
  }

  private static void requestAudioFocus(
      AudioManager audioManager,
      AudioManager.OnAudioFocusChangeListener focusListener
  ) {
    if (audioManager == null) {
      return;
    }

    try {
      audioManager.requestAudioFocus(
          focusListener,
          AudioManager.STREAM_ALARM,
          AudioManager.AUDIOFOCUS_GAIN_TRANSIENT
      );
    } catch (Exception ignored) {
      // Playback can still succeed without focus on some devices.
    }
  }

  private static void abandonAudioFocus(
      AudioManager audioManager,
      AudioManager.OnAudioFocusChangeListener focusListener
  ) {
    if (audioManager == null) {
      return;
    }

    try {
      audioManager.abandonAudioFocus(focusListener);
    } catch (Exception ignored) {
      // Nothing else to clean up.
    }
  }

  private static VolumeSnapshot raiseAlarmVolume(AudioManager audioManager) {
    if (audioManager == null) {
      return new VolumeSnapshot(false, -1);
    }

    try {
      int maxVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_ALARM);
      int currentVolume = audioManager.getStreamVolume(AudioManager.STREAM_ALARM);
      int targetVolume = Math.max(1, (int) Math.ceil(maxVolume * 0.8d));
      if (maxVolume > 0 && currentVolume < targetVolume) {
        audioManager.setStreamVolume(AudioManager.STREAM_ALARM, targetVolume, 0);
        return new VolumeSnapshot(true, currentVolume);
      }
    } catch (Exception ignored) {
      // Do Not Disturb or OEM policy may block volume changes.
    }
    return new VolumeSnapshot(false, -1);
  }

  private static void restoreAlarmVolume(AudioManager audioManager, VolumeSnapshot snapshot) {
    if (audioManager == null || snapshot == null || !snapshot.restore) {
      return;
    }

    try {
      audioManager.setStreamVolume(AudioManager.STREAM_ALARM, snapshot.previousVolume, 0);
    } catch (Exception ignored) {
      // Best effort: the user can still adjust the alarm volume manually.
    }
  }

  private static Uri systemFallbackAlarmUri() {
    Uri defaultAlarm = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
    if (defaultAlarm != null) {
      return defaultAlarm;
    }

    Uri defaultNotification = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
    return defaultNotification != null ? defaultNotification : Settings.System.DEFAULT_ALARM_ALERT_URI;
  }

  private static void releasePlayer(MediaPlayer player) {
    if (player == null) {
      return;
    }

    try {
      if (player.isPlaying()) {
        player.stop();
      }
    } catch (Exception ignored) {
      // The player is being released anyway.
    }

    try {
      player.release();
    } catch (Exception ignored) {
      // Nothing else to clean up.
    }
  }

  private interface DataSourceSetter {
    void setDataSource(MediaPlayer player) throws IOException;
  }
}
