package com.mavoix.aidant;

import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

import java.net.URLEncoder;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

final class PatientLinkStore {
  private PatientLinkStore() {}

  static ArrayList<Link> read(SharedPreferences prefs) {
    ArrayList<Link> links = new ArrayList<>();
    Set<String> seen = new HashSet<>();

    try {
      JSONArray saved = new JSONArray(prefs.getString(AlertContract.KEY_CONNECTIONS, "[]"));
      for (int index = 0; index < saved.length(); index++) {
        JSONObject item = saved.optJSONObject(index);
        if (item == null) continue;

        Link link = new Link(
            item.optString("id", ""),
            item.optString("name", ""),
            item.optString("apiBase", AlertContract.DEFAULT_API_BASE),
            item.optString("channel", ""),
            item.optString("accessKey", item.optString("key", ""))
        );
        addIfValid(links, seen, link);
      }
    } catch (Exception ignored) {
      // Legacy migration below still runs.
    }

    String legacyChannel = prefs.getString(AlertContract.KEY_CHANNEL, "");
    if (legacyChannel != null && !legacyChannel.trim().isEmpty()) {
      addIfValid(
          links,
          seen,
          new Link(
              "",
              "Patient 1",
              prefs.getString(AlertContract.KEY_API_BASE, AlertContract.DEFAULT_API_BASE),
              legacyChannel,
              prefs.getString(AlertContract.KEY_ACCESS_KEY, "")
          )
      );
    }

    normalizeNames(links);
    if (!links.isEmpty()) {
      save(prefs, links, selectedId(prefs, links));
    }

    return links;
  }

  static Link addOrSelect(SharedPreferences prefs, String apiBase, String channel, String accessKey) {
    ArrayList<Link> links = read(prefs);
    String cleanApiBase = trimSlash(apiBase);
    String cleanChannel = channel == null ? "" : channel.trim();
    String cleanAccessKey = cleanAccessKey(accessKey);

    for (Link link : links) {
      if (link.apiBase.equals(cleanApiBase)
          && link.channel.equals(cleanChannel)
          && link.accessKey.equals(cleanAccessKey)) {
        save(prefs, links, link.id);
        return link;
      }
    }

    Link nextLink = new Link(
        UUID.randomUUID().toString(),
        "Patient " + (links.size() + 1),
        cleanApiBase,
        cleanChannel,
        cleanAccessKey
    );
    links.add(nextLink);
    save(prefs, links, nextLink.id);
    return nextLink;
  }

  static void rename(SharedPreferences prefs, String id, String name) {
    ArrayList<Link> links = read(prefs);
    String cleanName = name == null ? "" : name.trim();
    if (cleanName.isEmpty()) return;

    for (int index = 0; index < links.size(); index++) {
      Link link = links.get(index);
      if (link.id.equals(id)) {
        links.set(index, new Link(link.id, cleanName, link.apiBase, link.channel, link.accessKey));
        break;
      }
    }

    save(prefs, links, selectedId(prefs, links));
  }

  static void delete(SharedPreferences prefs, String id) {
    ArrayList<Link> links = read(prefs);
    for (int index = links.size() - 1; index >= 0; index--) {
      if (links.get(index).id.equals(id)) {
        links.remove(index);
      }
    }

    String selectedId = prefs.getString(AlertContract.KEY_SELECTED_CONNECTION_ID, "");
    if (id != null && id.equals(selectedId)) {
      selectedId = links.isEmpty() ? "" : links.get(0).id;
    }

    save(prefs, links, selectedId);
  }

  static void select(SharedPreferences prefs, String id) {
    save(prefs, read(prefs), id);
  }

  static String selectedId(SharedPreferences prefs, ArrayList<Link> links) {
    String selectedId = prefs.getString(AlertContract.KEY_SELECTED_CONNECTION_ID, "");
    for (Link link : links) {
      if (link.id.equals(selectedId)) {
        return selectedId;
      }
    }
    return links.isEmpty() ? "" : links.get(0).id;
  }

  static Link findById(ArrayList<Link> links, String id) {
    for (Link link : links) {
      if (link.id.equals(id)) return link;
    }
    return links.isEmpty() ? null : links.get(0);
  }

  static String buildAlertLink(Link link) {
    if (link == null) return "";
    return link.apiBase + "/aidant-alerte?channel=" + encode(link.channel)
        + (link.accessKey.isEmpty() ? "" : "&key=" + encode(link.accessKey));
  }

  static String trimSlash(String value) {
    if (value == null || value.trim().isEmpty()) {
      return AlertContract.DEFAULT_API_BASE;
    }
    value = value.trim();
    while (value.endsWith("/") && value.length() > 1) {
      value = value.substring(0, value.length() - 1);
    }
    return value;
  }

  private static void save(SharedPreferences prefs, ArrayList<Link> links, String selectedId) {
    JSONArray array = new JSONArray();
    for (Link link : links) {
      if (!link.isValid()) continue;
      JSONObject item = new JSONObject();
      try {
        item.put("id", link.id);
        item.put("name", link.name);
        item.put("apiBase", link.apiBase);
        item.put("channel", link.channel);
        item.put("accessKey", link.accessKey);
        array.put(item);
      } catch (Exception ignored) {
        // Skip malformed entries.
      }
    }

    SharedPreferences.Editor editor = prefs.edit()
        .putString(AlertContract.KEY_CONNECTIONS, array.toString())
        .putString(AlertContract.KEY_SELECTED_CONNECTION_ID, selectedId == null ? "" : selectedId);

    if (links.isEmpty()) {
      editor
          .remove(AlertContract.KEY_API_BASE)
          .remove(AlertContract.KEY_CHANNEL)
          .remove(AlertContract.KEY_ACCESS_KEY);
    } else {
      Link first = links.get(0);
      editor
          .putString(AlertContract.KEY_API_BASE, first.apiBase)
          .putString(AlertContract.KEY_CHANNEL, first.channel)
          .putString(AlertContract.KEY_ACCESS_KEY, first.accessKey);
    }

    editor.apply();
  }

  private static void addIfValid(ArrayList<Link> links, Set<String> seen, Link link) {
    if (link == null || !link.isValid()) return;
    String key = link.apiBase + "|" + link.channel + "|" + link.accessKey;
    if (seen.contains(key)) return;
    seen.add(key);
    links.add(link.ensureId());
  }

  private static void normalizeNames(ArrayList<Link> links) {
    for (int index = 0; index < links.size(); index++) {
      Link link = links.get(index);
      if (link.name == null || link.name.trim().isEmpty()) {
        links.set(index, new Link(link.id, "Patient " + (index + 1), link.apiBase, link.channel, link.accessKey));
      }
    }
  }

  private static String cleanAccessKey(String value) {
    if (value == null) return "";
    value = value.trim();
    return value.matches("[a-zA-Z0-9_-]{22,160}") ? value : "";
  }

  private static String encode(String value) {
    try {
      return URLEncoder.encode(value == null ? "" : value, "UTF-8");
    } catch (Exception ignored) {
      return "";
    }
  }

  static final class Link {
    final String id;
    final String name;
    final String apiBase;
    final String channel;
    final String accessKey;

    Link(String id, String name, String apiBase, String channel, String accessKey) {
      this.id = id == null || id.trim().isEmpty() ? UUID.randomUUID().toString() : id.trim();
      this.name = name == null ? "" : name.trim();
      this.apiBase = trimSlash(apiBase);
      this.channel = channel == null ? "" : channel.trim();
      this.accessKey = cleanAccessKey(accessKey);
    }

    boolean isValid() {
      return !channel.isEmpty();
    }

    Link ensureId() {
      return id.isEmpty()
          ? new Link(UUID.randomUUID().toString(), name, apiBase, channel, accessKey)
          : this;
    }
  }
}
