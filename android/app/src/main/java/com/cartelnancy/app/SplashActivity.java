package com.cartelnancy.app;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;

import com.google.android.exoplayer2.ExoPlayer;
import com.google.android.exoplayer2.MediaItem;
import com.google.android.exoplayer2.Player;
import com.google.android.exoplayer2.ui.PlayerView;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;

public class SplashActivity extends AppCompatActivity {

    private ExoPlayer player;
    private PlayerView playerView;
    private Handler handler = new Handler(Looper.getMainLooper());

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Configuration de la barre de statut en noir
        setupStatusBar();
        
        setContentView(R.layout.activity_splash);
        playerView = findViewById(R.id.player_view);
        playerView.setUseController(false);
        playerView.setBackgroundColor(Color.BLACK);

        // Initialise le player
        player = new ExoPlayer.Builder(this).build();
        playerView.setPlayer(player);

        // Prépare la vidéo depuis res/raw
        String videoPath = "android.resource://" + getPackageName() + "/" + R.raw.logo_cartel_anime_vertical_courte;
        MediaItem mediaItem = MediaItem.fromUri(Uri.parse(videoPath));
        player.setMediaItem(mediaItem);
        player.prepare();
        player.play();

        // Log pour debug
        Log.d("SplashActivity", "ExoPlayer started");

        // Passe à MainActivity à la fin de la vidéo avec transition smooth
        player.addListener(new Player.Listener() {
            @Override
            public void onPlaybackStateChanged(int state) {
                if (state == Player.STATE_READY) {
                    Log.d("SplashActivity", "ExoPlayer prêt, vidéo va démarrer");
                }
                if (state == Player.STATE_ENDED) {
                    goToMainActivity();
                }
            }
        });
    }
    
    private void setupStatusBar() {
        // Configuration de la barre de statut
        Window window = getWindow();
        
        // Couleur de la barre de statut
        window.setStatusBarColor(Color.BLACK);
        
        // Configuration pour Android 6.0+ (API 23+)
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
            // Icônes de la barre de statut en blanc (pour fond noir)
            window.getDecorView().setSystemUiVisibility(
                window.getDecorView().getSystemUiVisibility() & ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
            );
        }
        
        // Configuration pour Android 8.0+ (API 26+)
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            // Désactiver le mode sombre pour la barre de statut
            window.getDecorView().setSystemUiVisibility(
                window.getDecorView().getSystemUiVisibility() & ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
            );
        }
        
        // S'assurer que la barre de statut est visible
        window.clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
    }

    private void goToMainActivity() {
        Intent intent = new Intent(SplashActivity.this, MainActivity.class);
        startActivity(intent);
        overridePendingTransition(0, 0);
        finish();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (player != null) {
            player.release();
        }
        if (handler != null) {
            handler.removeCallbacksAndMessages(null);
        }
    }
} 