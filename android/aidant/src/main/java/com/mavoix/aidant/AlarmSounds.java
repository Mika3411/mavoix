package com.mavoix.aidant;

import android.content.Context;
import android.content.SharedPreferences;
import android.net.Uri;

final class AlarmSounds {
  static final String DEFAULT_ID = "ring";

  static final class Choice {
    final String id;
    final String label;
    final int resourceId;

    Choice(String id, String label, int resourceId) {
      this.id = id;
      this.label = label;
      this.resourceId = resourceId;
    }
  }

  private static final Choice[] CHOICES = new Choice[] {
      new Choice("ring", "Ring", R.raw.alarm_ring),
      new Choice("iphone", "iPhone", R.raw.alarm_iphone),
      new Choice("reveil", "Reveil", R.raw.alarm_reveil),
      new Choice("power", "Power", R.raw.alarm_power),
      new Choice("energy", "Energy", R.raw.alarm_energy),
      new Choice("dream", "Dream", R.raw.alarm_dream),
      new Choice("slowly", "Slowly", R.raw.alarm_slowly),
      new Choice("god_save_the_queen", "God save the queen", R.raw.alarm_god_save_the_queen)
  };

  private AlarmSounds() {}

  static String[] labels() {
    String[] labels = new String[CHOICES.length];
    for (int index = 0; index < CHOICES.length; index++) {
      labels[index] = CHOICES[index].label;
    }
    return labels;
  }

  static Choice choiceAt(int index) {
    if (index < 0 || index >= CHOICES.length) {
      return defaultChoice();
    }
    return CHOICES[index];
  }

  static int selectedIndex(SharedPreferences prefs) {
    return indexOf(selectedId(prefs));
  }

  static String selectedLabel(SharedPreferences prefs) {
    return selectedChoice(prefs).label;
  }

  static Uri selectedUri(Context context, SharedPreferences prefs) {
    Choice choice = selectedChoice(prefs);
    return Uri.parse("android.resource://" + context.getPackageName() + "/" + choice.resourceId);
  }

  private static String selectedId(SharedPreferences prefs) {
    String id = prefs == null ? null : prefs.getString(AlertContract.KEY_SOUND_ID, DEFAULT_ID);
    return id == null || id.trim().isEmpty() ? DEFAULT_ID : id;
  }

  private static Choice selectedChoice(SharedPreferences prefs) {
    return choiceAt(selectedIndexFromId(selectedId(prefs)));
  }

  private static int indexOf(String id) {
    return selectedIndexFromId(id);
  }

  private static int selectedIndexFromId(String id) {
    for (int index = 0; index < CHOICES.length; index++) {
      if (CHOICES[index].id.equals(id)) {
        return index;
      }
    }
    return 0;
  }

  private static Choice defaultChoice() {
    return CHOICES[0];
  }
}
