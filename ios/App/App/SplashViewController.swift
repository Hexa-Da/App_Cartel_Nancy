import UIKit
import AVKit
import AVFoundation
import Capacitor
import WebKit

class SplashViewController: UIViewController {
    
    private var playerLayer: AVPlayerLayer?
    private var player: AVPlayer?
    private var webView: WKWebView?
    private var isWebViewReady = false
    
    override func viewDidLoad() {
        super.viewDidLoad()
        setupVideoPlayer()
        
        // Optionnel : précharger la WebView (peut être désactivé si problématique)
        let enableWebViewPreloading = true // Changez à false pour désactiver
        if enableWebViewPreloading {
            preloadWebView()
        }
    }
    
    private func setupVideoPlayer() {
        // Essayer plusieurs chemins possibles pour la vidéo
        var videoURL: URL?
        
        // Méthode 1: Dans le dossier public
        let documentsPath = Bundle.main.bundlePath
        let publicPath = documentsPath + "/public/logo_cartel_anime_vertical_courte.mp4"
        if FileManager.default.fileExists(atPath: publicPath) {
            videoURL = URL(fileURLWithPath: publicPath)
            print("Vidéo trouvée dans public: \(publicPath)")
        }
        // Méthode 2: Bundle.main.path
        else if let videoPath = Bundle.main.path(forResource: "logo_cartel_anime_vertical_courte", ofType: "mp4") {
            videoURL = URL(fileURLWithPath: videoPath)
            print("Vidéo trouvée via Bundle.main.path: \(videoPath)")
        }
        // Méthode 3: Bundle.main.url
        else if let bundleURL = Bundle.main.url(forResource: "logo_cartel_anime_vertical_courte", withExtension: "mp4") {
            videoURL = bundleURL
            print("Vidéo trouvée via Bundle.main.url: \(bundleURL)")
        }
        // Méthode 4: Chemin direct
        else {
            let videoPath = documentsPath + "/logo_cartel_anime_vertical_courte.mp4"
            if FileManager.default.fileExists(atPath: videoPath) {
                videoURL = URL(fileURLWithPath: videoPath)
                print("Vidéo trouvée via chemin direct: \(videoPath)")
            } else {
                print("Vidéo non trouvée dans le bundle")
                print("Contenu du bundle: \(Bundle.main.bundlePath)")
                do {
                    let contents = try FileManager.default.contentsOfDirectory(atPath: Bundle.main.bundlePath)
                    print("Fichiers dans le bundle: \(contents)")
                    
                    // Chercher dans le dossier public
                    let publicDir = documentsPath + "/public"
                    if FileManager.default.fileExists(atPath: publicDir) {
                        let publicContents = try FileManager.default.contentsOfDirectory(atPath: publicDir)
                        print("Fichiers dans public: \(publicContents)")
                    }
                } catch {
                    print("Erreur lors de la lecture du bundle: \(error)")
                }
                transitionToMainApp()
                return
            }
        }
        
        guard let videoURL = videoURL else {
            print("Impossible de créer l'URL de la vidéo")
            transitionToMainApp()
            return
        }
        
        print("Chargement de la vidéo depuis: \(videoURL)")
        
        player = AVPlayer(url: videoURL)
        
        guard let player = player else { 
            print("Impossible de créer le player")
            transitionToMainApp()
            return 
        }
        
        // Créer le layer pour afficher la vidéo
        playerLayer = AVPlayerLayer(player: player)
        playerLayer?.frame = view.bounds
        playerLayer?.videoGravity = .resizeAspectFill
        
        if let playerLayer = playerLayer {
            view.layer.addSublayer(playerLayer)
        }
        
        // Observer la fin de la vidéo
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(playerDidFinishPlaying),
            name: .AVPlayerItemDidPlayToEndTime,
            object: player.currentItem
        )
        
        // Observer les erreurs
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(playerDidFail),
            name: .AVPlayerItemFailedToPlayToEndTime,
            object: player.currentItem
        )
        
        // Démarrer la lecture
        player.play()
    }
    
    @objc private func playerDidFinishPlaying() {
        transitionToMainApp()
    }
    
    @objc private func playerDidFail() {
        transitionToMainApp()
    }
    
    private func transitionToMainApp() {
        // Créer et présenter le ViewController principal Capacitor
        let storyboard = UIStoryboard(name: "Main", bundle: nil)
        if let mainViewController = storyboard.instantiateInitialViewController() {
            mainViewController.modalPresentationStyle = .fullScreen
            mainViewController.modalTransitionStyle = .crossDissolve
            present(mainViewController, animated: false, completion: nil)
        }
    }
    
    private func preloadWebView() {
        // Précharger la WebView en arrière-plan
        let webConfiguration = WKWebViewConfiguration()
        webView = WKWebView(frame: .zero, configuration: webConfiguration)
        
        // Charger l'index.html depuis le bundle
        if let indexPath = Bundle.main.path(forResource: "index", ofType: "html") {
            let indexURL = URL(fileURLWithPath: indexPath)
            webView?.loadFileURL(indexURL, allowingReadAccessTo: indexURL.deletingLastPathComponent())
            
            // Observer quand la WebView est prête
            webView?.navigationDelegate = self
        }
    }
    
    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        playerLayer?.frame = view.bounds
    }
    
    deinit {
        NotificationCenter.default.removeObserver(self)
    }
}

// Extension pour gérer le chargement de la WebView
extension SplashViewController: WKNavigationDelegate {
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        print("WebView préchargée et prête")
        isWebViewReady = true
    }
    
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        print("Erreur lors du préchargement de la WebView: \(error)")
        // En cas d'erreur, on continue quand même
        isWebViewReady = true
    }
} 