package com.mavoix.aidant;

import org.json.JSONObject;

final class MessageItem {
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
