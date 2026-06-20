package com.mavoix.aidant;

import static org.junit.Assert.assertEquals;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;

import org.junit.Test;

public class AidantMessageUtilsTest {
  @Test
  public void escapesJsonSpecialCharacters() {
    assertEquals(
        "Bonjour \\\"Alice\\\"\\\\Aidant\\nligne 2\\r",
        AidantMessageUtils.escapeJson("Bonjour \"Alice\"\\Aidant\nligne 2\r")
    );
  }

  @Test
  public void readsUtf8StreamsAndFormatsMessageTimes() throws Exception {
    ByteArrayInputStream stream = new ByteArrayInputStream(
        "Bonjour\nAlice".getBytes(StandardCharsets.UTF_8)
    );

    assertEquals("BonjourAlice", AidantMessageUtils.readStream(stream));
    assertEquals("12:34", AidantMessageUtils.formatMessageTime("2026-06-20T12:34:56.000Z"));
    assertEquals("--:--", AidantMessageUtils.formatMessageTime("invalide"));
  }

  @Test
  public void truncatesNotificationTextForAndroidNotifications() {
    StringBuilder longText = new StringBuilder();
    for (int index = 0; index < 150; index++) {
      longText.append("a");
    }

    String result = AidantMessageUtils.truncateNotificationText(
        "  " + longText + "\n"
    );

    assertEquals(140, result.length());
    assertEquals("...", result.substring(137));
  }

  @Test
  public void encodesCaregiverAccessKeyQuery() throws Exception {
    PatientLinkStore.Link link = new PatientLinkStore.Link(
        "id-1",
        "Alice",
        "https://mavoix.onrender.com/",
        "channel_12345",
        "caregiverAccessKey_123456"
    );

    assertEquals(
        "&key=caregiverAccessKey_123456",
        AidantMessageUtils.linkAccessKeyQuery(link)
    );
    assertEquals("", AidantMessageUtils.linkAccessKeyQuery(null));
  }
}
