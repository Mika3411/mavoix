package com.mavoix.aidant;

import android.content.Context;
import android.content.pm.ApplicationInfo;
import android.net.Uri;

import java.util.Locale;

final class AidantApiBaseValidator {
  private static final String PRODUCTION_API_HOST = "mavoix.onrender.com";

  private AidantApiBaseValidator() {}

  static String normalize(String rawApiBase) {
    if (rawApiBase == null || rawApiBase.trim().isEmpty()) {
      return null;
    }

    Uri apiUri = Uri.parse(rawApiBase.trim());
    String scheme = apiUri.getScheme();
    String host = apiUri.getHost();
    if (scheme == null || host == null || host.trim().isEmpty()) {
      return null;
    }

    String cleanScheme = scheme.toLowerCase(Locale.US);
    if (!"http".equals(cleanScheme) && !"https".equals(cleanScheme)) {
      return null;
    }

    String cleanHost = host.toLowerCase(Locale.US);
    StringBuilder apiBase = new StringBuilder(cleanScheme).append("://");
    if (cleanHost.contains(":") && !cleanHost.startsWith("[")) {
      apiBase.append("[").append(cleanHost).append("]");
    } else {
      apiBase.append(cleanHost);
    }

    int port = apiUri.getPort();
    if (port > 0) {
      apiBase.append(":").append(port);
    }

    return apiBase.toString();
  }

  static boolean isAllowed(Context context, String apiBase) {
    Uri apiUri = Uri.parse(apiBase);
    String scheme = apiUri.getScheme();
    String host = apiUri.getHost();
    if (scheme == null || host == null) {
      return false;
    }

    String cleanScheme = scheme.toLowerCase(Locale.US);
    String cleanHost = host.toLowerCase(Locale.US);
    if ("https".equals(cleanScheme) && PRODUCTION_API_HOST.equals(cleanHost)) {
      return true;
    }

    return isDebugBuild(context) && isDevelopmentApiBase(cleanScheme, cleanHost);
  }

  private static boolean isDebugBuild(Context context) {
    return (context.getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
  }

  private static boolean isDevelopmentApiBase(String scheme, String host) {
    if (!"http".equals(scheme) && !"https".equals(scheme)) {
      return false;
    }

    return "localhost".equals(host)
        || "127.0.0.1".equals(host)
        || "10.0.2.2".equals(host)
        || host.startsWith("10.")
        || host.startsWith("192.168.")
        || host.endsWith(".local")
        || isPrivate172Host(host);
  }

  private static boolean isPrivate172Host(String host) {
    if (!host.startsWith("172.")) {
      return false;
    }

    String[] parts = host.split("\\.");
    if (parts.length < 2) {
      return false;
    }

    try {
      int secondPart = Integer.parseInt(parts[1]);
      return secondPart >= 16 && secondPart <= 31;
    } catch (NumberFormatException error) {
      return false;
    }
  }
}
