package com.mavoix.aidant;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import java.util.ArrayList;

public class BootReceiver extends BroadcastReceiver {
  @Override
  public void onReceive(Context context, Intent intent) {
    String action = intent != null ? intent.getAction() : null;
    if (!Intent.ACTION_BOOT_COMPLETED.equals(action)
        && !Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {
      return;
    }

    SharedPreferences prefs = context.getSharedPreferences(AlertContract.PREFS, Context.MODE_PRIVATE);
    ArrayList<PatientLinkStore.Link> links = PatientLinkStore.read(prefs);
    if (links.isEmpty()) {
      return;
    }

    Intent serviceIntent = new Intent(context, AlarmListenerService.class);
    serviceIntent.setAction(AlertContract.ACTION_START_LISTENING);
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      context.startForegroundService(serviceIntent);
    } else {
      context.startService(serviceIntent);
    }
  }
}

