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
  final int deliveredTo;
  final String deliveredAt;
  final String readByUserAt;
  final String readByCaregiverAt;

  MessageItem(
      String id,
      String connectionId,
      String patientName,
      String senderRole,
      String message,
      String messageType,
      String createdAt,
      int deliveredTo,
      String deliveredAt,
      String readByUserAt,
      String readByCaregiverAt
  ) {
    this.id = id;
    this.connectionId = connectionId == null ? "" : connectionId;
    this.patientName = patientName == null || patientName.isEmpty() ? "Patient" : patientName;
    this.senderRole = senderRole;
    this.message = message == null ? "" : message;
    this.messageType = messageType == null || messageType.isEmpty() ? "text" : messageType;
    this.createdAt = createdAt;
    this.deliveredTo = Math.max(0, deliveredTo);
    this.deliveredAt = deliveredAt == null ? "" : deliveredAt;
    this.readByUserAt = readByUserAt == null ? "" : readByUserAt;
    this.readByCaregiverAt = readByCaregiverAt == null ? "" : readByCaregiverAt;
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

  boolean isDelivered() {
    return deliveredTo > 0 || !deliveredAt.isEmpty();
  }

  boolean isReadBy(String role) {
    return "caregiver".equals(role) ? !readByCaregiverAt.isEmpty() : !readByUserAt.isEmpty();
  }

  MessageItem withDeliveredAt(String nextDeliveredAt) {
    String value = nextDeliveredAt == null ? "" : nextDeliveredAt;
    if (value.isEmpty() && isDelivered()) return this;
    return new MessageItem(
        id,
        connectionId,
        patientName,
        senderRole,
        message,
        messageType,
        createdAt,
        Math.max(1, deliveredTo),
        deliveredAt.isEmpty() ? value : deliveredAt,
        readByUserAt,
        readByCaregiverAt
    );
  }

  MessageItem withReadAt(String role, String readAt) {
    String value = readAt == null ? "" : readAt;
    if (value.isEmpty()) return this;

    String nextReadByUserAt = readByUserAt;
    String nextReadByCaregiverAt = readByCaregiverAt;
    if ("caregiver".equals(role)) {
      if (!readByCaregiverAt.isEmpty()) return withDeliveredAt(value);
      nextReadByCaregiverAt = value;
    } else {
      if (!readByUserAt.isEmpty()) return withDeliveredAt(value);
      nextReadByUserAt = value;
    }

    return new MessageItem(
        id,
        connectionId,
        patientName,
        senderRole,
        message,
        messageType,
        createdAt,
        Math.max(1, deliveredTo),
        deliveredAt.isEmpty() ? value : deliveredAt,
        nextReadByUserAt,
        nextReadByCaregiverAt
    );
  }

  MessageItem mergeReceipts(MessageItem other) {
    if (other == null) return this;

    int nextDeliveredTo = Math.max(deliveredTo, other.deliveredTo);
    String nextDeliveredAt = !other.deliveredAt.isEmpty() ? other.deliveredAt : deliveredAt;
    String nextReadByUserAt = !other.readByUserAt.isEmpty() ? other.readByUserAt : readByUserAt;
    String nextReadByCaregiverAt = !other.readByCaregiverAt.isEmpty()
        ? other.readByCaregiverAt
        : readByCaregiverAt;

    if (nextDeliveredTo == deliveredTo
        && nextDeliveredAt.equals(deliveredAt)
        && nextReadByUserAt.equals(readByUserAt)
        && nextReadByCaregiverAt.equals(readByCaregiverAt)) {
      return this;
    }

    return new MessageItem(
        id,
        connectionId,
        patientName,
        senderRole,
        message,
        messageType,
        createdAt,
        nextDeliveredTo,
        nextDeliveredAt,
        nextReadByUserAt,
        nextReadByCaregiverAt
    );
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
        object.optString("createdAt", ""),
        object.optInt("deliveredTo", 0),
        object.optString("deliveredAt", ""),
        object.optString("readByUserAt", ""),
        object.optString("readByCaregiverAt", "")
    );
  }
}
