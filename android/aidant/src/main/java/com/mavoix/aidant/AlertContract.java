package com.mavoix.aidant;

final class AlertContract {
  static final String DEFAULT_API_BASE = "https://mavoix.onrender.com";
  static final String PREFS = "ma_voix_aidant_alert";
  static final String KEY_API_BASE = "apiBase";
  static final String KEY_CHANNEL = "channel";
  static final String KEY_ACCESS_KEY = "accessKey";
  static final String KEY_CONNECTIONS = "connections";
  static final String KEY_SELECTED_CONNECTION_ID = "selectedConnectionId";
  static final String KEY_SOUND_ID = "soundId";
  static final String KEY_SOUND_URI = "soundUri";
  static final String KEY_BATTERY_OPTIMIZATION_PROMPTED = "batteryOptimizationPrompted";
  static final String KEY_FULL_SCREEN_INTENT_PROMPTED = "fullScreenIntentPrompted";
  static final String KEY_APP_ROLE = "appRole";
  static final String KEY_PATIENT_ID = "patientId";
  static final String KEY_PATIENT_NAME = "patientName";
  static final String KEY_PATIENT_API_BASE = "patientApiBase";
  static final String KEY_PATIENT_CHANNEL = "patientChannel";
  static final String KEY_PATIENT_ACCESS_KEY = "patientAccessKey";
  static final String KEY_PATIENT_AIDANT_LINKS = "patientAidantLinks";
  static final String KEY_SELECTED_PATIENT_AIDANT_ID = "selectedPatientAidantId";

  static final String ROLE_AIDANT = "aidant";
  static final String ROLE_PATIENT = "patient";

  static final String ACTION_START_LISTENING = "com.mavoix.aidant.START_LISTENING";
  static final String ACTION_STOP_ALARM = "com.mavoix.aidant.STOP_ALARM";
  static final String ACTION_TEST_ALARM = "com.mavoix.aidant.TEST_ALARM";
  static final String ACTION_TEST_FULL_SCREEN_ALARM = "com.mavoix.aidant.TEST_FULL_SCREEN_ALARM";

  static final String EXTRA_API_BASE = "apiBase";
  static final String EXTRA_CHANNEL = "channel";
  static final String EXTRA_ACCESS_KEY = "accessKey";
  static final String EXTRA_PATIENT_NAME = "patientName";
  static final String EXTRA_LAST_UNREAD_MESSAGE = "lastUnreadMessage";

  private AlertContract() {}
}
