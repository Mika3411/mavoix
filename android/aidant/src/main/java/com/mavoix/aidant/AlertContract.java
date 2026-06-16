package com.mavoix.aidant;

final class AlertContract {
  static final String DEFAULT_API_BASE = "https://mavoix.onrender.com";
  static final String PREFS = "ma_voix_aidant_alert";
  static final String KEY_API_BASE = "apiBase";
  static final String KEY_CHANNEL = "channel";
  static final String KEY_CONNECTIONS = "connections";
  static final String KEY_SELECTED_CONNECTION_ID = "selectedConnectionId";
  static final String KEY_SOUND_ID = "soundId";
  static final String KEY_SOUND_URI = "soundUri";
  static final String KEY_BATTERY_OPTIMIZATION_PROMPTED = "batteryOptimizationPrompted";

  static final String ACTION_START_LISTENING = "com.mavoix.aidant.START_LISTENING";
  static final String ACTION_STOP_ALARM = "com.mavoix.aidant.STOP_ALARM";
  static final String ACTION_TEST_ALARM = "com.mavoix.aidant.TEST_ALARM";

  static final String EXTRA_API_BASE = "apiBase";
  static final String EXTRA_CHANNEL = "channel";
  static final String EXTRA_PATIENT_NAME = "patientName";

  private AlertContract() {}
}

