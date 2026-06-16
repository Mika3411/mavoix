package com.mavoix.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "DocumentSaver")
public class DocumentSaverPlugin extends Plugin {

  private String pendingContent;
  private String pendingMimeType;

  @PluginMethod
  public void saveJson(PluginCall call) {
    String fileName = call.getString("fileName", "ma-voix-profils.json");
    String content = call.getString("content");
    String mimeType = call.getString("mimeType", "application/json");

    if (content == null || content.isEmpty()) {
      call.reject("Le contenu est vide.");
      return;
    }

    pendingContent = content;
    pendingMimeType = mimeType;

    Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
    intent.addCategory(Intent.CATEGORY_OPENABLE);
    intent.setType(mimeType);
    intent.putExtra(Intent.EXTRA_TITLE, fileName);

    startActivityForResult(call, intent, "saveDocumentResult");
  }

  @ActivityCallback
  private void saveDocumentResult(PluginCall call, ActivityResult result) {
    Uri uri = result.getData() != null ? result.getData().getData() : null;

    if (result.getResultCode() != Activity.RESULT_OK || uri == null) {
      clearPending();
      call.reject("Enregistrement annulé.");
      return;
    }

    try {
      OutputStream outputStream = getActivity().getContentResolver().openOutputStream(uri);
      if (outputStream == null) {
        clearPending();
        call.reject("Impossible d'ouvrir le fichier de destination.");
        return;
      }

      outputStream.write((pendingContent != null ? pendingContent : "").getBytes(StandardCharsets.UTF_8));
      outputStream.flush();
      outputStream.close();

      JSObject ret = new JSObject();
      ret.put("uri", uri.toString());
      call.resolve(ret);
    } catch (Exception e) {
      call.reject("Erreur lors de l'enregistrement : " + e.getMessage(), e);
    } finally {
      clearPending();
    }
  }

  private void clearPending() {
    pendingContent = null;
    pendingMimeType = null;
  }
}