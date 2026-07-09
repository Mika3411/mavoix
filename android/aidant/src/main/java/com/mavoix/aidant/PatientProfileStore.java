package com.mavoix.aidant;

import android.content.SharedPreferences;
import android.util.Base64;

import org.json.JSONArray;
import org.json.JSONObject;

import java.net.URLEncoder;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

final class PatientProfileStore {
  private static final SecureRandom RANDOM = new SecureRandom();

  private PatientProfileStore() {}

  static Profile readOrCreate(SharedPreferences prefs) {
    ArrayList<AidantLink> links = readOrCreateAidantLinks(prefs);
    AidantLink selected = selectedAidantLink(prefs, links);
    Profile profile = readBaseProfile(prefs, selected);
    saveBaseProfile(prefs, profile);
    return profile;
  }

  static Profile read(SharedPreferences prefs) {
    ArrayList<AidantLink> links = readAidantLinks(prefs);
    if (links.isEmpty()) {
      return null;
    }

    return readBaseProfile(prefs, selectedAidantLink(prefs, links));
  }

  static ArrayList<AidantLink> readOrCreateAidantLinks(SharedPreferences prefs) {
    ArrayList<AidantLink> links = readAidantLinks(prefs);
    if (links.isEmpty()) {
      links.add(createAidantLink("Aidant principal"));
      saveAidantLinks(prefs, links, links.get(0).id);
    }
    return links;
  }

  static AidantLink selectedAidantLink(SharedPreferences prefs) {
    return selectedAidantLink(prefs, readOrCreateAidantLinks(prefs));
  }

  static AidantLink addAidant(SharedPreferences prefs, String name) {
    ArrayList<AidantLink> links = readOrCreateAidantLinks(prefs);
    AidantLink link = createAidantLink(cleanAidantName(name, links.size()));
    links.add(link);
    saveAidantLinks(prefs, links, link.id);
    return link;
  }

  static void selectAidant(SharedPreferences prefs, String id) {
    ArrayList<AidantLink> links = readOrCreateAidantLinks(prefs);
    saveAidantLinks(prefs, links, selectedAidantId(links, id));
  }

  static void renameAidant(SharedPreferences prefs, String id, String name) {
    ArrayList<AidantLink> links = readOrCreateAidantLinks(prefs);
    String cleanName = cleanAidantName(name, 0);
    for (int index = 0; index < links.size(); index++) {
      AidantLink link = links.get(index);
      if (link.id.equals(id)) {
        links.set(index, new AidantLink(link.id, cleanName, link.channel, link.accessKey));
        break;
      }
    }
    saveAidantLinks(prefs, links, selectedAidantId(prefs, links));
  }

  static void deleteAidant(SharedPreferences prefs, String id) {
    ArrayList<AidantLink> links = readOrCreateAidantLinks(prefs);
    for (int index = links.size() - 1; index >= 0; index--) {
      if (links.get(index).id.equals(id)) {
        links.remove(index);
      }
    }
    if (links.isEmpty()) {
      links.add(createAidantLink("Aidant principal"));
    }
    saveAidantLinks(prefs, links, selectedAidantId(prefs, links));
  }

  static AidantLink regenerateAidant(SharedPreferences prefs, String id) {
    ArrayList<AidantLink> links = readOrCreateAidantLinks(prefs);
    AidantLink regenerated = null;
    for (int index = 0; index < links.size(); index++) {
      AidantLink link = links.get(index);
      if (link.id.equals(id)) {
        regenerated = new AidantLink(link.id, link.name, createChannel(), createAccessKey());
        links.set(index, regenerated);
        break;
      }
    }
    if (regenerated == null) {
      regenerated = selectedAidantLink(prefs, links);
    }
    saveAidantLinks(prefs, links, regenerated.id);
    return regenerated;
  }

  static Profile saveName(SharedPreferences prefs, String name) {
    Profile profile = readOrCreate(prefs);
    Profile updated = new Profile(
        profile.id,
        cleanName(name),
        profile.apiBase,
        profile.aidantId,
        profile.aidantName,
        profile.channel,
        profile.accessKey
    );
    saveBaseProfile(prefs, updated);
    return updated;
  }

  static Profile regenerate(SharedPreferences prefs) {
    AidantLink regenerated = regenerateAidant(prefs, selectedAidantLink(prefs).id);
    return profileForAidant(prefs, regenerated);
  }

  static Profile profileForAidant(SharedPreferences prefs, AidantLink link) {
    return readBaseProfile(prefs, link);
  }

  static String buildAlertLink(Profile profile) {
    if (profile == null) return "";

    return profile.apiBase
        + "/aidant-alerte?channel="
        + encode(profile.channel)
        + "&key="
        + encode(profile.accessKey);
  }

  static String buildAppLink(Profile profile) {
    if (profile == null) return "";

    return "mavoix-aidant://open?apiBase="
        + encode(profile.apiBase)
        + "&channel="
        + encode(profile.channel)
        + "&key="
        + encode(profile.accessKey);
  }

  static String buildShareMessage(Profile profile) {
    String patientName = profile == null ? "le patient" : profile.displayName();
    String aidantName = profile == null ? "cet aidant" : profile.aidantDisplayName();
    String alertLink = buildAlertLink(profile);
    String appLink = buildAppLink(profile);
    String apkLink = AlertContract.DEFAULT_API_BASE + "/ma-voix-aidant.apk";

    return "Bonjour,\n\n"
        + patientName
        + " veut te connecter comme "
        + aidantName
        + " dans Ma Voix Aidant.\n\n"
        + "1. Installe l'application Ma Voix Aidant si besoin :\n"
        + apkLink
        + "\n\n"
        + "2. Ouvre ce lien sur ton telephone aidant :\n"
        + alertLink
        + "\n\n"
        + "Si le lien ne s'ouvre pas directement, copie-le dans Ma Voix Aidant > Configurer.\n"
        + "Lien application :\n"
        + appLink;
  }

  private static Profile readBaseProfile(SharedPreferences prefs, AidantLink aidantLink) {
    return new Profile(
        prefs.getString(AlertContract.KEY_PATIENT_ID, UUID.randomUUID().toString()),
        prefs.getString(AlertContract.KEY_PATIENT_NAME, "Patient"),
        prefs.getString(AlertContract.KEY_PATIENT_API_BASE, AlertContract.DEFAULT_API_BASE),
        aidantLink.id,
        aidantLink.name,
        aidantLink.channel,
        aidantLink.accessKey
    );
  }

  private static ArrayList<AidantLink> readAidantLinks(SharedPreferences prefs) {
    ArrayList<AidantLink> links = new ArrayList<>();
    Set<String> seen = new HashSet<>();

    try {
      JSONArray saved = new JSONArray(prefs.getString(AlertContract.KEY_PATIENT_AIDANT_LINKS, "[]"));
      for (int index = 0; index < saved.length(); index++) {
        JSONObject item = saved.optJSONObject(index);
        if (item == null) continue;

        addIfValid(
            links,
            seen,
            new AidantLink(
                item.optString("id", ""),
                item.optString("name", ""),
                item.optString("channel", ""),
                item.optString("accessKey", item.optString("key", ""))
            )
        );
      }
    } catch (Exception ignored) {
      // Legacy migration below still runs.
    }

    String legacyChannel = cleanChannel(prefs.getString(AlertContract.KEY_PATIENT_CHANNEL, ""));
    String legacyAccessKey = cleanAccessKey(prefs.getString(AlertContract.KEY_PATIENT_ACCESS_KEY, ""));
    if (!legacyChannel.isEmpty() && !legacyAccessKey.isEmpty()) {
      addIfValid(
          links,
          seen,
          new AidantLink(
              prefs.getString(AlertContract.KEY_PATIENT_ID, ""),
              "Aidant principal",
              legacyChannel,
              legacyAccessKey
          )
      );
    }

    normalizeAidantNames(links);
    if (!links.isEmpty()) {
      saveAidantLinks(prefs, links, selectedAidantId(prefs, links));
    }
    return links;
  }

  private static AidantLink selectedAidantLink(SharedPreferences prefs, ArrayList<AidantLink> links) {
    String selectedId = selectedAidantId(prefs, links);
    for (AidantLink link : links) {
      if (link.id.equals(selectedId)) {
        return link;
      }
    }
    return links.get(0);
  }

  private static String selectedAidantId(SharedPreferences prefs, ArrayList<AidantLink> links) {
    return selectedAidantId(links, prefs.getString(AlertContract.KEY_SELECTED_PATIENT_AIDANT_ID, ""));
  }

  private static String selectedAidantId(ArrayList<AidantLink> links, String requestedId) {
    for (AidantLink link : links) {
      if (link.id.equals(requestedId)) {
        return link.id;
      }
    }
    return links.isEmpty() ? "" : links.get(0).id;
  }

  private static AidantLink createAidantLink(String name) {
    return new AidantLink(UUID.randomUUID().toString(), name, createChannel(), createAccessKey());
  }

  private static void saveBaseProfile(SharedPreferences prefs, Profile profile) {
    prefs.edit()
        .putString(AlertContract.KEY_PATIENT_ID, profile.id)
        .putString(AlertContract.KEY_PATIENT_NAME, profile.name)
        .putString(AlertContract.KEY_PATIENT_API_BASE, profile.apiBase)
        .putString(AlertContract.KEY_PATIENT_CHANNEL, profile.channel)
        .putString(AlertContract.KEY_PATIENT_ACCESS_KEY, profile.accessKey)
        .putString(AlertContract.KEY_SELECTED_PATIENT_AIDANT_ID, profile.aidantId)
        .apply();
  }

  private static void saveAidantLinks(
      SharedPreferences prefs,
      ArrayList<AidantLink> links,
      String selectedId
  ) {
    JSONArray array = new JSONArray();
    for (AidantLink link : links) {
      if (!link.isValid()) continue;
      JSONObject item = new JSONObject();
      try {
        item.put("id", link.id);
        item.put("name", link.name);
        item.put("channel", link.channel);
        item.put("accessKey", link.accessKey);
        array.put(item);
      } catch (Exception ignored) {
        // Skip malformed entries.
      }
    }

    AidantLink selected = links.get(0);
    for (AidantLink link : links) {
      if (link.id.equals(selectedId)) {
        selected = link;
        break;
      }
    }

    prefs.edit()
        .putString(AlertContract.KEY_PATIENT_AIDANT_LINKS, array.toString())
        .putString(AlertContract.KEY_SELECTED_PATIENT_AIDANT_ID, selected.id)
        .putString(AlertContract.KEY_PATIENT_CHANNEL, selected.channel)
        .putString(AlertContract.KEY_PATIENT_ACCESS_KEY, selected.accessKey)
        .apply();
  }

  private static void addIfValid(ArrayList<AidantLink> links, Set<String> seen, AidantLink link) {
    if (link == null || !link.isValid()) return;
    String key = link.channel + "|" + link.accessKey;
    if (seen.contains(key)) return;
    seen.add(key);
    links.add(link.ensureId());
  }

  private static void normalizeAidantNames(ArrayList<AidantLink> links) {
    for (int index = 0; index < links.size(); index++) {
      AidantLink link = links.get(index);
      if (link.name == null || link.name.trim().isEmpty()) {
        links.set(index, new AidantLink(link.id, cleanAidantName("", index), link.channel, link.accessKey));
      }
    }
  }

  private static String cleanName(String value) {
    String cleanValue = value == null ? "" : value.trim();
    return cleanValue.isEmpty() ? "Patient" : cleanValue;
  }

  private static String cleanAidantName(String value, int index) {
    String cleanValue = value == null ? "" : value.trim();
    if (!cleanValue.isEmpty()) return cleanValue;
    return index == 0 ? "Aidant principal" : "Aidant " + (index + 1);
  }

  private static String cleanChannel(String value) {
    String cleanValue = value == null ? "" : value.trim();
    return cleanValue.matches("[a-zA-Z0-9_-]{12,80}") ? cleanValue : "";
  }

  private static String cleanAccessKey(String value) {
    String cleanValue = value == null ? "" : value.trim();
    return cleanValue.matches("[a-zA-Z0-9_-]{22,160}") ? cleanValue : "";
  }

  private static String createChannel() {
    return "patient-" + UUID.randomUUID().toString();
  }

  private static String createAccessKey() {
    byte[] bytes = new byte[32];
    RANDOM.nextBytes(bytes);
    return Base64.encodeToString(
        bytes,
        Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING
    );
  }

  private static String encode(String value) {
    try {
      return URLEncoder.encode(value == null ? "" : value, "UTF-8");
    } catch (Exception ignored) {
      return "";
    }
  }

  static final class AidantLink {
    final String id;
    final String name;
    final String channel;
    final String accessKey;

    AidantLink(String id, String name, String channel, String accessKey) {
      this.id = id == null || id.trim().isEmpty() ? UUID.randomUUID().toString() : id.trim();
      this.name = name == null ? "" : name.trim();
      this.channel = cleanChannel(channel);
      this.accessKey = cleanAccessKey(accessKey);
    }

    boolean isValid() {
      return !channel.isEmpty() && !accessKey.isEmpty();
    }

    AidantLink ensureId() {
      return id.isEmpty()
          ? new AidantLink(UUID.randomUUID().toString(), name, channel, accessKey)
          : this;
    }
  }

  static final class Profile {
    final String id;
    final String name;
    final String apiBase;
    final String aidantId;
    final String aidantName;
    final String channel;
    final String accessKey;

    Profile(
        String id,
        String name,
        String apiBase,
        String aidantId,
        String aidantName,
        String channel,
        String accessKey
    ) {
      this.id = id == null || id.trim().isEmpty() ? UUID.randomUUID().toString() : id.trim();
      this.name = cleanName(name);
      this.apiBase = PatientLinkStore.trimSlash(apiBase);
      this.aidantId = aidantId == null || aidantId.trim().isEmpty() ? UUID.randomUUID().toString() : aidantId.trim();
      this.aidantName = cleanAidantName(aidantName, 0);
      this.channel = cleanChannel(channel);
      this.accessKey = cleanAccessKey(accessKey);
    }

    String displayName() {
      return cleanName(name);
    }

    String aidantDisplayName() {
      return cleanAidantName(aidantName, 0);
    }

    PatientLinkStore.Link asLink() {
      return new PatientLinkStore.Link(aidantId, aidantDisplayName(), apiBase, channel, accessKey);
    }
  }
}
