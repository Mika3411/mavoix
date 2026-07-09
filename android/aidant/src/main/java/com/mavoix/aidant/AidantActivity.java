package com.mavoix.aidant;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Rect;
import android.graphics.drawable.GradientDrawable;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.speech.tts.TextToSpeech;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.provider.Settings;
import android.text.InputType;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.inputmethod.InputMethodManager;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class AidantActivity extends Activity {
  private static final int REQUEST_NOTIFICATIONS = 42;
  private static final String MESSAGE_NOTIFICATION_CHANNEL_ID = "ma_voix_aidant_messages";
  private static final int COLOR_PAGE = Color.rgb(15, 23, 42);
  private static final int COLOR_CARD = Color.rgb(17, 24, 39);
  private static final int COLOR_FIELD = Color.rgb(15, 23, 42);
  private static final int COLOR_BORDER = Color.rgb(51, 65, 85);
  private static final int COLOR_TEXT = Color.rgb(248, 250, 252);
  private static final int COLOR_MUTED = Color.rgb(203, 213, 225);
  private static final int COLOR_PRIMARY = Color.rgb(37, 99, 235);
  private static final int COLOR_SECONDARY = Color.rgb(30, 41, 59);
  private static final int COLOR_SUCCESS = Color.rgb(22, 163, 74);
  private static final int COLOR_DANGER = Color.rgb(220, 38, 38);
  private static final int COLOR_INFO_BG = Color.rgb(30, 58, 138);
  private static final int COLOR_WARNING_BG = Color.rgb(69, 51, 25);
  private static final int COLOR_USER_BUBBLE = Color.rgb(22, 78, 99);
  private static final int COLOR_CAREGIVER_BUBBLE = Color.rgb(30, 64, 175);
  private final ExecutorService messageExecutor = Executors.newCachedThreadPool();
  private final ArrayList<PatientLinkStore.Link> patientLinks = new ArrayList<>();
  private final ArrayList<MessageItem> messages = new ArrayList<>();
  private final Set<String> unreadMessageIds = new HashSet<>();
  private final Set<String> readMessageIds = new HashSet<>();
  private final Set<String> pendingDeliveryReceiptIds = new HashSet<>();
  private final Set<String> pendingReadReceiptIds = new HashSet<>();
  private final Map<String, JSONObject> pendingMessageReceipts = new HashMap<>();
  private final Map<String, HttpURLConnection> messageConnections = new HashMap<>();
  private final Set<String> connectedMessageIds = new HashSet<>();

  private SharedPreferences prefs;
  private LinearLayout connectionTab;
  private LinearLayout configTab;
  private LinearLayout messagesTab;
  private LinearLayout helpTab;
  private LinearLayout roleChoicePanel;
  private LinearLayout patientRoleCard;
  private LinearLayout aidantRoleCard;
  private LinearLayout bottomNavigation;
  private Button roleChoiceBackButton;
  private LinearLayout connectionPanel;
  private LinearLayout configPanel;
  private LinearLayout messagesPanel;
  private LinearLayout helpPanel;
  private LinearLayout patientCallPanel;
  private LinearLayout patientConfigPanel;
  private LinearLayout patientMessagesPanel;
  private LinearLayout patientHelpPanel;
  private ScrollView contentScrollView;
  private Button connectionButton;
  private Button patientCallButton;
  private EditText linkInput;
  private EditText messageInput;
  private EditText patientMessageInput;
  private LinearLayout connectionsListContainer;
  private LinearLayout patientMessageListContainer;
  private TextView selectedPatientText;
  private TextView statusText;
  private TextView patientStatusText;
  private TextView patientLinkText;
  private TextView patientMessageStatusText;
  private TextView patientConnectionStatusText;
  private View centerMessageView;
  private TextView soundText;
  private Spinner soundSpinner;
  private Spinner patientAidantSpinner;
  private Spinner patientMessageAidantSpinner;
  private Button renamePatientAidantButton;
  private Button deletePatientAidantButton;
  private TextView patientAidantStatusText;
  private Button testSoundButton;
  private TextView unreadText;
  private TextView patientUnreadText;
  private LinearLayout messageListContainer;
  private Spinner messagePatientSpinner;
  private TextToSpeech textToSpeech;
  private AlarmSoundPlayer.Session testSoundSession;
  private boolean textToSpeechReady;
  private boolean isRefreshingPatientUi;
  private boolean isRefreshingSoundUi;
  private boolean isRefreshingPatientAidantUi;
  private boolean isTestingAlarmSound;
  private boolean patientAlertSending;
  private boolean roleChoiceVisible;

  private volatile boolean shouldListenMessages;
  private volatile boolean messagesConnected;
  private volatile int messageListenVersion;
  private int patientConnectedCaregivers;
  private final Map<String, Integer> patientAidantPresence = new HashMap<>();
  private String currentRole = AlertContract.ROLE_AIDANT;
  private String selectedConnectionId = "";
  private String currentSection = "connexion";
  private PatientProfileStore.Profile patientProfile;

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    prefs = getSharedPreferences(AlertContract.PREFS, MODE_PRIVATE);
    currentRole = readSavedRole();
    patientProfile = PatientProfileStore.readOrCreate(prefs);
    createMessageNotificationChannel();
    textToSpeech = new TextToSpeech(this, status -> {
      textToSpeechReady = status == TextToSpeech.SUCCESS;
      if (textToSpeechReady) {
        textToSpeech.setLanguage(Locale.FRANCE);
      }
    });
    buildLayout();
    requestNotificationsIfNeeded();
    boolean openedLink = handleIntent(getIntent(), true);
    if (shouldShowRoleChoiceOnStartup(openedLink)) {
      showRoleChoice();
    } else {
      showMainApp();
      refreshUi();
      connectMessagesFromPrefs();
    }
  }

  @Override
  protected void onNewIntent(Intent intent) {
    super.onNewIntent(intent);
    setIntent(intent);
    boolean openedLink = handleIntent(intent, true);
    if (openedLink) {
      showMainApp();
    }
    if (!roleChoiceVisible || openedLink) {
      refreshUi();
      connectMessagesFromPrefs();
    }
  }

  @Override
  public boolean dispatchTouchEvent(MotionEvent event) {
    if (event.getActionMasked() == MotionEvent.ACTION_DOWN) {
      hideKeyboardWhenTouchingOutsideInput(event);
    }
    return super.dispatchTouchEvent(event);
  }

  private void hideKeyboardWhenTouchingOutsideInput(MotionEvent event) {
    View focusedView = getCurrentFocus();
    if (!(focusedView instanceof EditText)) {
      return;
    }

    View touchedView = findTouchedView(getWindow().getDecorView(), event.getRawX(), event.getRawY());
    if (isSameOrChildOf(touchedView, focusedView)) {
      return;
    }

    focusedView.clearFocus();
    InputMethodManager manager = (InputMethodManager) getSystemService(INPUT_METHOD_SERVICE);
    if (manager != null) {
      manager.hideSoftInputFromWindow(focusedView.getWindowToken(), 0);
    }
  }

  private View findTouchedView(View view, float rawX, float rawY) {
    if (view == null || view.getVisibility() != View.VISIBLE) {
      return null;
    }

    Rect bounds = new Rect();
    if (!view.getGlobalVisibleRect(bounds)
        || !bounds.contains((int) rawX, (int) rawY)) {
      return null;
    }

    if (view instanceof ViewGroup) {
      ViewGroup group = (ViewGroup) view;
      for (int index = group.getChildCount() - 1; index >= 0; index--) {
        View child = findTouchedView(group.getChildAt(index), rawX, rawY);
        if (child != null) {
          return child;
        }
      }
    }
    return view;
  }

  private boolean isSameOrChildOf(View view, View possibleParent) {
    View current = view;
    while (current != null) {
      if (current == possibleParent) {
        return true;
      }
      if (!(current.getParent() instanceof View)) {
        return false;
      }
      current = (View) current.getParent();
    }
    return false;
  }

  private void buildLayout() {
    LinearLayout screen = new LinearLayout(this);
    screen.setOrientation(LinearLayout.VERTICAL);
    screen.setBackgroundColor(COLOR_PAGE);

    contentScrollView = new ScrollView(this);
    contentScrollView.setFillViewport(true);
    contentScrollView.setBackgroundColor(COLOR_PAGE);

    LinearLayout root = new LinearLayout(this);
    root.setOrientation(LinearLayout.VERTICAL);
    root.setPadding(dp(22), dp(28), dp(22), dp(18));
    contentScrollView.addView(root, new ScrollView.LayoutParams(
        ScrollView.LayoutParams.MATCH_PARENT,
        ScrollView.LayoutParams.WRAP_CONTENT
    ));

    LinearLayout header = new LinearLayout(this);
    header.setOrientation(LinearLayout.HORIZONTAL);
    header.setGravity(Gravity.CENTER_VERTICAL);

    ImageView logo = new ImageView(this);
    logo.setImageResource(R.drawable.picturetitle);
    logo.setAdjustViewBounds(true);
    logo.setScaleType(ImageView.ScaleType.FIT_START);
    LinearLayout.LayoutParams logoParams = new LinearLayout.LayoutParams(0, dp(72), 1);
    header.addView(logo, logoParams);

    roleChoiceBackButton = headerModeButton();
    header.addView(roleChoiceBackButton);

    root.addView(header, spacedParams(0, 0, 0, dp(18)));

    buildRoleChoicePanel(root);

    connectionPanel = panel();
    buildConnectionPanel(connectionPanel);
    root.addView(connectionPanel, matchWrap());

    patientCallPanel = panel();
    buildPatientCallPanel(patientCallPanel);
    root.addView(patientCallPanel, matchWrap());

    configPanel = panel();
    buildConfigPanel(configPanel);
    root.addView(configPanel, matchWrap());

    patientConfigPanel = panel();
    buildPatientConfigPanel(patientConfigPanel);
    root.addView(patientConfigPanel, matchWrap());

    messagesPanel = panel();
    buildMessagesPanel(messagesPanel);
    root.addView(messagesPanel, matchWrap());

    patientMessagesPanel = panel();
    buildPatientMessagesPanel(patientMessagesPanel);
    root.addView(patientMessagesPanel, matchWrap());

    helpPanel = panel();
    buildHelpPanel(helpPanel);
    root.addView(helpPanel, matchWrap());

    patientHelpPanel = panel();
    buildPatientHelpPanel(patientHelpPanel);
    root.addView(patientHelpPanel, matchWrap());

    screen.addView(
            contentScrollView,
        new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            0,
            1f
        )
    );
    bottomNavigation = buildBottomNavigation();
    screen.addView(bottomNavigation, matchWrap());
    showSection("connexion");

    setContentView(screen);
  }

  private void buildRoleChoicePanel(LinearLayout root) {
    roleChoicePanel = new LinearLayout(this);
    roleChoicePanel.setOrientation(LinearLayout.VERTICAL);
    roleChoicePanel.setPadding(0, dp(6), 0, 0);

    TextView title = sectionTitle("Choisir le mode");
    title.setTextSize(26);
    roleChoicePanel.addView(title, matchWrap());

    TextView intro = messageTextView(
        "Selectionne le role de ce telephone.",
        COLOR_MUTED,
        16,
        false
    );
    roleChoicePanel.addView(intro, spacedParams(0, dp(8), 0, dp(16)));

    patientRoleCard = roleChoiceCard(
        "Patient",
        "Appeler l'aidant",
        "Envoyer un appel et des messages depuis ce telephone.",
        AlertContract.ROLE_PATIENT
    );
    roleChoicePanel.addView(patientRoleCard, spacedParams(0, 0, 0, dp(12)));

    aidantRoleCard = roleChoiceCard(
        "Aidant",
        "Recevoir les alertes",
        "Rester connecte aux appels et repondre aux messages.",
        AlertContract.ROLE_AIDANT
    );
    roleChoicePanel.addView(aidantRoleCard, matchWrap());

    root.addView(roleChoicePanel, matchWrap());
  }

  private LinearLayout roleChoiceCard(
      String title,
      String subtitle,
      String detail,
      String role
  ) {
    LinearLayout card = new LinearLayout(this);
    card.setOrientation(LinearLayout.VERTICAL);
    card.setPadding(dp(18), dp(18), dp(18), dp(18));
    card.setMinimumHeight(dp(136));
    card.setClickable(true);
    card.setFocusable(true);
    card.setOnClickListener(v -> selectRole(role));

    TextView titleView = messageTextView(title, COLOR_TEXT, 24, true);
    card.addView(titleView, matchWrap());

    TextView subtitleView = messageTextView(subtitle, Color.rgb(191, 219, 254), 16, true);
    card.addView(subtitleView, spacedParams(0, dp(6), 0, 0));

    TextView detailView = messageTextView(detail, COLOR_MUTED, 15, false);
    card.addView(detailView, spacedParams(0, dp(6), 0, 0));

    return card;
  }

  private Button headerModeButton() {
    Button button = new Button(this);
    button.setAllCaps(false);
    button.setText("Mode");
    button.setTextColor(COLOR_TEXT);
    button.setTextSize(14);
    button.setMinHeight(dp(42));
    button.setPadding(dp(12), 0, dp(12), 0);
    button.setBackground(roundedStroke(COLOR_SECONDARY, COLOR_BORDER, 16, 1));
    button.setContentDescription("Choisir Patient ou Aidant");
    button.setOnClickListener(v -> showRoleChoiceFromModeButton());
    LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.WRAP_CONTENT,
        dp(44)
    );
    params.setMargins(dp(10), 0, 0, 0);
    button.setLayoutParams(params);
    return button;
  }

  private void buildConnectionPanel(LinearLayout panel) {
    connectionButton = button("Non connecte", v -> {
      startListening();
      connectMessagesFromPrefs();
    });
    connectionButton.setTextSize(30);
    connectionButton.setMinHeight(dp(126));
    panel.addView(connectionButton, matchWrap());

    statusText = new TextView(this);
    statusText.setTextSize(17);
    statusText.setTextColor(COLOR_TEXT);
    statusText.setPadding(dp(14), dp(12), dp(14), dp(12));
    statusText.setBackground(roundedStroke(COLOR_INFO_BG, Color.rgb(96, 165, 250), 16, 1));
    panel.addView(statusText, spacedParams(0, dp(12), 0, 0));

    panel.addView(button("Arreter l'alarme", v -> stopAlarm()), matchWrap());

    TextView unreadTitle = sectionTitle("Derniers messages non lus");
    panel.addView(unreadTitle, spacedParams(0, dp(22), 0, dp(8)));

    unreadText = infoText();
    panel.addView(unreadText, matchWrap());
  }

  private void buildPatientCallPanel(LinearLayout panel) {
    TextView title = sectionTitle("Mode patient");
    panel.addView(title, spacedParams(0, 0, 0, dp(8)));

    patientCallButton = button("Appeler l'aidant", v -> sendPatientAlert());
    patientCallButton.setTextSize(28);
    patientCallButton.setGravity(Gravity.CENTER);
    patientCallButton.setMinHeight(dp(156));
    patientCallButton.setPadding(dp(18), dp(18), dp(18), dp(18));
    patientCallButton.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
      patientCallButton.setElevation(dp(8));
    }
    applyPatientAlarmButtonStyle(false);
    panel.addView(patientCallButton, matchWrap());

    patientStatusText = new TextView(this);
    patientStatusText.setTextSize(17);
    patientStatusText.setTextColor(COLOR_TEXT);
    patientStatusText.setPadding(dp(14), dp(12), dp(14), dp(12));
    patientStatusText.setBackground(roundedStroke(COLOR_INFO_BG, Color.rgb(96, 165, 250), 16, 1));
    panel.addView(patientStatusText, spacedParams(0, dp(12), 0, 0));

    patientConnectionStatusText = infoText();
    panel.addView(patientConnectionStatusText, spacedParams(0, dp(12), 0, 0));

    LinearLayout actions = buttonRow();
    actions.addView(rowButton("Partager le lien", v -> sharePatientLink()), rowButtonParams(false));
    actions.addView(rowButton("Configurer", v -> showSection("configurer")), rowButtonParams(true));
    panel.addView(actions, spacedParams(0, dp(8), 0, 0));

    TextView unreadTitle = sectionTitle("Messages non lus");
    panel.addView(unreadTitle, spacedParams(0, dp(22), 0, dp(8)));

    patientUnreadText = infoText();
    panel.addView(patientUnreadText, matchWrap());
  }

  private void buildConfigPanel(LinearLayout panel) {
    TextView linkTitle = sectionTitle("Liens patients");
    panel.addView(linkTitle, spacedParams(0, 0, 0, dp(8)));

    linkInput = new EditText(this);
    linkInput.setSingleLine(false);
    linkInput.setMinLines(3);
    linkInput.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI | InputType.TYPE_TEXT_FLAG_MULTI_LINE);
    linkInput.setHint("Colle ici un lien aidant-alerte");
    linkInput.setTextSize(15);
    linkInput.setPadding(dp(12), dp(12), dp(12), dp(12));
    styleInput(linkInput);
    panel.addView(linkInput, matchWrap());

    selectedPatientText = infoText();
    panel.addView(selectedPatientText, spacedParams(0, dp(10), 0, 0));

    panel.addView(button("Ajouter ce lien patient", v -> {
      if (saveLinkFromInput()) connectMessagesFromPrefs();
    }), matchWrap());
    panel.addView(button("Coller le lien", v -> pasteLink()), matchWrap());

    connectionsListContainer = new LinearLayout(this);
    connectionsListContainer.setOrientation(LinearLayout.VERTICAL);
    panel.addView(connectionsListContainer, spacedParams(0, dp(14), 0, 0));

    TextView reliabilityTitle = sectionTitle("Alertes telephone verrouille");
    panel.addView(reliabilityTitle, spacedParams(0, dp(24), 0, dp(8)));

    TextView reliabilityText = infoText();
    reliabilityText.setText("Autorise Android a laisser Ma Voix Aidant active en veille pour recevoir les alarmes meme telephone verrouille.");
    panel.addView(reliabilityText, matchWrap());

    panel.addView(permissionButton(
        "Autoriser les alertes en veille",
        v -> requestBatteryOptimizationIfNeeded(true),
        COLOR_SUCCESS,
        Color.rgb(74, 222, 128)
    ), matchWrap());
    panel.addView(permissionButton(
        "Autoriser la notification plein ecran",
        v -> requestFullScreenIntentPermission(true),
        COLOR_PRIMARY,
        Color.rgb(147, 197, 253)
    ), matchWrap());

    TextView soundTitle = sectionTitle("Son de l'aidant");
    panel.addView(soundTitle, spacedParams(0, dp(24), 0, dp(8)));

    soundText = infoText();
    panel.addView(soundText, matchWrap());

    soundSpinner = new Spinner(this);
    soundSpinner.setAdapter(darkSpinnerAdapter(AlarmSounds.labels()));
    soundSpinner.setSelection(AlarmSounds.selectedIndex(prefs), false);
    soundSpinner.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
      @Override
      public void onItemSelected(AdapterView<?> parent, View view, int position, long id) {
        selectAlarmSound(position);
      }

      @Override
      public void onNothingSelected(AdapterView<?> parent) {
        // Keep the current sound.
      }
    });
    panel.addView(spinnerBox(soundSpinner), spacedParams(0, dp(8), 0, 0));
    testSoundButton = button("Tester le son", v -> toggleTestAlarm());
    panel.addView(testSoundButton, matchWrap());
  }

  private void buildPatientConfigPanel(LinearLayout panel) {
    TextView title = sectionTitle("Configurer le patient");
    panel.addView(title, spacedParams(0, 0, 0, dp(8)));

    TextView intro = infoText();
    intro.setText("Ce telephone cree son propre lien patient. L'aidant installe cette meme application, choisit Aidant, puis ouvre ou colle le lien.");
    panel.addView(intro, matchWrap());

    TextView aidantsTitle = sectionTitle("Aidants");
    panel.addView(aidantsTitle, spacedParams(0, dp(18), 0, dp(8)));

    patientAidantSpinner = new Spinner(this);
    patientAidantSpinner.setAdapter(darkSpinnerAdapter(new String[] { "Aidant principal" }));
    patientAidantSpinner.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
      @Override
      public void onItemSelected(AdapterView<?> parent, View view, int position, long id) {
        if (isRefreshingPatientAidantUi) {
          return;
        }
        selectPatientAidantAt(position);
      }

      @Override
      public void onNothingSelected(AdapterView<?> parent) {
        // Keep the current aidant selection.
      }
    });
    panel.addView(spinnerBox(patientAidantSpinner), matchWrap());

    LinearLayout selectedAidantActions = buttonRow();
    renamePatientAidantButton = compactRowButton("Renommer", v -> renameSelectedPatientAidant(), false);
    selectedAidantActions.addView(renamePatientAidantButton, rowButtonParams(false));
    deletePatientAidantButton = compactRowButton("Supprimer", v -> deleteSelectedPatientAidant(), true);
    selectedAidantActions.addView(deletePatientAidantButton, rowButtonParams(true));
    panel.addView(selectedAidantActions, spacedParams(0, dp(6), 0, 0));

    Button addAidantButton = compactFullButton("+ Ajouter un aidant", v -> addPatientAidant());
    panel.addView(addAidantButton, spacedParams(0, dp(8), 0, 0));

    patientAidantStatusText = messageTextView("", COLOR_MUTED, 14, false);
    patientAidantStatusText.setPadding(dp(4), dp(10), dp(4), 0);
    panel.addView(patientAidantStatusText, matchWrap());

    TextView linkTitle = sectionTitle("Lien de l'aidant selectionne");
    panel.addView(linkTitle, spacedParams(0, dp(24), 0, dp(8)));

    patientLinkText = infoText();
    panel.addView(patientLinkText, matchWrap());

    LinearLayout actions = buttonRow();
    actions.addView(rowButton("Copier", v -> copyPatientLink()), rowButtonParams(false));
    actions.addView(rowButton("Partager", v -> sharePatientLink()), rowButtonParams(true));
    panel.addView(actions, spacedParams(0, dp(8), 0, 0));

    Button regenerateButton = rowButton("Regenerer le lien patient", v -> confirmRegeneratePatientLink());
    regenerateButton.setBackground(roundedStroke(COLOR_WARNING_BG, Color.rgb(245, 158, 11), 18, 1));
    panel.addView(regenerateButton, matchWrap());
  }

  private void buildMessagesPanel(LinearLayout panel) {
    TextView messageTitle = sectionTitle("Messages");
    panel.addView(messageTitle, spacedParams(0, 0, 0, dp(8)));

    messagePatientSpinner = new Spinner(this);
    messagePatientSpinner.setAdapter(darkSpinnerAdapter(new String[] { "Aucun patient" }));
    messagePatientSpinner.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
      @Override
      public void onItemSelected(AdapterView<?> parent, View view, int position, long id) {
        if (isRefreshingPatientUi || position < 0 || position >= patientLinks.size()) {
          return;
        }
        selectedConnectionId = patientLinks.get(position).id;
        PatientLinkStore.select(prefs, selectedConnectionId);
        markMessagesRead();
        renderMessages();
      }

      @Override
      public void onNothingSelected(AdapterView<?> parent) {
        // Keep the current patient selection.
      }
    });
    panel.addView(spinnerBox(messagePatientSpinner), spacedParams(0, 0, 0, dp(12)));

    messageListContainer = new LinearLayout(this);
    messageListContainer.setOrientation(LinearLayout.VERTICAL);
    messageListContainer.setPadding(dp(12), dp(12), dp(12), dp(12));
    messageListContainer.setBackground(roundedStroke(COLOR_FIELD, COLOR_BORDER, 18, 1));
    messageListContainer.setMinimumHeight(dp(180));
    panel.addView(messageListContainer, matchWrap());

    messageInput = new EditText(this);
    messageInput.setSingleLine(false);
    messageInput.setMinLines(3);
    messageInput.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_MULTI_LINE);
    messageInput.setHint("Repondre a l'utilisateur...");
    messageInput.setTextSize(16);
    messageInput.setPadding(dp(12), dp(12), dp(12), dp(12));
    styleInput(messageInput);
    panel.addView(messageInput, spacedParams(0, dp(14), 0, 0));

    panel.addView(primaryButton("Envoyer le message", v -> sendMessage()), matchWrap());
  }

  private void buildPatientMessagesPanel(LinearLayout panel) {
    TextView messageTitle = sectionTitle("Messages");
    panel.addView(messageTitle, spacedParams(0, 0, 0, dp(8)));

    TextView aidantTitle = sectionTitle("Aidant");
    panel.addView(aidantTitle, spacedParams(0, dp(8), 0, dp(8)));

    patientMessageAidantSpinner = new Spinner(this);
    patientMessageAidantSpinner.setAdapter(darkSpinnerAdapter(new String[] { "Aidant principal" }));
    patientMessageAidantSpinner.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
      @Override
      public void onItemSelected(AdapterView<?> parent, View view, int position, long id) {
        if (isRefreshingPatientAidantUi) {
          return;
        }
        selectPatientAidantAt(position);
      }

      @Override
      public void onNothingSelected(AdapterView<?> parent) {
        // Keep the current aidant selection.
      }
    });
    panel.addView(spinnerBox(patientMessageAidantSpinner), matchWrap());

    patientMessageStatusText = infoText();
    panel.addView(patientMessageStatusText, spacedParams(0, dp(8), 0, dp(12)));

    patientMessageListContainer = new LinearLayout(this);
    patientMessageListContainer.setOrientation(LinearLayout.VERTICAL);
    patientMessageListContainer.setPadding(dp(12), dp(12), dp(12), dp(12));
    patientMessageListContainer.setBackground(roundedStroke(COLOR_FIELD, COLOR_BORDER, 18, 1));
    patientMessageListContainer.setMinimumHeight(dp(220));
    panel.addView(patientMessageListContainer, matchWrap());

    patientMessageInput = new EditText(this);
    patientMessageInput.setSingleLine(false);
    patientMessageInput.setMinLines(3);
    patientMessageInput.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_MULTI_LINE);
    patientMessageInput.setHint("Ecrire a l'aidant...");
    patientMessageInput.setTextSize(16);
    patientMessageInput.setPadding(dp(12), dp(12), dp(12), dp(12));
    styleInput(patientMessageInput);
    panel.addView(patientMessageInput, spacedParams(0, dp(14), 0, 0));

    panel.addView(primaryButton("Envoyer a l'aidant", v -> sendPatientMessage()), matchWrap());
  }

  private void buildHelpPanel(LinearLayout panel) {
    TextView title = sectionTitle("Mode d'emploi");
    panel.addView(title, spacedParams(0, 0, 0, dp(8)));

    TextView intro = infoText();
    intro.setText("Cette APK aidant permet de suivre plusieurs patients depuis le meme telephone. "
        + "Chaque lien correspond a une personne, avec ses alertes et ses messages.");
    panel.addView(intro, matchWrap());

    addHelpBlock(
        panel,
        "1. Ajouter un patient",
        "Sur le telephone patient, choisis Patient puis partage le lien. "
            + "Sur ce telephone aidant, ouvre le lien ou colle-le dans Configurer."
    );
    addHelpBlock(
        panel,
        "2. Donner un nom humain",
        "Une fois le lien ajoute, renomme-le avec le nom du patient. "
            + "La liste affiche ensuite ce nom a la place du lien."
    );
    addHelpBlock(
        panel,
        "3. Rester connecte aux alertes",
        "Dans Connexion, appuie sur le grand bouton Connecte. "
            + "Quand un patient appuie sur Appeler l'aidant, ce telephone sonne."
    );
    addHelpBlock(
        panel,
        "4. Gerer plusieurs patients",
        "Ajoute autant de liens que necessaire. Dans Configurer, choisis le patient utilise pour les messages, renomme-le ou supprime-le."
    );
    addHelpBlock(
        panel,
        "5. Lire et repondre aux messages",
        "Dans Messages, selectionne le patient, lis ses messages puis reponds avec Envoyer le message."
    );
    addHelpBlock(
        panel,
        "6. Ecouter les audios recus",
        "Quand un audio arrive, ouvre Messages puis appuie simplement sur Lire le fichier audio recu pour lancer la lecture."
    );
    addHelpBlock(
        panel,
        "7. Sonnerie et notifications",
        "Dans Configurer, choisis ou teste le son de l'aidant. Autorise aussi les alertes en veille, la notification plein ecran et les notifications Android."
    );
  }

  private void buildPatientHelpPanel(LinearLayout panel) {
    TextView title = sectionTitle("Mode d'emploi patient");
    panel.addView(title, spacedParams(0, 0, 0, dp(8)));

    TextView intro = infoText();
    intro.setText("Le mode Patient rend Ma Voix Aidant autonome : il cree le lien, appelle l'aidant et permet d'envoyer des messages sans l'app principale.");
    panel.addView(intro, matchWrap());

    addHelpBlock(
        panel,
        "1. Choisir Patient",
        "Le bouton Patient en haut de l'ecran active les fonctions du telephone qui demande de l'aide."
    );
    addHelpBlock(
        panel,
        "2. Donner le lien a l'aidant",
        "Dans Configurer, copie ou partage le lien. L'aidant installe la meme application, choisit Aidant, puis ouvre ou colle ce lien."
    );
    addHelpBlock(
        panel,
        "3. Appeler l'aidant",
        "Dans Appel, appuie sur Appeler l'aidant. Le serveur envoie l'alerte au telephone aidant connecte."
    );
    addHelpBlock(
        panel,
        "4. Echanger des messages",
        "Dans Messages, ecris a l'aidant. Les reponses arrivent dans cette meme conversation."
    );
    addHelpBlock(
        panel,
        "5. Changer le lien",
        "Regenerer le lien coupe l'ancien acces. Fais-le seulement si le lien a ete partage au mauvais endroit."
    );
  }

  private void addHelpBlock(LinearLayout panel, String title, String body) {
    LinearLayout block = new LinearLayout(this);
    block.setOrientation(LinearLayout.VERTICAL);
    block.setPadding(dp(12), dp(12), dp(12), dp(12));
    block.setBackground(roundedStroke(COLOR_SECONDARY, COLOR_BORDER, 16, 1));

    block.addView(messageTextView(title, COLOR_TEXT, 17, true), matchWrap());
    block.addView(messageTextView(body, COLOR_MUTED, 15, false), spacedParams(0, dp(6), 0, 0));
    panel.addView(block, spacedParams(0, dp(10), 0, 0));
  }

  private LinearLayout panel() {
    LinearLayout panel = new LinearLayout(this);
    panel.setOrientation(LinearLayout.VERTICAL);
    panel.setPadding(dp(16), dp(16), dp(16), dp(16));
    panel.setBackground(roundedStroke(COLOR_CARD, COLOR_BORDER, 22, 1));
    return panel;
  }

  private TextView sectionTitle(String label) {
    TextView title = new TextView(this);
    title.setText(label);
    title.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
    title.setTextColor(COLOR_TEXT);
    title.setTextSize(20);
    return title;
  }

  private TextView infoText() {
    TextView textView = new TextView(this);
    textView.setTextColor(COLOR_MUTED);
    textView.setTextSize(15);
    textView.setPadding(dp(12), dp(12), dp(12), dp(12));
    textView.setBackground(roundedStroke(COLOR_SECONDARY, COLOR_BORDER, 16, 1));
    return textView;
  }

  private TextView messageTextView(String value, int color, float size, boolean bold) {
    TextView textView = new TextView(this);
    textView.setText(value);
    textView.setTextColor(color);
    textView.setTextSize(size);
    textView.setLineSpacing(0, 1.08f);
    if (bold) {
      textView.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
    }
    return textView;
  }

  private void showSection(String section) {
    currentSection = section;
    if (connectionPanel == null || configPanel == null || messagesPanel == null || helpPanel == null
        || patientCallPanel == null || patientConfigPanel == null || patientMessagesPanel == null || patientHelpPanel == null) {
      return;
    }

    if (roleChoiceVisible) {
      showOnlyRoleChoice();
      return;
    }

    if (roleChoicePanel != null) {
      roleChoicePanel.setVisibility(View.GONE);
    }
    if (roleChoiceBackButton != null) {
      roleChoiceBackButton.setVisibility(View.VISIBLE);
    }
    if (bottomNavigation != null) {
      bottomNavigation.setVisibility(View.VISIBLE);
    }

    boolean patientRole = isPatientRole();
    connectionPanel.setVisibility(!patientRole && "connexion".equals(section) ? View.VISIBLE : View.GONE);
    configPanel.setVisibility(!patientRole && "configurer".equals(section) ? View.VISIBLE : View.GONE);
    messagesPanel.setVisibility(!patientRole && "messages".equals(section) ? View.VISIBLE : View.GONE);
    helpPanel.setVisibility(!patientRole && "aide".equals(section) ? View.VISIBLE : View.GONE);

    patientCallPanel.setVisibility(patientRole && "connexion".equals(section) ? View.VISIBLE : View.GONE);
    patientConfigPanel.setVisibility(patientRole && "configurer".equals(section) ? View.VISIBLE : View.GONE);
    patientMessagesPanel.setVisibility(patientRole && "messages".equals(section) ? View.VISIBLE : View.GONE);
    patientHelpPanel.setVisibility(patientRole && "aide".equals(section) ? View.VISIBLE : View.GONE);

    if ("messages".equals(section)) {
      markMessagesRead();
    }
    renderMessages();
    renderPatientMessages();
    renderUnreadMessages();
    updateRoleChoiceCards();
    updateBottomNavigation();
    resetContentScroll();
  }

  private void showRoleChoice() {
    roleChoiceVisible = true;
    shouldListenMessages = false;
    disconnectMessages();
    showOnlyRoleChoice();
  }

  private void showRoleChoiceFromModeButton() {
    showRoleChoice();
  }

  private boolean shouldShowRoleChoiceOnStartup(boolean openedLink) {
    return !openedLink && !hasSavedRole();
  }

  private void showOnlyRoleChoice() {
    if (roleChoicePanel != null) {
      roleChoicePanel.setVisibility(View.VISIBLE);
    }
    if (roleChoiceBackButton != null) {
      roleChoiceBackButton.setVisibility(View.GONE);
    }
    if (bottomNavigation != null) {
      bottomNavigation.setVisibility(View.GONE);
    }

    setPanelVisible(connectionPanel, false);
    setPanelVisible(configPanel, false);
    setPanelVisible(messagesPanel, false);
    setPanelVisible(helpPanel, false);
    setPanelVisible(patientCallPanel, false);
    setPanelVisible(patientConfigPanel, false);
    setPanelVisible(patientMessagesPanel, false);
    setPanelVisible(patientHelpPanel, false);
    updateRoleChoiceCards();
    resetContentScroll();
  }

  private void showMainApp() {
    roleChoiceVisible = false;
    if (roleChoicePanel != null) {
      roleChoicePanel.setVisibility(View.GONE);
    }
    if (roleChoiceBackButton != null) {
      roleChoiceBackButton.setVisibility(View.VISIBLE);
    }
    if (bottomNavigation != null) {
      bottomNavigation.setVisibility(View.VISIBLE);
    }
    showSection("connexion".equals(currentSection) || "configurer".equals(currentSection)
        || "messages".equals(currentSection) || "aide".equals(currentSection)
        ? currentSection
        : "connexion");
  }

  private void setPanelVisible(View panel, boolean visible) {
    if (panel != null) {
      panel.setVisibility(visible ? View.VISIBLE : View.GONE);
    }
  }

  private void resetContentScroll() {
    if (contentScrollView == null) return;
    contentScrollView.post(() -> contentScrollView.scrollTo(0, 0));
  }

  private LinearLayout buildBottomNavigation() {
    LinearLayout nav = new LinearLayout(this);
    nav.setOrientation(LinearLayout.HORIZONTAL);
    nav.setGravity(Gravity.CENTER);
    nav.setPadding(dp(8), dp(6), dp(8), dp(8));
    nav.setBackground(roundedStroke(COLOR_CARD, COLOR_BORDER, 0, 1));

    connectionTab = bottomNavItem("⌁", "Connexion", "connexion");
    configTab = bottomNavItem("☷", "Configurer", "configurer");
    messagesTab = bottomNavItem("●", "Messages", "messages");
    helpTab = bottomNavItem("?", "Aide", "aide");

    nav.addView(connectionTab, bottomNavItemParams());
    nav.addView(configTab, bottomNavItemParams());
    nav.addView(messagesTab, bottomNavItemParams());
    nav.addView(helpTab, bottomNavItemParams());
    return nav;
  }

  private LinearLayout bottomNavItem(String icon, String label, String section) {
    LinearLayout item = new LinearLayout(this);
    item.setOrientation(LinearLayout.VERTICAL);
    item.setGravity(Gravity.CENTER);
    item.setPadding(dp(4), dp(8), dp(4), dp(8));
    item.setMinimumHeight(dp(86));
    item.setClickable(true);
    item.setFocusable(true);
    item.setContentDescription(label);
    item.setOnClickListener(v -> showSection(section));

    TextView iconView = new TextView(this);
    iconView.setText(icon);
    iconView.setTextSize(28);
    iconView.setGravity(Gravity.CENTER);
    iconView.setIncludeFontPadding(false);
    item.addView(iconView, matchWrap());

    TextView labelView = new TextView(this);
    labelView.setText(label);
    labelView.setTextSize(15);
    labelView.setGravity(Gravity.CENTER);
    labelView.setIncludeFontPadding(false);
    item.addView(labelView, spacedParams(0, dp(6), 0, 0));

    return item;
  }

  private LinearLayout.LayoutParams bottomNavItemParams() {
    return new LinearLayout.LayoutParams(
        0,
        dp(88),
        1f
    );
  }

  private void updateBottomNavigation() {
    if (isPatientRole()) {
      setBottomNavItem(connectionTab, "!", "Appel");
      setBottomNavItem(configTab, "+", "Partager");
      setBottomNavItem(messagesTab, "●", "Messages");
      setBottomNavItem(helpTab, "?", "Aide");
    } else {
      setBottomNavItem(connectionTab, "⌁", "Connexion");
      setBottomNavItem(configTab, "☷", "Configurer");
      setBottomNavItem(messagesTab, "●", "Messages");
      setBottomNavItem(helpTab, "?", "Aide");
    }

    styleBottomNavItem(connectionTab, "connexion".equals(currentSection));
    styleBottomNavItem(configTab, "configurer".equals(currentSection));
    styleBottomNavItem(messagesTab, "messages".equals(currentSection));
    styleBottomNavItem(helpTab, "aide".equals(currentSection));
  }

  private void setBottomNavItem(LinearLayout item, String icon, String label) {
    if (item == null || item.getChildCount() < 2) return;

    View iconView = item.getChildAt(0);
    View labelView = item.getChildAt(1);
    if (iconView instanceof TextView) {
      ((TextView) iconView).setText(icon);
    }
    if (labelView instanceof TextView) {
      ((TextView) labelView).setText(label);
    }
    item.setContentDescription(label);
  }

  private void styleBottomNavItem(LinearLayout item, boolean selected) {
    if (item == null) return;

    int color = selected ? COLOR_PRIMARY : COLOR_MUTED;
    item.setSelected(selected);
    item.setBackground(
        selected
            ? roundedStroke(Color.rgb(15, 23, 42), Color.rgb(30, 64, 175), 18, 1)
            : rounded(Color.TRANSPARENT, 18)
    );

    for (int index = 0; index < item.getChildCount(); index++) {
      View child = item.getChildAt(index);
      if (child instanceof TextView) {
        TextView textView = (TextView) child;
        textView.setTextColor(color);
        textView.setTypeface(
            selected
                ? android.graphics.Typeface.DEFAULT_BOLD
                : android.graphics.Typeface.DEFAULT
        );
      }
    }
  }

  private Button primaryButton(String label, View.OnClickListener listener) {
    Button button = button(label, listener);
    button.setTextColor(COLOR_TEXT);
    button.setBackground(rounded(COLOR_PRIMARY, 18));
    return button;
  }

  private Button permissionButton(
      String label,
      View.OnClickListener listener,
      int fillColor,
      int strokeColor
  ) {
    Button button = button(label, listener);
    button.setTextSize(18);
    button.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
    button.setMinHeight(dp(64));
    button.setBackground(roundedStroke(fillColor, strokeColor, 20, 2));
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
      button.setElevation(dp(4));
    }
    return button;
  }

  private Button button(String label, View.OnClickListener listener) {
    Button button = new Button(this);
    button.setAllCaps(false);
    button.setText(label);
    button.setTextColor(COLOR_TEXT);
    button.setTextSize(18);
    button.setMinHeight(dp(54));
    button.setBackground(roundedStroke(COLOR_SECONDARY, COLOR_BORDER, 18, 1));
    button.setOnClickListener(listener);
    LinearLayout.LayoutParams params = matchWrap();
    params.setMargins(0, dp(8), 0, 0);
    button.setLayoutParams(params);
    return button;
  }

  private LinearLayout buttonRow() {
    LinearLayout row = new LinearLayout(this);
    row.setOrientation(LinearLayout.HORIZONTAL);
    return row;
  }

  private Button rowButton(String label, View.OnClickListener listener) {
    Button button = button(label, listener);
    button.setMinHeight(dp(48));
    button.setTextSize(16);
    return button;
  }

  private Button compactRowButton(String label, View.OnClickListener listener, boolean warning) {
    Button button = rowButton(label, listener);
    button.setMinHeight(dp(44));
    button.setTextSize(15);
    button.setTextColor(warning ? Color.rgb(251, 191, 36) : COLOR_TEXT);
    button.setBackground(roundedStroke(
        COLOR_SECONDARY,
        warning ? Color.rgb(245, 158, 11) : COLOR_BORDER,
        14,
        1
    ));
    return button;
  }

  private Button compactFullButton(String label, View.OnClickListener listener) {
    Button button = button(label, listener);
    button.setMinHeight(dp(48));
    button.setTextSize(16);
    button.setBackground(roundedStroke(COLOR_CARD, COLOR_BORDER, 14, 1));
    return button;
  }

  private LinearLayout.LayoutParams rowButtonParams(boolean withLeftMargin) {
    LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
        0,
        LinearLayout.LayoutParams.WRAP_CONTENT,
        1f
    );
    if (withLeftMargin) {
      params.setMargins(dp(8), 0, 0, 0);
    }
    return params;
  }

  private void styleInput(EditText input) {
    input.setTextColor(COLOR_TEXT);
    input.setHintTextColor(Color.rgb(148, 163, 184));
    input.setBackground(roundedStroke(COLOR_FIELD, COLOR_BORDER, 18, 1));
  }

  private FrameLayout spinnerBox(Spinner spinner) {
    FrameLayout box = new FrameLayout(this);
    box.setMinimumHeight(dp(54));
    box.setBackground(roundedStroke(COLOR_CARD, COLOR_BORDER, 18, 1));
    box.setOnClickListener(v -> spinner.performClick());

    spinner.setBackgroundColor(Color.TRANSPARENT);
    spinner.setPadding(dp(2), 0, dp(42), 0);
    FrameLayout.LayoutParams spinnerParams = new FrameLayout.LayoutParams(
        FrameLayout.LayoutParams.MATCH_PARENT,
        FrameLayout.LayoutParams.WRAP_CONTENT,
        Gravity.CENTER_VERTICAL
    );
    box.addView(spinner, spinnerParams);

    TextView arrow = new TextView(this);
    arrow.setText("\u25BE");
    arrow.setTextColor(COLOR_TEXT);
    arrow.setTextSize(18);
    arrow.setGravity(Gravity.CENTER);
    arrow.setIncludeFontPadding(false);
    arrow.setOnClickListener(v -> spinner.performClick());
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN) {
      arrow.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO);
    }
    FrameLayout.LayoutParams arrowParams = new FrameLayout.LayoutParams(
        dp(42),
        FrameLayout.LayoutParams.MATCH_PARENT,
        Gravity.RIGHT | Gravity.CENTER_VERTICAL
    );
    box.addView(arrow, arrowParams);
    return box;
  }

  private ArrayAdapter<String> darkSpinnerAdapter(String[] values) {
    return new ArrayAdapter<String>(this, android.R.layout.simple_spinner_item, values) {
      @Override
      public View getView(int position, View convertView, ViewGroup parent) {
        TextView view = (TextView) super.getView(position, convertView, parent);
        styleSpinnerText(view);
        return view;
      }

      @Override
      public View getDropDownView(int position, View convertView, ViewGroup parent) {
        TextView view = (TextView) super.getDropDownView(position, convertView, parent);
        styleSpinnerText(view);
        view.setBackgroundColor(COLOR_CARD);
        return view;
      }
    };
  }

  private void styleSpinnerText(TextView view) {
    view.setTextColor(COLOR_TEXT);
    view.setTextSize(18);
    view.setPadding(dp(12), dp(12), dp(12), dp(12));
  }

  private GradientDrawable rounded(int color, int radiusDp) {
    GradientDrawable drawable = new GradientDrawable();
    drawable.setColor(color);
    drawable.setCornerRadius(dp(radiusDp));
    return drawable;
  }

  private GradientDrawable roundedStroke(int color, int strokeColor, int radiusDp, int strokeDp) {
    GradientDrawable drawable = rounded(color, radiusDp);
    drawable.setStroke(dp(strokeDp), strokeColor);
    return drawable;
  }

  private String readSavedRole() {
    String savedRole = prefs.getString(AlertContract.KEY_APP_ROLE, AlertContract.ROLE_AIDANT);
    if (AlertContract.ROLE_PATIENT.equals(savedRole)) {
      return AlertContract.ROLE_PATIENT;
    }
    return AlertContract.ROLE_AIDANT;
  }

  private boolean hasSavedRole() {
    String savedRole = prefs.getString(AlertContract.KEY_APP_ROLE, "");
    return AlertContract.ROLE_PATIENT.equals(savedRole)
        || AlertContract.ROLE_AIDANT.equals(savedRole);
  }

  private boolean isPatientRole() {
    return AlertContract.ROLE_PATIENT.equals(currentRole);
  }

  private void selectRole(String role) {
    String nextRole = AlertContract.ROLE_PATIENT.equals(role)
        ? AlertContract.ROLE_PATIENT
        : AlertContract.ROLE_AIDANT;

    currentRole = nextRole;
    prefs.edit().putString(AlertContract.KEY_APP_ROLE, currentRole).apply();
    shouldListenMessages = false;
    disconnectMessages();

    if (isPatientRole()) {
      stopService(new Intent(this, AlarmListenerService.class));
      patientProfile = PatientProfileStore.readOrCreate(prefs);
    } else {
      reloadPatientLinks();
      syncAlertServiceWithPatients();
    }

    showMainApp();
    refreshUi();
    connectMessagesFromPrefs();
  }

  private void updateRoleChoiceCards() {
    styleRoleChoiceCard(patientRoleCard, isPatientRole());
    styleRoleChoiceCard(aidantRoleCard, !isPatientRole());
  }

  private void styleRoleChoiceCard(LinearLayout card, boolean selected) {
    if (card == null) return;

    card.setBackground(
        selected
            ? roundedStroke(Color.rgb(30, 58, 138), Color.rgb(147, 197, 253), 22, 2)
            : roundedStroke(COLOR_SECONDARY, COLOR_BORDER, 22, 1)
    );
  }

  private void reloadPatientLinks() {
    patientLinks.clear();
    patientLinks.addAll(PatientLinkStore.read(prefs));
    selectedConnectionId = PatientLinkStore.selectedId(prefs, patientLinks);
  }

  private PatientLinkStore.Link selectedLink() {
    return PatientLinkStore.findById(patientLinks, selectedConnectionId);
  }

  private int selectedLinkIndex() {
    for (int index = 0; index < patientLinks.size(); index++) {
      if (patientLinks.get(index).id.equals(selectedConnectionId)) {
        return index;
      }
    }
    return 0;
  }

  private void renderPatientUi() {
    renderConnectionList();
    renderPatientSpinner();
  }

  private void refreshPatientUi() {
    patientProfile = PatientProfileStore.readOrCreate(prefs);
    if (patientLinkText != null) {
      patientLinkText.setText(
          patientProfile.aidantDisplayName()
              + "\n"
              + PatientProfileStore.buildAlertLink(patientProfile)
      );
    }
    if (patientMessageStatusText != null && patientMessageStatusText.getText().toString().trim().isEmpty()) {
      patientMessageStatusText.setText("Conversation patient prete.");
    }
    updatePatientCallButton();
    updatePatientConnectionStatus();
    renderPatientAidantUi();
    renderPatientMessages();
  }

  private void copyPatientLink() {
    copyPatientLink(PatientProfileStore.selectedAidantLink(prefs));
  }

  private void sharePatientLink() {
    sharePatientLink(PatientProfileStore.selectedAidantLink(prefs));
  }

  private void copyPatientLink(PatientProfileStore.AidantLink link) {
    PatientProfileStore.Profile profile = PatientProfileStore.profileForAidant(prefs, link);
    copyText("Lien patient Ma Voix Aidant", PatientProfileStore.buildAlertLink(profile));
    toast("Lien " + profile.aidantDisplayName() + " copie.");
  }

  private void sharePatientLink(PatientProfileStore.AidantLink link) {
    PatientProfileStore.Profile profile = PatientProfileStore.profileForAidant(prefs, link);
    Intent shareIntent = new Intent(Intent.ACTION_SEND);
    shareIntent.setType("text/plain");
    shareIntent.putExtra(Intent.EXTRA_TEXT, PatientProfileStore.buildShareMessage(profile));
    startActivity(Intent.createChooser(shareIntent, "Envoyer le lien a " + profile.aidantDisplayName()));
  }

  private void confirmRegeneratePatientLink() {
    confirmRegeneratePatientLink(PatientProfileStore.selectedAidantLink(prefs));
  }

  private void confirmRegeneratePatientLink(PatientProfileStore.AidantLink link) {
    new AlertDialog.Builder(this)
        .setTitle("Regenerer le lien patient ?")
        .setMessage("L'ancien lien de " + link.name + " ne recevra plus les nouvelles alertes. Il faudra envoyer le nouveau lien a cet aidant.")
        .setPositiveButton("Regenerer", (dialog, which) -> {
          PatientProfileStore.regenerateAidant(prefs, link.id);
          PatientProfileStore.selectAidant(prefs, link.id);
          patientProfile = PatientProfileStore.readOrCreate(prefs);
          shouldListenMessages = false;
          disconnectMessages();
          refreshPatientUi();
          connectMessagesFromPrefs();
          toast("Nouveau lien patient cree.");
        })
        .setNegativeButton("Annuler", null)
        .show();
  }

  private void addPatientAidant() {
    EditText nameInput = new EditText(this);
    nameInput.setSingleLine(true);
    nameInput.setHint("Nom de l'aidant");
    nameInput.setPadding(dp(12), dp(12), dp(12), dp(12));
    styleInput(nameInput);

    new AlertDialog.Builder(this)
        .setTitle("Ajouter un aidant")
        .setView(nameInput)
        .setPositiveButton("Ajouter", (dialog, which) -> {
          PatientProfileStore.addAidant(prefs, nameInput.getText().toString());
          patientProfile = PatientProfileStore.readOrCreate(prefs);
          refreshPatientUi();
          connectMessagesFromPrefs();
          toast("Aidant ajoute.");
        })
        .setNegativeButton("Annuler", null)
        .show();
  }

  private void renamePatientAidant(PatientProfileStore.AidantLink link) {
    EditText nameInput = new EditText(this);
    nameInput.setSingleLine(true);
    nameInput.setText(link.name);
    nameInput.setSelectAllOnFocus(true);
    nameInput.setPadding(dp(12), dp(12), dp(12), dp(12));
    styleInput(nameInput);

    new AlertDialog.Builder(this)
        .setTitle("Nom de l'aidant")
        .setView(nameInput)
        .setPositiveButton("Enregistrer", (dialog, which) -> {
          PatientProfileStore.renameAidant(prefs, link.id, nameInput.getText().toString());
          patientProfile = PatientProfileStore.readOrCreate(prefs);
          refreshPatientUi();
          toast("Aidant renomme.");
        })
        .setNegativeButton("Annuler", null)
        .show();
  }

  private void renameSelectedPatientAidant() {
    renamePatientAidant(PatientProfileStore.selectedAidantLink(prefs));
  }

  private void deletePatientAidant(PatientProfileStore.AidantLink link) {
    new AlertDialog.Builder(this)
        .setTitle("Supprimer cet aidant ?")
        .setMessage("Le lien de " + link.name + " sera retire du mode patient.")
        .setPositiveButton("Supprimer", (dialog, which) -> {
          PatientProfileStore.deleteAidant(prefs, link.id);
          for (int index = messages.size() - 1; index >= 0; index--) {
            if (link.id.equals(messages.get(index).connectionId)) {
              messages.remove(index);
            }
          }
          patientProfile = PatientProfileStore.readOrCreate(prefs);
          refreshPatientUi();
          connectMessagesFromPrefs();
          toast("Aidant supprime.");
        })
        .setNegativeButton("Annuler", null)
        .show();
  }

  private void deleteSelectedPatientAidant() {
    deletePatientAidant(PatientProfileStore.selectedAidantLink(prefs));
  }

  private void renderPatientAidantUi() {
    ArrayList<PatientProfileStore.AidantLink> links = PatientProfileStore.readOrCreateAidantLinks(prefs);
    PatientProfileStore.AidantLink selected = PatientProfileStore.selectedAidantLink(prefs);
    isRefreshingPatientAidantUi = true;
    renderPatientAidantSpinner(patientAidantSpinner, links, selected);
    renderPatientAidantSpinner(patientMessageAidantSpinner, links, selected);
    isRefreshingPatientAidantUi = false;
    updatePatientAidantActionButtons(selected);
    updatePatientAidantStatus(selected);
  }

  private void updatePatientAidantActionButtons(PatientProfileStore.AidantLink selected) {
    boolean hasSelectedAidant = selected != null;
    if (renamePatientAidantButton != null) {
      renamePatientAidantButton.setEnabled(hasSelectedAidant);
    }
    if (deletePatientAidantButton != null) {
      deletePatientAidantButton.setEnabled(hasSelectedAidant);
    }
  }

  private void updatePatientAidantStatus(PatientProfileStore.AidantLink selected) {
    if (patientAidantStatusText == null) return;

    String name = selected == null ? "Aucun aidant" : selected.name;
    patientAidantStatusText.setText("Actif pour l'appel et les messages : " + name);
  }

  private void renderPatientAidantSpinner(
      Spinner spinner,
      ArrayList<PatientProfileStore.AidantLink> links,
      PatientProfileStore.AidantLink selected
  ) {
    if (spinner == null || links == null || links.isEmpty()) return;

    String[] labels = new String[links.size()];
    int selectedIndex = 0;
    for (int index = 0; index < links.size(); index++) {
      labels[index] = links.get(index).name;
      if (selected != null && links.get(index).id.equals(selected.id)) {
        selectedIndex = index;
      }
    }
    spinner.setAdapter(darkSpinnerAdapter(labels));
    spinner.setSelection(selectedIndex);
  }

  private void selectPatientAidantAt(int position) {
    ArrayList<PatientProfileStore.AidantLink> links = PatientProfileStore.readOrCreateAidantLinks(prefs);
    if (position < 0 || position >= links.size()) {
      return;
    }

    PatientProfileStore.selectAidant(prefs, links.get(position).id);
    patientProfile = PatientProfileStore.readOrCreate(prefs);
    refreshPatientUi();
    if ("messages".equals(currentSection)) {
      markMessagesRead();
    }
  }

  private void copyText(String label, String value) {
    ClipboardManager clipboard = (ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
    if (clipboard == null) {
      return;
    }
    clipboard.setPrimaryClip(ClipData.newPlainText(label, value == null ? "" : value));
  }

  private void updatePatientCallButton() {
    if (patientCallButton == null) return;

    PatientProfileStore.Profile selectedProfile = patientProfile == null
        ? PatientProfileStore.readOrCreate(prefs)
        : patientProfile;
    patientCallButton.setEnabled(!patientAlertSending);
    patientCallButton.setText(patientAlertSending
        ? "ENVOI DE L'ALERTE..."
        : "ALARME\nAppeler " + selectedProfile.aidantDisplayName());
    applyPatientAlarmButtonStyle(patientAlertSending);
  }

  private void applyPatientAlarmButtonStyle(boolean sending) {
    if (patientCallButton == null) return;

    patientCallButton.setTextColor(COLOR_TEXT);
    patientCallButton.setBackground(roundedStroke(
        sending ? COLOR_WARNING_BG : Color.rgb(185, 28, 28),
        sending ? Color.rgb(245, 158, 11) : Color.rgb(254, 202, 202),
        30,
        3
    ));
  }

  private void updatePatientConnectionStatus() {
    PatientProfileStore.Profile selectedProfile = patientProfile == null
        ? PatientProfileStore.readOrCreate(prefs)
        : patientProfile;
    boolean selectedStreamConnected = connectedMessageIds.contains(selectedProfile.aidantId);
    int connectedCaregivers = patientAidantPresence.containsKey(selectedProfile.aidantId)
        ? patientAidantPresence.get(selectedProfile.aidantId)
        : 0;
    boolean aidantConnected = isAidantConnected(selectedProfile.aidantId);

    updatePatientStatusPill(aidantConnected);
    updatePatientMessageAidantStatus(selectedProfile, selectedStreamConnected, connectedCaregivers, aidantConnected);

    if (patientConnectionStatusText == null) return;

    if (!selectedStreamConnected) {
      patientConnectionStatusText.setText("Connexion messages en cours pour " + selectedProfile.aidantDisplayName() + ".");
      return;
    }

    if (connectedCaregivers > 0) {
      patientConnectionStatusText.setText(connectedCaregivers == 1
          ? selectedProfile.aidantDisplayName() + " est connecte a cette conversation."
          : connectedCaregivers + " appareils sont connectes pour " + selectedProfile.aidantDisplayName() + ".");
      return;
    }

    patientConnectionStatusText.setText("Lien actif pour " + selectedProfile.aidantDisplayName() + ". Aucun appareil aidant n'est connecte pour le moment.");
  }

  private void updatePatientMessageAidantStatus(
      PatientProfileStore.Profile selectedProfile,
      boolean selectedStreamConnected,
      int connectedCaregivers,
      boolean aidantConnected
  ) {
    if (patientMessageStatusText == null || selectedProfile == null) return;

    if (!selectedStreamConnected) {
      patientMessageStatusText.setText(selectedProfile.aidantDisplayName() + " : connexion en cours");
    } else if (connectedCaregivers > 0) {
      patientMessageStatusText.setText(selectedProfile.aidantDisplayName() + " : Connecté");
    } else {
      patientMessageStatusText.setText(selectedProfile.aidantDisplayName() + " : Déconnecté");
    }

    patientMessageStatusText.setBackground(roundedStroke(
        aidantConnected ? Color.rgb(20, 83, 45) : COLOR_WARNING_BG,
        aidantConnected ? Color.rgb(74, 222, 128) : Color.rgb(245, 158, 11),
        16,
        1
    ));
  }

  private void updatePatientStatusPill(boolean aidantConnected) {
    if (patientStatusText == null) return;

    patientStatusText.setText(aidantConnected ? "Connecté" : "Déconnecté");
    patientStatusText.setBackground(roundedStroke(
        aidantConnected ? Color.rgb(20, 83, 45) : COLOR_WARNING_BG,
        aidantConnected ? Color.rgb(74, 222, 128) : Color.rgb(245, 158, 11),
        16,
        1
    ));
  }

  private boolean isAidantConnected(String aidantId) {
    if (aidantId == null || aidantId.trim().isEmpty()) {
      return false;
    }
    int connectedCaregivers = patientAidantPresence.containsKey(aidantId)
        ? patientAidantPresence.get(aidantId)
        : 0;
    return connectedMessageIds.contains(aidantId) && connectedCaregivers > 0;
  }

  private void renderPatientSpinner() {
    if (messagePatientSpinner == null) return;

    isRefreshingPatientUi = true;
    String[] labels;
    if (patientLinks.isEmpty()) {
      labels = new String[] { "Aucun patient" };
    } else {
      labels = new String[patientLinks.size()];
      for (int index = 0; index < patientLinks.size(); index++) {
        labels[index] = patientLinks.get(index).name;
      }
    }

    messagePatientSpinner.setAdapter(darkSpinnerAdapter(labels));
    if (!patientLinks.isEmpty()) {
      messagePatientSpinner.setSelection(selectedLinkIndex());
    }
    isRefreshingPatientUi = false;
  }

  private void renderConnectionList() {
    if (connectionsListContainer == null) return;
    connectionsListContainer.removeAllViews();

    if (patientLinks.isEmpty()) {
      TextView empty = infoText();
      empty.setText("Aucun patient enregistré. Colle un lien puis appuie sur Ajouter ce lien patient.");
      connectionsListContainer.addView(empty, matchWrap());
      return;
    }

    for (PatientLinkStore.Link link : patientLinks) {
      LinearLayout card = new LinearLayout(this);
      card.setOrientation(LinearLayout.VERTICAL);
      card.setPadding(dp(12), dp(12), dp(12), dp(12));
      card.setBackground(roundedStroke(COLOR_SECONDARY, COLOR_BORDER, 16, 1));

      boolean selected = link.id.equals(selectedConnectionId);
      TextView title = messageTextView(
          (selected ? "✓ " : "") + link.name,
          COLOR_TEXT,
          17,
          true
      );
      card.addView(title, matchWrap());

      TextView detail = messageTextView(
          selected ? "Patient sélectionné pour les messages" : "Patient enregistré",
          COLOR_MUTED,
          13,
          false
      );
      card.addView(detail, spacedParams(0, dp(4), 0, dp(6)));

      if (!selected) {
        card.addView(button("Choisir pour les messages", v -> {
          selectedConnectionId = link.id;
          PatientLinkStore.select(prefs, selectedConnectionId);
          refreshUi();
        }), matchWrap());
      }
      LinearLayout actions = buttonRow();
      actions.addView(rowButton("Renommer", v -> renamePatient(link)), rowButtonParams(false));
      actions.addView(rowButton("Supprimer", v -> deletePatient(link)), rowButtonParams(true));
      card.addView(actions, spacedParams(0, dp(8), 0, 0));

      connectionsListContainer.addView(card, spacedParams(0, 0, 0, dp(10)));
    }
  }

  private void renamePatient(PatientLinkStore.Link link) {
    EditText nameInput = new EditText(this);
    nameInput.setSingleLine(true);
    nameInput.setText(link.name);
    nameInput.setSelectAllOnFocus(true);
    nameInput.setPadding(dp(12), dp(12), dp(12), dp(12));
    styleInput(nameInput);

    new AlertDialog.Builder(this)
        .setTitle("Nom du patient")
        .setView(nameInput)
        .setPositiveButton("Enregistrer", (dialog, which) -> {
          PatientLinkStore.rename(prefs, link.id, nameInput.getText().toString());
          refreshUi();
        })
        .setNegativeButton("Annuler", null)
        .show();
  }

  private void deletePatient(PatientLinkStore.Link link) {
    new AlertDialog.Builder(this)
        .setTitle("Supprimer ce patient ?")
        .setMessage("Le lien de " + link.name + " sera retiré de cet appareil aidant.")
        .setPositiveButton("Supprimer", (dialog, which) -> {
          PatientLinkStore.delete(prefs, link.id);
          for (int index = messages.size() - 1; index >= 0; index--) {
            if (link.id.equals(messages.get(index).connectionId)) {
              messages.remove(index);
            }
          }
          refreshUi();
          syncAlertServiceWithPatients();
          connectMessagesFromPrefs();
        })
        .setNegativeButton("Annuler", null)
        .show();
  }

  private void syncAlertServiceWithPatients() {
    Intent intent = new Intent(this, AlarmListenerService.class);
    intent.setAction(AlertContract.ACTION_START_LISTENING);

    if (patientLinks.isEmpty()) {
      stopService(intent);
      return;
    }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      startForegroundService(intent);
    } else {
      startService(intent);
    }
  }

  private String patientCountLabel(int count) {
    return count <= 1 ? "1 patient" : count + " patients";
  }

  private LinearLayout.LayoutParams matchWrap() {
    return new LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.MATCH_PARENT,
        LinearLayout.LayoutParams.WRAP_CONTENT
    );
  }

  private LinearLayout.LayoutParams spacedParams(int left, int top, int right, int bottom) {
    LinearLayout.LayoutParams params = matchWrap();
    params.setMargins(left, top, right, bottom);
    return params;
  }

  private boolean handleIntent(Intent intent, boolean autoConnect) {
    if (intent == null || intent.getData() == null) {
      return false;
    }

    Uri uri = intent.getData();
    if (saveLink(uri.toString())) {
      currentRole = AlertContract.ROLE_AIDANT;
      prefs.edit().putString(AlertContract.KEY_APP_ROLE, currentRole).apply();
      if (!autoConnect) {
        return true;
      }
      startListening();
      return true;
    }
    return false;
  }

  private boolean saveLinkFromInput() {
    String link = linkInput.getText().toString().trim();
    boolean saved = saveLink(link);
    refreshUi();
    if (saved) {
      syncAlertServiceWithPatients();
      toast("Lien patient enregistre.");
    }
    return saved;
  }

  private boolean saveLink(String link) {
    if (link == null || link.trim().isEmpty()) {
      toast("Lien manquant.");
      return false;
    }

    try {
      Uri uri = Uri.parse(link.trim());
      String channel = uri.getQueryParameter("channel");
      String accessKey = uri.getQueryParameter("key");
      if (accessKey == null || accessKey.trim().isEmpty()) {
        accessKey = uri.getQueryParameter("accessKey");
      }
      String apiBase = null;

      if ("http".equals(uri.getScheme()) || "https".equals(uri.getScheme())) {
        apiBase = AidantApiBaseValidator.normalize(uri.toString());
      } else if ("mavoix-aidant".equals(uri.getScheme())) {
        apiBase = AidantApiBaseValidator.normalize(uri.getQueryParameter("apiBase"));
      }

      if (channel == null || channel.trim().length() < 8) {
        toast("Le lien ne contient pas de canal valide.");
        return false;
      }

      if (apiBase == null || apiBase.trim().isEmpty()) {
        apiBase = AlertContract.DEFAULT_API_BASE;
      }

      if (!AidantApiBaseValidator.isAllowed(this, apiBase)) {
        toast("Serveur non autorise pour ce lien.");
        return false;
      }

      PatientLinkStore.addOrSelect(prefs, apiBase, channel.trim(), accessKey);
      return true;
    } catch (Exception ex) {
      toast("Lien invalide.");
      return false;
    }
  }

  private void pasteLink() {
    try {
      String clipboardText = readClipboardText();
      if (clipboardText == null || clipboardText.trim().isEmpty()) {
        toast("Aucun texte a coller.");
        return;
      }

      linkInput.setText(clipboardText.trim());
      if (saveLinkFromInput()) connectMessagesFromPrefs();
    } catch (Exception error) {
      toast("Impossible de lire le presse-papiers.");
    }
  }

  private String readClipboardText() {
    ClipboardManager clipboard = (ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
    if (clipboard == null || !clipboard.hasPrimaryClip()) {
      toast("Presse-papiers vide.");
      return null;
    }

    ClipData clip = clipboard.getPrimaryClip();
    if (clip == null || clip.getItemCount() == 0) {
      toast("Presse-papiers vide.");
      return null;
    }

    ClipData.Item item = clip.getItemAt(0);
    if (item == null) {
      return null;
    }

    CharSequence directText = item.getText();
    if (directText != null) {
      return directText.toString();
    }

    CharSequence htmlText = item.getHtmlText();
    if (htmlText != null) {
      return htmlText.toString();
    }

    if (item.getUri() != null) {
      return item.getUri().toString();
    }

    if (item.getIntent() != null) {
      return item.getIntent().toUri(Intent.URI_INTENT_SCHEME);
    }

    CharSequence coercedText = item.coerceToText(this);
    return coercedText == null ? null : coercedText.toString();
  }

  private void startListening() {
    reloadPatientLinks();
    if (patientLinks.isEmpty()) {
      if (!saveLinkFromInput()) {
        return;
      }
      reloadPatientLinks();
    }

    syncAlertServiceWithPatients();
    refreshUi();
    connectMessagesFromPrefs();
    toast("Connexion lancee pour " + patientCountLabel(patientLinks.size()) + ".");
    requestBatteryOptimizationIfNeeded(false);
    requestFullScreenIntentPermission(false);
  }

  private void requestBatteryOptimizationIfNeeded(boolean force) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
      if (force) {
        toast("Ce reglage n'est pas necessaire sur cette version Android.");
      }
      return;
    }

    PowerManager powerManager = (PowerManager) getSystemService(POWER_SERVICE);
    if (powerManager == null) {
      return;
    }

    if (powerManager.isIgnoringBatteryOptimizations(getPackageName())) {
      if (force) {
        toast("Les alertes en veille sont deja autorisees.");
      }
      return;
    }

    if (!force && prefs.getBoolean(AlertContract.KEY_BATTERY_OPTIMIZATION_PROMPTED, false)) {
      return;
    }

    if (!force) {
      prefs.edit().putBoolean(AlertContract.KEY_BATTERY_OPTIMIZATION_PROMPTED, true).apply();
    }

    new AlertDialog.Builder(this)
        .setTitle("Recevoir les alarmes telephone verrouille")
        .setMessage("Android peut endormir l'application pour economiser la batterie. "
            + "Pour les alarmes patient, autorise Ma Voix Aidant a rester active en veille.")
        .setPositiveButton("Autoriser", (dialog, which) -> openBatteryOptimizationRequest())
        .setNegativeButton("Plus tard", null)
        .show();
  }

  private void openBatteryOptimizationRequest() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
      return;
    }

    try {
      Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
      intent.setData(Uri.parse("package:" + getPackageName()));
      startActivity(intent);
    } catch (Exception requestFailed) {
      try {
        Intent fallback = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        fallback.setData(Uri.parse("package:" + getPackageName()));
        startActivity(fallback);
      } catch (Exception ignored) {
        toast("Ouvre les reglages Android pour autoriser l'application en arriere-plan.");
      }
    }
  }

  private void requestFullScreenIntentPermission(boolean force) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      if (force) {
        toast("La notification plein ecran est deja disponible sur cette version Android.");
      }
      return;
    }

    NotificationManager notificationManager = getSystemService(NotificationManager.class);
    if (notificationManager == null) {
      return;
    }

    if (notificationManager.canUseFullScreenIntent()) {
      if (force) {
        toast("La notification plein ecran est deja autorisee.");
      }
      return;
    }

    if (!force && prefs.getBoolean(AlertContract.KEY_FULL_SCREEN_INTENT_PROMPTED, false)) {
      return;
    }

    if (!force) {
      prefs.edit().putBoolean(AlertContract.KEY_FULL_SCREEN_INTENT_PROMPTED, true).apply();
    }

    new AlertDialog.Builder(this)
        .setTitle("Notification plein ecran")
        .setMessage("Pour afficher le bouton STOP sur l'ecran verrouille, autorise Ma Voix Aidant a envoyer des notifications plein ecran.")
        .setPositiveButton("Autoriser", (dialog, which) -> openFullScreenIntentSettings())
        .setNegativeButton("Plus tard", null)
        .show();
  }

  private void openFullScreenIntentSettings() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      return;
    }

    try {
      Intent intent = new Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT);
      intent.setData(Uri.parse("package:" + getPackageName()));
      startActivity(intent);
    } catch (Exception requestFailed) {
      try {
        Intent fallback = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        fallback.setData(Uri.parse("package:" + getPackageName()));
        startActivity(fallback);
      } catch (Exception ignored) {
        toast("Ouvre les reglages Android pour autoriser les notifications plein ecran.");
      }
    }
  }

  private void stopAlarm() {
    stopTestSoundPlayback();
    setTestingAlarmSound(false);
    Intent intent = new Intent(this, AlarmListenerService.class);
    intent.setAction(AlertContract.ACTION_STOP_ALARM);
    startService(intent);
  }

  private void toggleTestAlarm() {
    if (isTestingAlarmSound) {
      stopAlarm();
    } else {
      testAlarm();
    }
  }

  private void testAlarm() {
    stopTestSoundPlayback();
    setTestingAlarmSound(true);
    try {
      testSoundSession = AlarmSoundPlayer.startSelected(this, prefs, true);
      testSoundSession.setOnErrorListener((player, what, extra) -> {
        stopTestSoundPlayback();
        setTestingAlarmSound(false);
        toast("Impossible de tester le son.");
        return true;
      });
      if (testSoundSession.raisedAlarmVolume()) {
        toast("Volume alarme augmente pendant le test.");
      }
    } catch (Exception error) {
      stopTestSoundPlayback();
      try {
        testSoundSession = AlarmSoundPlayer.startSystemFallback(this, true);
        testSoundSession.setOnErrorListener((player, what, extra) -> {
          stopTestSoundPlayback();
          setTestingAlarmSound(false);
          toast("Impossible de tester le son.");
          return true;
        });
        toast("Son de secours du telephone utilise.");
      } catch (Exception fallbackError) {
        setTestingAlarmSound(false);
        toast("Impossible de tester le son.");
      }
    }
  }

  private void stopTestSoundPlayback() {
    if (testSoundSession == null) {
      return;
    }

    testSoundSession.stopAndRelease();
    testSoundSession = null;
  }

  private void setTestingAlarmSound(boolean testing) {
    isTestingAlarmSound = testing;
    updateTestSoundButton();
  }

  private void updateTestSoundButton() {
    if (testSoundButton == null) {
      return;
    }

    testSoundButton.setText(isTestingAlarmSound ? "Stopper" : "Tester le son");
    testSoundButton.setBackground(isTestingAlarmSound
        ? rounded(COLOR_DANGER, 18)
        : roundedStroke(COLOR_SECONDARY, COLOR_BORDER, 18, 1));
  }

  private void selectAlarmSound(int position) {
    if (isRefreshingSoundUi) {
      return;
    }

    AlarmSounds.Choice choice = AlarmSounds.choiceAt(position);
    String currentSoundId = prefs.getString(AlertContract.KEY_SOUND_ID, AlarmSounds.DEFAULT_ID);
    String legacySoundUri = prefs.getString(AlertContract.KEY_SOUND_URI, null);
    if (choice.id.equals(currentSoundId) && (legacySoundUri == null || legacySoundUri.trim().isEmpty())) {
      return;
    }

    prefs.edit()
        .putString(AlertContract.KEY_SOUND_ID, choice.id)
        .remove(AlertContract.KEY_SOUND_URI)
        .apply();
    refreshUi();
    toast("Son choisi: " + choice.label + ".");
  }

  private void connectMessagesFromPrefs() {
    if (isPatientRole()) {
      connectPatientMessagesFromPrefs();
      return;
    }

    reloadPatientLinks();
    if (patientLinks.isEmpty()) {
      disconnectMessages();
      setMessagesConnected(false);
      return;
    }
    startMessageListening(new ArrayList<>(patientLinks), "caregiver");
  }

  private void connectPatientMessagesFromPrefs() {
    patientProfile = PatientProfileStore.readOrCreate(prefs);
    ArrayList<PatientLinkStore.Link> links = new ArrayList<>();
    ArrayList<PatientProfileStore.AidantLink> aidantLinks = PatientProfileStore.readOrCreateAidantLinks(prefs);
    for (PatientProfileStore.AidantLink aidantLink : aidantLinks) {
      links.add(PatientProfileStore.profileForAidant(prefs, aidantLink).asLink());
    }
    startMessageListening(links, "user");
  }

  private void startMessageListening(ArrayList<PatientLinkStore.Link> links, String role) {
    shouldListenMessages = false;
    disconnectMessages();
    connectedMessageIds.clear();
    patientConnectedCaregivers = 0;
    patientAidantPresence.clear();
    int version = messageListenVersion + 1;
    messageListenVersion = version;
    shouldListenMessages = true;

    for (PatientLinkStore.Link link : links) {
      messageExecutor.execute(() -> messageLoop(link, version, role));
    }
  }

  private void messageLoop(PatientLinkStore.Link link, int version, String role) {
    while (shouldListenMessages && version == messageListenVersion) {
      HttpURLConnection nextConnection = null;
      try {
        String streamUrl = link.apiBase
            + "/api/caregiver-messages/stream?role="
            + URLEncoder.encode(role, "UTF-8")
            + "&channel="
            + URLEncoder.encode(link.channel, "UTF-8")
            + AidantMessageUtils.linkAccessKeyQuery(link);
        nextConnection = (HttpURLConnection) new URL(streamUrl).openConnection();
        synchronized (messageConnections) {
          messageConnections.put(link.id, nextConnection);
        }
        nextConnection.setConnectTimeout(15000);
        nextConnection.setReadTimeout(0);
        nextConnection.setRequestProperty("Accept", "text/event-stream");
        nextConnection.setRequestProperty("Cache-Control", "no-cache");

        int statusCode = nextConnection.getResponseCode();
        if (statusCode < 200 || statusCode >= 300) {
          throw new IllegalStateException("Stream HTTP " + statusCode);
        }

        setMessageConnectionState(link.id, true);
        BufferedReader reader = new BufferedReader(new InputStreamReader(
            nextConnection.getInputStream(),
            StandardCharsets.UTF_8
        ));

        String line;
        String eventName = "";
        StringBuilder dataBuilder = new StringBuilder();
        while (shouldListenMessages && version == messageListenVersion && (line = reader.readLine()) != null) {
          if (line.startsWith("event:")) {
            eventName = line.substring(6).trim();
          } else if (line.startsWith("data:")) {
            dataBuilder.append(line.substring(5).trim());
          } else if (line.isEmpty()) {
            dispatchMessageEvent(eventName, dataBuilder.toString(), link);
            eventName = "";
            dataBuilder.setLength(0);
          }
        }
      } catch (Exception ignored) {
        setMessageConnectionState(link.id, false);
        sleep(3000);
      } finally {
        disconnectMessage(link.id, nextConnection);
      }
    }
  }

  private void dispatchMessageEvent(String eventName, String data, PatientLinkStore.Link link) {
    try {
      if ("connected".equals(eventName)) {
        setMessageConnectionState(link.id, true);
        updatePatientPresence(data, link);
        return;
      }

      if ("caregiver-presence".equals(eventName)) {
        updatePatientPresence(data, link);
        return;
      }

      if ("caregiver-message-history".equals(eventName)) {
        JSONArray history = new JSONObject(data).optJSONArray("messages");
        if (history == null) return;

        for (int index = 0; index < history.length(); index++) {
          addMessage(MessageItem.fromJson(history.optJSONObject(index), link), false);
        }
        return;
      }

      if ("caregiver-message".equals(eventName)) {
        addMessage(MessageItem.fromJson(new JSONObject(data), link), true);
        return;
      }

      if ("caregiver-message-receipt".equals(eventName)) {
        applyMessageReceipt(new JSONObject(data), link);
      }
    } catch (Exception ignored) {
      // Ignore malformed event payloads.
    }
  }

  private void updatePatientPresence(String data, PatientLinkStore.Link link) {
    if (!isPatientRole()) return;

    try {
      JSONObject payload = new JSONObject(data == null || data.isEmpty() ? "{}" : data);
      patientConnectedCaregivers = payload.optInt("connectedCaregivers", patientConnectedCaregivers);
      if (link != null) {
        patientAidantPresence.put(link.id, patientConnectedCaregivers);
      }
    } catch (Exception ignored) {
      // Keep the previous presence count if the server event is malformed.
    }
    runOnUiThread(this::updatePatientConnectionStatus);
  }

  private void setMessageConnectionState(String connectionId, boolean connected) {
    runOnUiThread(() -> {
      if (connected) {
        connectedMessageIds.add(connectionId);
      } else {
        connectedMessageIds.remove(connectionId);
      }
      messagesConnected = !connectedMessageIds.isEmpty();
      updateConnectionStatus();
      updatePatientConnectionStatus();
    });
  }

  private void addMessage(MessageItem item, boolean notifyIncoming) {
    if (item == null || item.id.isEmpty()) return;

    runOnUiThread(() -> {
      for (int index = 0; index < messages.size(); index++) {
        MessageItem existing = messages.get(index);
        if (!existing.id.equals(item.id) || !existing.connectionId.equals(item.connectionId)) continue;

        MessageItem merged = existing.mergeReceipts(item);
        if (merged != existing) {
          messages.set(index, merged);
          renderMessages();
          renderPatientMessages();
          renderUnreadMessages();
        }
        return;
      }

      MessageItem nextItem = item;
      JSONObject pendingReceipt = pendingMessageReceipts.remove(receiptKey(item.connectionId, item.id));
      if (pendingReceipt != null) {
        nextItem = applyReceiptToItem(
            nextItem,
            pendingReceipt.optString("deliveredAt", ""),
            pendingReceipt.optString("readAt", ""),
            pendingReceipt.optString("readerRole", pendingReceipt.optString("recipientRole", ""))
        );
      }

      messages.add(nextItem);
      boolean incoming = isIncomingMessage(nextItem);
      if (incoming) {
        sendDeliveryReceipt(nextItem);
      }
      if (notifyIncoming && incoming) {
        playIncomingMessageSound();
        showIncomingMessageNotification(nextItem);
      }

      if (incoming && !readMessageIds.contains(nextItem.id)) {
        if (isVisibleMessage(nextItem)) {
          readMessageIds.add(nextItem.id);
          sendReadReceipt(nextItem);
        } else {
          unreadMessageIds.add(nextItem.id);
        }
      }
      renderMessages();
      renderPatientMessages();
      renderUnreadMessages();
    });
  }

  private void applyMessageReceipt(JSONObject payload, PatientLinkStore.Link link) {
    if (payload == null || link == null) return;

    JSONArray ids = payload.optJSONArray("messageIds");
    if (ids == null || ids.length() == 0) return;

    HashSet<String> receiptIds = new HashSet<>();
    for (int index = 0; index < ids.length(); index++) {
      String id = ids.optString(index, "");
      if (!id.isEmpty()) {
        receiptIds.add(id);
      }
    }
    if (receiptIds.isEmpty()) return;

    String recipientRole = payload.optString("recipientRole", payload.optString("readerRole", ""));
    String readerRole = payload.optString("readerRole", recipientRole);
    String deliveredAt = payload.optString("deliveredAt", "");
    String readAt = payload.optString("readAt", "");

    runOnUiThread(() -> {
      boolean changed = false;
      HashSet<String> appliedIds = new HashSet<>();
      for (int index = 0; index < messages.size(); index++) {
        MessageItem item = messages.get(index);
        if (!link.id.equals(item.connectionId) || !receiptIds.contains(item.id)) continue;

        appliedIds.add(item.id);
        MessageItem updated = applyReceiptToItem(item, deliveredAt, readAt, readerRole);

        if (updated != item) {
          messages.set(index, updated);
          changed = true;
        }
      }

      for (String id : receiptIds) {
        if (appliedIds.contains(id)) continue;
        try {
          JSONObject pendingReceipt = new JSONObject();
          pendingReceipt.put("deliveredAt", deliveredAt);
          pendingReceipt.put("readAt", readAt);
          pendingReceipt.put("readerRole", readerRole);
          pendingReceipt.put("recipientRole", recipientRole);
          pendingMessageReceipts.put(receiptKey(link.id, id), pendingReceipt);
        } catch (Exception ignored) {
          // Ignore malformed receipt cache entries.
        }
      }

      if (changed) {
        renderMessages();
        renderPatientMessages();
        renderUnreadMessages();
      }
    });
  }

  private MessageItem applyReceiptToItem(
      MessageItem item,
      String deliveredAt,
      String readAt,
      String readerRole
  ) {
    MessageItem updated = item;
    if (!deliveredAt.isEmpty()) {
      updated = updated.withDeliveredAt(deliveredAt);
    }
    if (!readAt.isEmpty()) {
      updated = updated.withReadAt(readerRole, readAt);
    }
    return updated;
  }

  private String receiptKey(String connectionId, String messageId) {
    return connectionId + ":" + messageId;
  }

  private void sendDeliveryReceipt(MessageItem item) {
    if (item == null || item.isDelivered()) return;

    PatientLinkStore.Link link = linkForMessage(item);
    if (link == null || !link.id.equals(item.connectionId)) return;

    ArrayList<String> ids = new ArrayList<>();
    ids.add(item.id);
    sendMessageReceipt(link, item, ids, "delivered");
  }

  private void sendReadReceipt(MessageItem item) {
    if (item == null) return;

    String role = currentReaderRole();
    if (item.isReadBy(role)) return;

    PatientLinkStore.Link link = currentMessageLink();
    if (link == null || !link.id.equals(item.connectionId)) return;

    ArrayList<String> ids = new ArrayList<>();
    ids.add(item.id);
    sendMessageReceipt(link, item, ids, "read");
  }

  private void sendMessageReceipt(
      PatientLinkStore.Link link,
      MessageItem item,
      ArrayList<String> ids,
      String receiptType
  ) {
    if (link == null || item == null || ids == null || ids.isEmpty()) return;
    if (!isIncomingMessage(item)) return;

    Set<String> pendingSet = "read".equals(receiptType)
        ? pendingReadReceiptIds
        : pendingDeliveryReceiptIds;
    ArrayList<String> idsToSend = new ArrayList<>();
    synchronized (pendingSet) {
      for (String id : ids) {
        String key = receiptType + ":" + link.id + ":" + id;
        if (pendingSet.add(key)) {
          idsToSend.add(id);
        }
      }
    }
    if (idsToSend.isEmpty()) return;

    String role = currentReaderRole();
    messageExecutor.execute(() -> postMessageReceipt(link, role, idsToSend, receiptType));
  }

  private void postMessageReceipt(
      PatientLinkStore.Link link,
      String role,
      ArrayList<String> ids,
      String receiptType
  ) {
    HttpURLConnection connection = null;
    try {
      URL url = new URL(link.apiBase + "/api/caregiver-messages/" + receiptType);
      connection = (HttpURLConnection) url.openConnection();
      connection.setRequestMethod("POST");
      connection.setConnectTimeout(15000);
      connection.setReadTimeout(15000);
      connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
      connection.setDoOutput(true);

      String roleField = "read".equals(receiptType) ? "readerRole" : "recipientRole";
      String body = "{"
          + "\"channel\":\"" + AidantMessageUtils.escapeJson(link.channel) + "\","
          + "\"accessKey\":\"" + AidantMessageUtils.escapeJson(link.accessKey) + "\","
          + "\"" + roleField + "\":\"" + AidantMessageUtils.escapeJson(role) + "\","
          + "\"messageIds\":" + messageIdsJson(ids)
          + "}";
      try (OutputStream outputStream = connection.getOutputStream()) {
        outputStream.write(body.getBytes(StandardCharsets.UTF_8));
      }

      int statusCode = connection.getResponseCode();
      InputStream stream = statusCode >= 200 && statusCode < 300
          ? connection.getInputStream()
          : connection.getErrorStream();
      String response = AidantMessageUtils.readStream(stream);
      if (statusCode >= 200 && statusCode < 300) {
        applyMessageReceipt(new JSONObject(response), link);
      }
    } catch (Exception ignored) {
      // Receipts are best effort; the next history refresh can still update status.
    } finally {
      Set<String> pendingSet = "read".equals(receiptType)
          ? pendingReadReceiptIds
          : pendingDeliveryReceiptIds;
      synchronized (pendingSet) {
        for (String id : ids) {
          pendingSet.remove(receiptType + ":" + link.id + ":" + id);
        }
      }
      if (connection != null) {
        connection.disconnect();
      }
    }
  }

  private String messageIdsJson(ArrayList<String> ids) {
    StringBuilder builder = new StringBuilder("[");
    for (int index = 0; index < ids.size(); index++) {
      if (index > 0) builder.append(",");
      builder
          .append("\"")
          .append(AidantMessageUtils.escapeJson(ids.get(index)))
          .append("\"");
    }
    builder.append("]");
    return builder.toString();
  }

  private void playIncomingMessageSound() {
    try {
      MediaPlayer mediaPlayer = MediaPlayer.create(this, R.raw.message_bip);
      if (mediaPlayer != null) {
        mediaPlayer.setOnCompletionListener(MediaPlayer::release);
        mediaPlayer.setOnErrorListener((player, what, extra) -> {
          player.release();
          return true;
        });
        mediaPlayer.start();
      }
    } catch (Exception ignored) {
      // Vibration below still provides feedback if the tone cannot play.
    }

    try {
      Vibrator vibrator = (Vibrator) getSystemService(VIBRATOR_SERVICE);
      if (vibrator == null) return;

      if (Build.VERSION.SDK_INT >= 26) {
        vibrator.vibrate(VibrationEffect.createOneShot(90, VibrationEffect.DEFAULT_AMPLITUDE));
      } else {
        vibrator.vibrate(90);
      }
    } catch (Exception ignored) {
      // Message sound is best effort only.
    }
  }

  private void showIncomingMessageNotification(MessageItem item) {
    if (item == null) return;

    if (Build.VERSION.SDK_INT >= 33
        && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
      return;
    }

    NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
    if (manager == null) return;

    createMessageNotificationChannel();

    Intent openIntent = new Intent(this, AidantActivity.class);
    openIntent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
    PendingIntent openPendingIntent = PendingIntent.getActivity(
        this,
        43,
        openIntent,
        pendingIntentFlags()
    );

    String body = isPatientRole()
        ? AidantMessageUtils.truncateNotificationText(item.preview())
        : AidantMessageUtils.truncateNotificationText(item.patientName + " - " + item.preview());
    String title = isPatientRole()
        ? "Message de l'aidant"
        : "Message Ma Voix - " + item.patientName;
    Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
        ? new Notification.Builder(this, MESSAGE_NOTIFICATION_CHANNEL_ID)
        : new Notification.Builder(this);

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

    manager.notify(Math.abs(item.id.hashCode()), notification);
  }

  private void createMessageNotificationChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return;
    }

    NotificationChannel channel = new NotificationChannel(
        MESSAGE_NOTIFICATION_CHANNEL_ID,
        "Messages Ma Voix",
        NotificationManager.IMPORTANCE_HIGH
    );
    channel.setDescription("Notifications des messages recus dans Ma Voix Aidant.");
    channel.enableVibration(true);

    NotificationManager manager = getSystemService(NotificationManager.class);
    if (manager != null) {
      manager.createNotificationChannel(channel);
    }
  }

  private int pendingIntentFlags() {
    int flags = PendingIntent.FLAG_UPDATE_CURRENT;
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      flags |= PendingIntent.FLAG_IMMUTABLE;
    }
    return flags;
  }

  private void sendMessage() {
    String message = messageInput.getText().toString().trim();
    if (message.isEmpty()) {
      toast("Ecris un message avant l'envoi.");
      return;
    }

    PatientLinkStore.Link link = selectedLink();
    if (link == null) {
      toast("Ajoute d'abord un lien de connexion.");
      return;
    }

    messageInput.setText("");
    messageExecutor.execute(() -> postMessage(link, message, "caregiver", "Aidant"));
  }

  private void sendPatientMessage() {
    patientProfile = PatientProfileStore.readOrCreate(prefs);
    String message = patientMessageInput == null ? "" : patientMessageInput.getText().toString().trim();
    if (message.isEmpty()) {
      showCenterMessage("Message vide");
      return;
    }

    PatientLinkStore.Link link = patientProfile.asLink();
    patientMessageInput.setText("");
    messageExecutor.execute(() -> postMessage(link, message, "user", patientProfile.displayName()));
  }

  private void postMessage(PatientLinkStore.Link link, String message, String senderRole, String senderName) {
    HttpURLConnection postConnection = null;
    try {
      URL url = new URL(link.apiBase + "/api/caregiver-messages");
      postConnection = (HttpURLConnection) url.openConnection();
      postConnection.setRequestMethod("POST");
      postConnection.setConnectTimeout(15000);
      postConnection.setReadTimeout(15000);
      postConnection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
      postConnection.setDoOutput(true);

      String body = "{"
          + "\"channel\":\"" + AidantMessageUtils.escapeJson(link.channel) + "\","
          + "\"accessKey\":\"" + AidantMessageUtils.escapeJson(link.accessKey) + "\","
          + "\"senderRole\":\"" + AidantMessageUtils.escapeJson(senderRole) + "\","
          + "\"senderName\":\"" + AidantMessageUtils.escapeJson(senderName) + "\","
          + "\"message\":\"" + AidantMessageUtils.escapeJson(message) + "\""
          + "}";
      try (OutputStream outputStream = postConnection.getOutputStream()) {
        outputStream.write(body.getBytes(StandardCharsets.UTF_8));
      }

      int statusCode = postConnection.getResponseCode();
      InputStream stream = statusCode >= 200 && statusCode < 300
          ? postConnection.getInputStream()
          : postConnection.getErrorStream();
      String response = AidantMessageUtils.readStream(stream);

      if (statusCode < 200 || statusCode >= 300) {
        throw new IllegalStateException(response);
      }

      JSONObject responseObject = new JSONObject(response);
      int deliveredTo = responseObject.optInt("deliveredTo", 0);
      JSONObject payload = responseObject.optJSONObject("message");
      if (payload != null && !payload.has("deliveredTo")) {
        payload.put("deliveredTo", deliveredTo);
      }
      addMessage(MessageItem.fromJson(payload, link), false);
      if ("user".equals(senderRole)) {
        runOnUiThread(() -> {
          updatePatientConnectionStatus();
          showCenterMessage(deliveredTo > 0 ? "Message envoyé" : "Aidant déconnecté");
        });
      }
    } catch (Exception ex) {
      runOnUiThread(() -> {
        if ("user".equals(senderRole) && patientMessageInput != null) {
          patientMessageInput.setText(message);
          updatePatientConnectionStatus();
          showCenterMessage("Message non envoyé");
        } else if (messageInput != null) {
          messageInput.setText(message);
          toast("Impossible d'envoyer le message.");
        }
      });
    } finally {
      if (postConnection != null) {
        postConnection.disconnect();
      }
    }
  }

  private void sendPatientAlert() {
    if (patientAlertSending) return;

    patientProfile = PatientProfileStore.readOrCreate(prefs);
    patientAlertSending = true;
    updatePatientCallButton();

    PatientProfileStore.Profile profile = patientProfile;
    messageExecutor.execute(() -> postPatientAlert(profile));
  }

  private void postPatientAlert(PatientProfileStore.Profile profile) {
    HttpURLConnection postConnection = null;
    try {
      URL url = new URL(profile.apiBase + "/api/caregiver-alert");
      postConnection = (HttpURLConnection) url.openConnection();
      postConnection.setRequestMethod("POST");
      postConnection.setConnectTimeout(15000);
      postConnection.setReadTimeout(15000);
      postConnection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
      postConnection.setDoOutput(true);

      String body = "{"
          + "\"channel\":\"" + AidantMessageUtils.escapeJson(profile.channel) + "\","
          + "\"accessKey\":\"" + AidantMessageUtils.escapeJson(profile.accessKey) + "\","
          + "\"profileName\":\"" + AidantMessageUtils.escapeJson(profile.displayName()) + "\","
          + "\"message\":\"J'ai besoin de mon aidant.\""
          + "}";
      try (OutputStream outputStream = postConnection.getOutputStream()) {
        outputStream.write(body.getBytes(StandardCharsets.UTF_8));
      }

      int statusCode = postConnection.getResponseCode();
      InputStream stream = statusCode >= 200 && statusCode < 300
          ? postConnection.getInputStream()
          : postConnection.getErrorStream();
      String response = AidantMessageUtils.readStream(stream);

      if (statusCode < 200 || statusCode >= 300) {
        throw new IllegalStateException(response);
      }

      JSONObject payload = new JSONObject(response);
      int deliveredTo = payload.optInt("deliveredTo", 0);
      runOnUiThread(() -> {
        patientAlertSending = false;
        updatePatientCallButton();
        updatePatientConnectionStatus();
        showCenterMessage(deliveredTo > 0 ? "Appel envoyé" : "Aidant déconnecté");
      });
    } catch (Exception error) {
      runOnUiThread(() -> {
        patientAlertSending = false;
        updatePatientCallButton();
        updatePatientConnectionStatus();
        showCenterMessage("Appel non envoyé");
      });
    } finally {
      if (postConnection != null) {
        postConnection.disconnect();
      }
    }
  }

  private void markMessagesRead() {
    for (MessageItem item : messages) {
      if (isIncomingMessage(item) && isVisibleMessage(item)) {
        readMessageIds.add(item.id);
        unreadMessageIds.remove(item.id);
        sendDeliveryReceipt(item);
        sendReadReceipt(item);
      }
    }
    renderUnreadMessages();
  }

  private void renderUnreadMessages() {
    if (unreadText == null && patientUnreadText == null) return;

    if (unreadMessageIds.isEmpty()) {
      if (unreadText != null) {
        unreadText.setText("Aucun message non lu.");
      }
      if (patientUnreadText != null) {
        patientUnreadText.setText("Aucun message non lu.");
      }
      return;
    }

    StringBuilder aidantBuilder = new StringBuilder();
    StringBuilder patientBuilder = new StringBuilder();
    int shown = 0;
    for (int index = messages.size() - 1; index >= 0 && shown < 3; index--) {
      MessageItem item = messages.get(index);
      if (!unreadMessageIds.contains(item.id)) continue;
      if (aidantBuilder.length() > 0) aidantBuilder.append("\n\n");
      aidantBuilder
          .append(item.patientName)
          .append(" - ")
          .append(AidantMessageUtils.formatMessageTime(item.createdAt))
          .append(" - ")
          .append(item.preview());
      if (patientBuilder.length() > 0) patientBuilder.append("\n\n");
      patientBuilder
          .append(item.patientName)
          .append(" - ")
          .append(AidantMessageUtils.formatMessageTime(item.createdAt))
          .append(" - ")
          .append(item.preview());
      shown += 1;
    }
    if (unreadText != null) {
      unreadText.setText(aidantBuilder.length() == 0 ? "Aucun message non lu." : aidantBuilder.toString());
    }
    if (patientUnreadText != null) {
      patientUnreadText.setText(patientBuilder.length() == 0 ? "Aucun message non lu." : patientBuilder.toString());
    }
  }

  private void renderMessages() {
    if (messageListContainer == null) return;
    messageListContainer.removeAllViews();

    PatientLinkStore.Link link = selectedLink();
    if (link == null) {
      messageListContainer.addView(
          messageTextView("Ajoute un patient pour ouvrir ses messages.", COLOR_MUTED, 15, false),
          matchWrap()
      );
      return;
    }

    ArrayList<MessageItem> selectedMessages = new ArrayList<>();
    for (MessageItem item : messages) {
      if (link.id.equals(item.connectionId)) {
        selectedMessages.add(item);
      }
    }

    if (selectedMessages.isEmpty()) {
      messageListContainer.addView(
          messageTextView("Aucun message pour " + link.name + ".", COLOR_MUTED, 15, false),
          matchWrap()
      );
      return;
    }

    String lastOutgoingId = lastOutgoingMessageId(selectedMessages, "caregiver");
    for (MessageItem item : selectedMessages) {
      boolean caregiver = "caregiver".equals(item.senderRole);
      LinearLayout bubble = new LinearLayout(this);
      bubble.setOrientation(LinearLayout.VERTICAL);
      bubble.setPadding(dp(10), dp(10), dp(10), dp(10));
      bubble.setBackground(roundedStroke(
          caregiver ? COLOR_CAREGIVER_BUBBLE : COLOR_USER_BUBBLE,
          caregiver ? Color.rgb(96, 165, 250) : Color.rgb(74, 222, 128),
          16,
          1
      ));

      String sender = caregiver ? "Moi" : "Utilisateur";
      String metaText = sender + " - " + AidantMessageUtils.formatMessageTime(item.createdAt);
      if (item.id.equals(lastOutgoingId)) {
        metaText += " - " + outgoingStatusLabel(item);
      }
      TextView meta = messageTextView(
          metaText,
          COLOR_MUTED,
          13,
          true
      );
      bubble.addView(meta, matchWrap());

      if (item.isAudio()) {
        Button audioButton = button("Lire le fichier audio recu", v -> playAudioMessage(item));
        audioButton.setTextSize(16);
        bubble.addView(audioButton, matchWrap());
      } else {
        bubble.addView(
            messageTextView(item.message, COLOR_TEXT, 16, false),
            spacedParams(0, dp(5), 0, 0)
        );
      }

      messageListContainer.addView(bubble, spacedParams(0, 0, 0, dp(10)));
    }
  }

  private void renderPatientMessages() {
    if (patientMessageListContainer == null) return;
    patientMessageListContainer.removeAllViews();

    PatientProfileStore.Profile profile = patientProfile == null
        ? PatientProfileStore.readOrCreate(prefs)
        : patientProfile;
    PatientLinkStore.Link link = profile.asLink();

    ArrayList<MessageItem> selectedMessages = new ArrayList<>();
    for (MessageItem item : messages) {
      if (link.id.equals(item.connectionId)) {
        selectedMessages.add(item);
      }
    }

    if (selectedMessages.isEmpty()) {
      patientMessageListContainer.addView(
          messageTextView("Aucun message avec l'aidant.", COLOR_MUTED, 15, false),
          matchWrap()
      );
      return;
    }

    String lastOutgoingId = lastOutgoingMessageId(selectedMessages, "user");
    for (MessageItem item : selectedMessages) {
      boolean caregiver = "caregiver".equals(item.senderRole);
      LinearLayout bubble = new LinearLayout(this);
      bubble.setOrientation(LinearLayout.VERTICAL);
      bubble.setPadding(dp(10), dp(10), dp(10), dp(10));
      bubble.setBackground(roundedStroke(
          caregiver ? COLOR_CAREGIVER_BUBBLE : COLOR_USER_BUBBLE,
          caregiver ? Color.rgb(96, 165, 250) : Color.rgb(74, 222, 128),
          16,
          1
      ));

      String sender = caregiver ? "Aidant" : "Moi";
      String metaText = sender + " - " + AidantMessageUtils.formatMessageTime(item.createdAt);
      if (item.id.equals(lastOutgoingId)) {
        metaText += " - " + outgoingStatusLabel(item);
      }
      TextView meta = messageTextView(
          metaText,
          COLOR_MUTED,
          13,
          true
      );
      bubble.addView(meta, matchWrap());

      bubble.addView(
          messageTextView(item.message, COLOR_TEXT, 16, false),
          spacedParams(0, dp(5), 0, 0)
      );

      patientMessageListContainer.addView(bubble, spacedParams(0, 0, 0, dp(10)));
    }
  }

  private boolean isIncomingMessage(MessageItem item) {
    if (item == null) return false;
    return isPatientRole()
        ? "caregiver".equals(item.senderRole)
        : !"caregiver".equals(item.senderRole);
  }

  private String lastOutgoingMessageId(ArrayList<MessageItem> selectedMessages, String ownRole) {
    for (int index = selectedMessages.size() - 1; index >= 0; index--) {
      MessageItem item = selectedMessages.get(index);
      if (ownRole.equals(item.senderRole)) {
        return item.id;
      }
    }
    return "";
  }

  private String outgoingStatusLabel(MessageItem item) {
    if (item == null) return "";

    String recipientRole = "caregiver".equals(item.senderRole) ? "user" : "caregiver";
    if (item.isReadBy(recipientRole)) {
      return "Lu";
    }
    if (item.isDelivered()) {
      return "Reçu";
    }
    return "Envoyé";
  }

  private boolean isVisibleMessage(MessageItem item) {
    if (item == null || !"messages".equals(currentSection)) return false;

    PatientLinkStore.Link link = currentMessageLink();
    return link != null && link.id.equals(item.connectionId);
  }

  private PatientLinkStore.Link currentMessageLink() {
    if (isPatientRole()) {
      PatientProfileStore.Profile profile = patientProfile == null
          ? PatientProfileStore.readOrCreate(prefs)
          : patientProfile;
      return profile.asLink();
    }

    return selectedLink();
  }

  private PatientLinkStore.Link linkForMessage(MessageItem item) {
    if (item == null) return null;

    PatientLinkStore.Link currentLink = currentMessageLink();
    if (currentLink != null && currentLink.id.equals(item.connectionId)) {
      return currentLink;
    }

    if (isPatientRole()) {
      ArrayList<PatientProfileStore.AidantLink> aidantLinks =
          PatientProfileStore.readOrCreateAidantLinks(prefs);
      for (PatientProfileStore.AidantLink aidantLink : aidantLinks) {
        PatientLinkStore.Link link = PatientProfileStore.profileForAidant(prefs, aidantLink).asLink();
        if (link.id.equals(item.connectionId)) {
          return link;
        }
      }
      return null;
    }

    for (PatientLinkStore.Link link : patientLinks) {
      if (link.id.equals(item.connectionId)) {
        return link;
      }
    }

    return null;
  }

  private String currentReaderRole() {
    return isPatientRole() ? "user" : "caregiver";
  }

  private void playAudioMessage(MessageItem item) {
    if (item == null || item.message.trim().isEmpty()) {
      toast("Audio indisponible.");
      return;
    }

    if (textToSpeech == null || !textToSpeechReady) {
      toast("Lecture audio en preparation.");
      return;
    }

    if (Build.VERSION.SDK_INT >= 21) {
      textToSpeech.speak(item.message, TextToSpeech.QUEUE_FLUSH, null, "message-" + item.id);
    } else {
      textToSpeech.speak(item.message, TextToSpeech.QUEUE_FLUSH, null);
    }
  }

  private void setMessagesConnected(boolean connected) {
    messagesConnected = connected;
    runOnUiThread(this::updateConnectionStatus);
  }

  private void updateConnectionStatus() {
    boolean hasPatients = !patientLinks.isEmpty();

    connectionButton.setText(hasPatients ? "Connecte a " + patientCountLabel(patientLinks.size()) : "Non connecte");
    connectionButton.setTextColor(COLOR_TEXT);
    connectionButton.setBackground(rounded(hasPatients ? COLOR_SUCCESS : COLOR_DANGER, 26));
  }

  private void refreshUi() {
    if (isPatientRole()) {
      refreshPatientUi();
      updateRoleChoiceCards();
      updateBottomNavigation();
      return;
    }

    reloadPatientLinks();
    renderPatientUi();

    PatientLinkStore.Link selected = selectedLink();
    if (patientLinks.isEmpty()) {
      statusText.setText("En attente du lien Ma Voix.");
      linkInput.setText("");
      if (selectedPatientText != null) {
        selectedPatientText.setText("Aucun patient lié pour le moment.");
      }
      setMessagesConnected(false);
    } else {
      StringBuilder builder = new StringBuilder();
      builder
          .append("Pret a recevoir les alertes Appel aidant pour ")
          .append(patientCountLabel(patientLinks.size()))
          .append(".");
      for (PatientLinkStore.Link link : patientLinks) {
        builder.append("\n- ").append(link.name);
      }
      statusText.setText(builder.toString());
      linkInput.setText("");
      linkInput.setHint("Coller un nouveau lien patient");
      if (selectedPatientText != null) {
        selectedPatientText.setText("Patient sélectionné : " + selected.name);
      }
    }

    if (soundSpinner != null) {
      isRefreshingSoundUi = true;
      soundSpinner.setSelection(AlarmSounds.selectedIndex(prefs), false);
      isRefreshingSoundUi = false;
    }
    soundText.setText("Son actuel: " + AlarmSounds.selectedLabel(prefs) + ".");
    updateTestSoundButton();
    updateConnectionStatus();
    renderUnreadMessages();
    renderMessages();
    renderPatientMessages();
    updateRoleChoiceCards();
    updateBottomNavigation();
  }

  private void requestNotificationsIfNeeded() {
    if (Build.VERSION.SDK_INT >= 33
        && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
      requestPermissions(new String[] { Manifest.permission.POST_NOTIFICATIONS }, REQUEST_NOTIFICATIONS);
    }
  }

  private void disconnectMessages() {
    ArrayList<HttpURLConnection> connectionsToClose = new ArrayList<>();
    synchronized (messageConnections) {
      for (HttpURLConnection existingConnection : messageConnections.values()) {
        if (existingConnection != null) {
          connectionsToClose.add(existingConnection);
        }
      }
      messageConnections.clear();
    }

    for (HttpURLConnection connection : connectionsToClose) {
      connection.disconnect();
    }

    connectedMessageIds.clear();
    messagesConnected = false;
    patientConnectedCaregivers = 0;
    patientAidantPresence.clear();
    runOnUiThread(() -> {
      updateConnectionStatus();
      updatePatientConnectionStatus();
    });
  }

  private void disconnectMessage(String id, HttpURLConnection expectedConnection) {
    boolean shouldClose = false;
    synchronized (messageConnections) {
      HttpURLConnection existingConnection = messageConnections.get(id);
      if (existingConnection == expectedConnection) {
        messageConnections.remove(id);
      }
      if (expectedConnection != null) {
        shouldClose = true;
      }
    }

    if (shouldClose) {
      expectedConnection.disconnect();
    }
  }

  private void sleep(long millis) {
    try {
      Thread.sleep(millis);
    } catch (InterruptedException interrupted) {
      Thread.currentThread().interrupt();
    }
  }

  private int dp(int value) {
    return Math.round(value * getResources().getDisplayMetrics().density);
  }

  private void toast(String message) {
    Toast.makeText(this, message, Toast.LENGTH_SHORT).show();
  }

  private void showCenterMessage(String message) {
    if (message == null || message.trim().isEmpty()) {
      return;
    }

    if (centerMessageView != null && centerMessageView.getParent() instanceof ViewGroup) {
      ((ViewGroup) centerMessageView.getParent()).removeView(centerMessageView);
    }

    TextView view = new TextView(this);
    view.setText(message);
    view.setTextColor(COLOR_TEXT);
    view.setTextSize(22);
    view.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
    view.setGravity(Gravity.CENTER);
    view.setPadding(dp(22), dp(16), dp(22), dp(16));
    view.setBackground(roundedStroke(Color.rgb(15, 23, 42), Color.rgb(96, 165, 250), 18, 1));
    view.setAlpha(0f);
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
      view.setElevation(dp(10));
    }

    FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(
        FrameLayout.LayoutParams.WRAP_CONTENT,
        FrameLayout.LayoutParams.WRAP_CONTENT,
        Gravity.CENTER
    );
    params.leftMargin = dp(24);
    params.rightMargin = dp(24);
    addContentView(view, params);
    centerMessageView = view;

    view.animate().alpha(1f).setDuration(120).start();
    view.postDelayed(() -> view.animate()
        .alpha(0f)
        .setDuration(220)
        .withEndAction(() -> {
          if (view.getParent() instanceof ViewGroup) {
            ((ViewGroup) view.getParent()).removeView(view);
          }
          if (centerMessageView == view) {
            centerMessageView = null;
          }
        })
        .start(), 1400);
  }

  @Override
  protected void onDestroy() {
    shouldListenMessages = false;
    disconnectMessages();
    if (textToSpeech != null) {
      textToSpeech.stop();
      textToSpeech.shutdown();
    }
    stopTestSoundPlayback();
    messageExecutor.shutdownNow();
    super.onDestroy();
  }

}
