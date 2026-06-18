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
import android.view.View;
import android.view.ViewGroup;
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
  private final Map<String, HttpURLConnection> messageConnections = new HashMap<>();
  private final Set<String> connectedMessageIds = new HashSet<>();

  private SharedPreferences prefs;
  private Spinner sectionSpinner;
  private LinearLayout connectionPanel;
  private LinearLayout configPanel;
  private LinearLayout messagesPanel;
  private LinearLayout helpPanel;
  private Button connectionButton;
  private EditText linkInput;
  private EditText messageInput;
  private LinearLayout connectionsListContainer;
  private TextView selectedPatientText;
  private TextView statusText;
  private TextView soundText;
  private Spinner soundSpinner;
  private Button testSoundButton;
  private TextView unreadText;
  private LinearLayout messageListContainer;
  private Spinner messagePatientSpinner;
  private TextToSpeech textToSpeech;
  private MediaPlayer testSoundPlayer;
  private boolean textToSpeechReady;
  private boolean isRefreshingPatientUi;
  private boolean isRefreshingSoundUi;
  private boolean isTestingAlarmSound;

  private volatile boolean shouldListenMessages;
  private volatile boolean messagesConnected;
  private volatile int messageListenVersion;
  private String selectedConnectionId = "";
  private String currentSection = "connexion";

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    prefs = getSharedPreferences(AlertContract.PREFS, MODE_PRIVATE);
    createMessageNotificationChannel();
    textToSpeech = new TextToSpeech(this, status -> {
      textToSpeechReady = status == TextToSpeech.SUCCESS;
      if (textToSpeechReady) {
        textToSpeech.setLanguage(Locale.FRANCE);
      }
    });
    buildLayout();
    requestNotificationsIfNeeded();
    handleIntent(getIntent(), true);
    refreshUi();
    connectMessagesFromPrefs();
  }

  @Override
  protected void onNewIntent(Intent intent) {
    super.onNewIntent(intent);
    setIntent(intent);
    handleIntent(intent, true);
    refreshUi();
    connectMessagesFromPrefs();
  }

  private void buildLayout() {
    ScrollView scrollView = new ScrollView(this);
    scrollView.setFillViewport(true);
    scrollView.setBackgroundColor(COLOR_PAGE);

    LinearLayout root = new LinearLayout(this);
    root.setOrientation(LinearLayout.VERTICAL);
    root.setPadding(dp(22), dp(28), dp(22), dp(28));
    scrollView.addView(root);

    LinearLayout header = new LinearLayout(this);
    header.setOrientation(LinearLayout.HORIZONTAL);
    header.setGravity(Gravity.CENTER_VERTICAL);

    ImageView logo = new ImageView(this);
    logo.setImageResource(R.drawable.picturetitle);
    logo.setAdjustViewBounds(true);
    logo.setScaleType(ImageView.ScaleType.FIT_START);
    LinearLayout.LayoutParams logoParams = new LinearLayout.LayoutParams(0, dp(72), 1);
    header.addView(logo, logoParams);

    sectionSpinner = new Spinner(this);
    ArrayAdapter<String> adapter = darkSpinnerAdapter(new String[] {
        "Connexion",
        "Configurer",
        "Messages",
        "Mode d'emploi"
    });
    adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
    sectionSpinner.setAdapter(adapter);
    LinearLayout.LayoutParams menuParams = new LinearLayout.LayoutParams(dp(190), LinearLayout.LayoutParams.WRAP_CONTENT);
    menuParams.setMargins(dp(12), 0, 0, 0);
    header.addView(spinnerBox(sectionSpinner), menuParams);

    root.addView(header, spacedParams(0, 0, 0, dp(18)));

    connectionPanel = panel();
    buildConnectionPanel(connectionPanel);
    root.addView(connectionPanel, matchWrap());

    configPanel = panel();
    buildConfigPanel(configPanel);
    root.addView(configPanel, matchWrap());

    messagesPanel = panel();
    buildMessagesPanel(messagesPanel);
    root.addView(messagesPanel, matchWrap());

    helpPanel = panel();
    buildHelpPanel(helpPanel);
    root.addView(helpPanel, matchWrap());

    sectionSpinner.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
      @Override
      public void onItemSelected(AdapterView<?> parent, View view, int position, long id) {
        if (position == 1) {
          showSection("configurer");
        } else if (position == 2) {
          showSection("messages");
        } else if (position == 3) {
          showSection("aide");
        } else {
          showSection("connexion");
        }
      }

      @Override
      public void onNothingSelected(AdapterView<?> parent) {
        showSection("connexion");
      }
    });
    showSection("connexion");

    setContentView(scrollView);
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
        "Dans Ma Voix, ouvre Profil > Aidants et copie le lien du patient. "
            + "Dans Configurer, colle ce lien puis appuie sur Ajouter ce lien patient."
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
            + "Quand un patient appuie sur Appel aidant dans Ma Voix, ce telephone sonne."
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
    if (connectionPanel == null || configPanel == null || messagesPanel == null || helpPanel == null) {
      return;
    }

    connectionPanel.setVisibility("connexion".equals(section) ? View.VISIBLE : View.GONE);
    configPanel.setVisibility("configurer".equals(section) ? View.VISIBLE : View.GONE);
    messagesPanel.setVisibility("messages".equals(section) ? View.VISIBLE : View.GONE);
    helpPanel.setVisibility("aide".equals(section) ? View.VISIBLE : View.GONE);

    if ("messages".equals(section)) {
      markMessagesRead();
    }
    renderMessages();
    renderUnreadMessages();
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
    button.setLayoutParams(null);
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

  private void handleIntent(Intent intent, boolean autoConnect) {
    if (intent == null || intent.getData() == null) {
      return;
    }

    Uri uri = intent.getData();
    if (saveLink(uri.toString()) && autoConnect) {
      startListening();
    }
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
      String apiBase = null;

      if ("http".equals(uri.getScheme()) || "https".equals(uri.getScheme())) {
        apiBase = uri.getScheme() + "://" + uri.getAuthority();
      } else if ("mavoix-aidant".equals(uri.getScheme())) {
        apiBase = uri.getQueryParameter("apiBase");
      }

      if (channel == null || channel.trim().length() < 8) {
        toast("Le lien ne contient pas de canal valide.");
        return false;
      }

      if (apiBase == null || apiBase.trim().isEmpty()) {
        apiBase = AlertContract.DEFAULT_API_BASE;
      }

      PatientLinkStore.addOrSelect(prefs, apiBase, channel.trim());
      return true;
    } catch (Exception ex) {
      toast("Lien invalide.");
      return false;
    }
  }

  private void pasteLink() {
    ClipboardManager clipboard = (ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
    if (clipboard == null || !clipboard.hasPrimaryClip()) {
      toast("Presse-papiers vide.");
      return;
    }

    ClipData clip = clipboard.getPrimaryClip();
    if (clip == null || clip.getItemCount() == 0) {
      toast("Presse-papiers vide.");
      return;
    }

    CharSequence text = clip.getItemAt(0).coerceToText(this);
    if (text == null) {
      toast("Aucun texte a coller.");
      return;
    }

    linkInput.setText(text.toString());
    if (saveLinkFromInput()) connectMessagesFromPrefs();
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
      testSoundPlayer = new MediaPlayer();
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
        testSoundPlayer.setAudioAttributes(new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
            .build());
      }
      testSoundPlayer.setDataSource(this, AlarmSounds.selectedUri(this, prefs));
      testSoundPlayer.setLooping(true);
      testSoundPlayer.setOnErrorListener((player, what, extra) -> {
        stopTestSoundPlayback();
        setTestingAlarmSound(false);
        toast("Impossible de tester le son.");
        return true;
      });
      testSoundPlayer.prepare();
      testSoundPlayer.start();
    } catch (Exception error) {
      stopTestSoundPlayback();
      setTestingAlarmSound(false);
      toast("Impossible de tester le son.");
    }
  }

  private void stopTestSoundPlayback() {
    if (testSoundPlayer == null) {
      return;
    }

    try {
      if (testSoundPlayer.isPlaying()) {
        testSoundPlayer.stop();
      }
    } catch (Exception ignored) {
      // The player is being released anyway.
    }

    try {
      testSoundPlayer.release();
    } catch (Exception ignored) {
      // Nothing else to clean up.
    }
    testSoundPlayer = null;
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
    reloadPatientLinks();
    if (patientLinks.isEmpty()) {
      setMessagesConnected(false);
      return;
    }
    startMessageListening(new ArrayList<>(patientLinks));
  }

  private void startMessageListening(ArrayList<PatientLinkStore.Link> links) {
    shouldListenMessages = false;
    disconnectMessages();
    connectedMessageIds.clear();
    int version = messageListenVersion + 1;
    messageListenVersion = version;
    shouldListenMessages = true;

    for (PatientLinkStore.Link link : links) {
      messageExecutor.execute(() -> messageLoop(link, version));
    }
  }

  private void messageLoop(PatientLinkStore.Link link, int version) {
    while (shouldListenMessages && version == messageListenVersion) {
      HttpURLConnection nextConnection = null;
      try {
        String streamUrl = link.apiBase
            + "/api/caregiver-messages/stream?role=caregiver&channel="
            + URLEncoder.encode(link.channel, "UTF-8");
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
      }
    } catch (Exception ignored) {
      // Ignore malformed event payloads.
    }
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
    });
  }

  private void addMessage(MessageItem item, boolean notifyIncoming) {
    if (item == null || item.id.isEmpty()) return;

    runOnUiThread(() -> {
      for (MessageItem existing : messages) {
        if (existing.id.equals(item.id) && existing.connectionId.equals(item.connectionId)) return;
      }

      messages.add(item);
      boolean incoming = !"caregiver".equals(item.senderRole);
      if (notifyIncoming && incoming) {
        playIncomingMessageSound();
        showIncomingMessageNotification(item);
      }

      if (incoming && !readMessageIds.contains(item.id)) {
        if ("messages".equals(currentSection)) {
          readMessageIds.add(item.id);
        } else {
          unreadMessageIds.add(item.id);
        }
      }
      renderMessages();
      renderUnreadMessages();
    });
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

    String body = truncateNotificationText(item.patientName + " - " + item.preview());
    Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
        ? new Notification.Builder(this, MESSAGE_NOTIFICATION_CHANNEL_ID)
        : new Notification.Builder(this);

    Notification notification = builder
        .setSmallIcon(android.R.drawable.ic_dialog_email)
        .setContentTitle("Message Ma Voix - " + item.patientName)
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

  private String truncateNotificationText(String value) {
    if (value == null) return "";
    value = value.replace("\n", " ").replace("\r", " ").trim();
    return value.length() > 140 ? value.substring(0, 137) + "..." : value;
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
    messageExecutor.execute(() -> postMessage(link, message));
  }

  private void postMessage(PatientLinkStore.Link link, String message) {
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
          + "\"channel\":\"" + escapeJson(link.channel) + "\","
          + "\"senderRole\":\"caregiver\","
          + "\"senderName\":\"Aidant\","
          + "\"message\":\"" + escapeJson(message) + "\""
          + "}";
      try (OutputStream outputStream = postConnection.getOutputStream()) {
        outputStream.write(body.getBytes(StandardCharsets.UTF_8));
      }

      int statusCode = postConnection.getResponseCode();
      InputStream stream = statusCode >= 200 && statusCode < 300
          ? postConnection.getInputStream()
          : postConnection.getErrorStream();
      String response = readStream(stream);

      if (statusCode < 200 || statusCode >= 300) {
        throw new IllegalStateException(response);
      }

      JSONObject payload = new JSONObject(response).optJSONObject("message");
      addMessage(MessageItem.fromJson(payload, link), false);
    } catch (Exception ex) {
      runOnUiThread(() -> {
        messageInput.setText(message);
        toast("Impossible d'envoyer le message.");
      });
    } finally {
      if (postConnection != null) {
        postConnection.disconnect();
      }
    }
  }

  private void markMessagesRead() {
    for (MessageItem item : messages) {
      if (!"caregiver".equals(item.senderRole)) {
        readMessageIds.add(item.id);
      }
    }
    unreadMessageIds.clear();
    renderUnreadMessages();
  }

  private void renderUnreadMessages() {
    if (unreadText == null) return;

    if (unreadMessageIds.isEmpty()) {
      unreadText.setText("Aucun message non lu.");
      return;
    }

    StringBuilder builder = new StringBuilder();
    int shown = 0;
    for (int index = messages.size() - 1; index >= 0 && shown < 3; index--) {
      MessageItem item = messages.get(index);
      if (!unreadMessageIds.contains(item.id)) continue;
      if (builder.length() > 0) builder.append("\n\n");
      builder
          .append(item.patientName)
          .append(" - ")
          .append(formatMessageTime(item.createdAt))
          .append(" - ")
          .append(item.preview());
      shown += 1;
    }
    unreadText.setText(builder.toString());
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
      TextView meta = messageTextView(
          sender + " - " + formatMessageTime(item.createdAt),
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

  private String readStream(InputStream stream) throws Exception {
    if (stream == null) return "";
    StringBuilder builder = new StringBuilder();
    BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8));
    String line;
    while ((line = reader.readLine()) != null) {
      builder.append(line);
    }
    return builder.toString();
  }

  private String escapeJson(String value) {
    return value
        .replace("\\", "\\\\")
        .replace("\"", "\\\"")
        .replace("\n", "\\n")
        .replace("\r", "\\r");
  }

  private String formatMessageTime(String value) {
    if (value != null && value.length() >= 16) {
      return value.substring(11, 16);
    }
    return "--:--";
  }

  private int dp(int value) {
    return Math.round(value * getResources().getDisplayMetrics().density);
  }

  private void toast(String message) {
    Toast.makeText(this, message, Toast.LENGTH_SHORT).show();
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

  private static final class MessageItem {
    final String id;
    final String connectionId;
    final String patientName;
    final String senderRole;
    final String message;
    final String messageType;
    final String createdAt;

    MessageItem(
        String id,
        String connectionId,
        String patientName,
        String senderRole,
        String message,
        String messageType,
        String createdAt
    ) {
      this.id = id;
      this.connectionId = connectionId == null ? "" : connectionId;
      this.patientName = patientName == null || patientName.isEmpty() ? "Patient" : patientName;
      this.senderRole = senderRole;
      this.message = message == null ? "" : message;
      this.messageType = messageType == null || messageType.isEmpty() ? "text" : messageType;
      this.createdAt = createdAt;
    }

    boolean isAudio() {
      return "audio".equals(messageType);
    }

    String preview() {
      if (isAudio()) {
        return "Audio recu";
      }
      return message;
    }

    static MessageItem fromJson(JSONObject object, PatientLinkStore.Link link) {
      if (object == null) return null;
      String id = object.optString("id", "");
      if (id.isEmpty()) return null;
      return new MessageItem(
          id,
          link == null ? "" : link.id,
          link == null ? "Patient" : link.name,
          object.optString("senderRole", "user"),
          object.optString("message", ""),
          object.optString("messageType", "text"),
          object.optString("createdAt", "")
      );
    }
  }
}
