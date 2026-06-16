package com.mavoix.app;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "MessageNotifier")
public class MessageNotifierPlugin extends Plugin {
  private static final int REQUEST_NOTIFICATIONS = 1430;
  private static final String CHANNEL_ID = "ma_voix_messages";

  @Override
  public void load() {
    createNotificationChannel();
  }

  @PluginMethod
  public void requestPermission(PluginCall call) {
    JSObject ret = new JSObject();

    if (hasNotificationPermission()) {
      ret.put("granted", true);
      ret.put("permission", "granted");
      call.resolve(ret);
      return;
    }

    if (Build.VERSION.SDK_INT >= 33 && getActivity() != null) {
      getActivity().requestPermissions(
          new String[] { Manifest.permission.POST_NOTIFICATIONS },
          REQUEST_NOTIFICATIONS
      );
      ret.put("granted", false);
      ret.put("permission", "prompted");
      call.resolve(ret);
      return;
    }

    ret.put("granted", false);
    ret.put("permission", "denied");
    call.resolve(ret);
  }

  @PluginMethod
  public void showIncoming(PluginCall call) {
    JSObject ret = new JSObject();

    if (!hasNotificationPermission()) {
      ret.put("shown", false);
      call.resolve(ret);
      return;
    }

    String title = call.getString("title", "Message Ma Voix");
    String body = call.getString("body", "Nouveau message recu.");
    String tag = call.getString("tag", "ma-voix-message");

    NotificationManager manager =
        (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
    if (manager == null) {
      ret.put("shown", false);
      call.resolve(ret);
      return;
    }

    createNotificationChannel();

    Intent openIntent = new Intent(getContext(), MainActivity.class);
    openIntent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
    PendingIntent openPendingIntent = PendingIntent.getActivity(
        getContext(),
        1431,
        openIntent,
        pendingIntentFlags()
    );

    Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
        ? new Notification.Builder(getContext(), CHANNEL_ID)
        : new Notification.Builder(getContext());

    Notification notification = builder
        .setSmallIcon(android.R.drawable.ic_dialog_email)
        .setContentTitle(title)
        .setContentText(body)
        .setStyle(new Notification.BigTextStyle().bigText(body))
        .setContentIntent(openPendingIntent)
        .setAutoCancel(true)
        .setCategory(Notification.CATEGORY_MESSAGE)
        .setDefaults(Notification.DEFAULT_SOUND | Notification.DEFAULT_VIBRATE)
        .setPriority(Notification.PRIORITY_HIGH)
        .build();

    manager.notify(Math.abs(tag.hashCode()), notification);
    ret.put("shown", true);
    call.resolve(ret);
  }

  private boolean hasNotificationPermission() {
    return Build.VERSION.SDK_INT < 33
        || getContext().checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
            == PackageManager.PERMISSION_GRANTED;
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
        CHANNEL_ID,
        "Messages Ma Voix",
        NotificationManager.IMPORTANCE_HIGH
    );
    channel.setDescription("Notifications des messages recus dans Ma Voix.");
    channel.enableVibration(true);

    NotificationManager manager =
        (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
    if (manager != null) {
      manager.createNotificationChannel(channel);
    }
  }
}
