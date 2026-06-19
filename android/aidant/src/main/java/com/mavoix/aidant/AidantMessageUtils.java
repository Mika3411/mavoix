package com.mavoix.aidant;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

final class AidantMessageUtils {
  private AidantMessageUtils() {}

  static String linkAccessKeyQuery(PatientLinkStore.Link link) throws Exception {
    if (link == null || link.accessKey.isEmpty()) {
      return "";
    }
    return "&key=" + URLEncoder.encode(link.accessKey, "UTF-8");
  }

  static String readStream(InputStream stream) throws Exception {
    if (stream == null) return "";
    StringBuilder builder = new StringBuilder();
    BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8));
    String line;
    while ((line = reader.readLine()) != null) {
      builder.append(line);
    }
    return builder.toString();
  }

  static String escapeJson(String value) {
    return value
        .replace("\\", "\\\\")
        .replace("\"", "\\\"")
        .replace("\n", "\\n")
        .replace("\r", "\\r");
  }

  static String formatMessageTime(String value) {
    if (value != null && value.length() >= 16) {
      return value.substring(11, 16);
    }
    return "--:--";
  }

  static String truncateNotificationText(String value) {
    if (value == null) return "";
    value = value.replace("\n", " ").replace("\r", " ").trim();
    return value.length() > 140 ? value.substring(0, 137) + "..." : value;
  }
}
