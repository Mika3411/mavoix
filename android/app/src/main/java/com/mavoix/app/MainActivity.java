package com.mavoix.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(DocumentSaverPlugin.class);
    registerPlugin(MessageNotifierPlugin.class);
    super.onCreate(savedInstanceState);
  }
}
