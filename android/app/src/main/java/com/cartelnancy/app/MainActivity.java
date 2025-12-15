package com.cartelnancy.app;

import com.getcapacitor.BridgeActivity;
import com.codetrixstudio.capacitor.GoogleAuth.GoogleAuth;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.graphics.Color;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    // Initialise le plugin Google Auth
    registerPlugin(GoogleAuth.class);
    
    // ✅ Configuration Edge-to-Edge pour Android (Status Bar + Navigation Bar)
    setupEdgeToEdge();
  }
  
  private void setupEdgeToEdge() {
    Window window = getWindow();
    
    // Rendre la navigation bar transparente
    window.setNavigationBarColor(Color.TRANSPARENT);
    
    // Rendre la status bar transparente (si pas déjà fait)
    window.setStatusBarColor(Color.TRANSPARENT);
    
    // Activer le mode Edge-to-Edge (app passe sous les barres système)
    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP) {
      int flags = View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                 | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                 | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION;
      
      window.getDecorView().setSystemUiVisibility(flags);
      
      // Permettre à l'app de dessiner derrière les barres système
      window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
    }
  }
}
