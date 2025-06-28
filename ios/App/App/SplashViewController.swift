import UIKit
import AVKit
import AVFoundation
import Capacitor
import WebKit

class SplashViewController: UIViewController {
    
    private var playerLayer: AVPlayerLayer?
    private var player: AVPlayer?
    private var fadeOutAnimation: CABasicAnimation?
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
        let publicPath = documentsPath + "/public/animation_portrait.mov"
        if FileManager.default.fileExists(atPath: publicPath) {
            videoURL = URL(fileURLWithPath: publicPath)
            print("Vidéo trouvée dans public: \(publicPath)")
        }
        // Méthode 2: Bundle.main.path
        else if let videoPath = Bundle.main.path(forResource: "animation_portrait", ofType: "mov") {
            videoURL = URL(fileURLWithPath: videoPath)
            print("Vidéo trouvée via Bundle.main.path: \(videoPath)")
        }
        // Méthode 3: Bundle.main.url
        else if let bundleURL = Bundle.main.url(forResource: "animation_portrait", withExtension: "mov") {
            videoURL = bundleURL
            print("Vidéo trouvée via Bundle.main.url: \(bundleURL)")
        }
        // Méthode 4: Chemin direct
        else {
            let videoPath = documentsPath + "/animation_portrait.mov"
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
        print("Vidéo terminée, transition smooth vers l'app principale")
        startSmoothTransition()
    }
    
    @objc private func playerDidFail() {
        print("Erreur lors de la lecture de la vidéo")
        transitionToMainApp()
    }
    
    private func startSmoothTransition() {
        // Option 1: Fade-out simple avec délai optimisé (recommandé)
        startFadeOutTransition()
        
        // Option 2: Pour une transition plus sophistiquée, décommentez la ligne suivante :
        // startSophisticatedTransition()
        
        // Option 3: Pour une transition ultra-rapide (peut causer du flash), décommentez :
        // startQuickTransition()
    }
    
    private func startFadeOutTransition() {
        // Créer une animation de fade-out pour le playerLayer
        fadeOutAnimation = CABasicAnimation(keyPath: "opacity")
        fadeOutAnimation?.fromValue = 1.0
        fadeOutAnimation?.toValue = 0.0
        fadeOutAnimation?.duration = 0.8 // Augmenté à 800ms
        fadeOutAnimation?.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
        fadeOutAnimation?.fillMode = .forwards
        fadeOutAnimation?.isRemovedOnCompletion = false
        
        // Définir le delegate pour détecter la fin de l'animation
        fadeOutAnimation?.delegate = self
        
        // Appliquer l'animation au playerLayer
        playerLayer?.add(fadeOutAnimation!, forKey: "fadeOut")
        
        // Appliquer aussi au view principal pour un effet complet
        UIView.animate(withDuration: 0.8, delay: 0, options: [.curveEaseInOut], animations: {
            self.view.alpha = 0.0
        }, completion: { _ in
            // Attendre que la WebView soit prête ou un délai maximum
            if self.isWebViewReady {
                self.transitionToMainApp()
            } else {
                // Délai de fallback si la WebView n'est pas prête
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                    self.transitionToMainApp()
                }
            }
        })
    }
    
    private func startSophisticatedTransition() {
        // Animation plus sophistiquée avec scale et fade
        let scaleAnimation = CABasicAnimation(keyPath: "transform.scale")
        scaleAnimation.fromValue = 1.0
        scaleAnimation.toValue = 1.1
        scaleAnimation.duration = 0.3
        scaleAnimation.timingFunction = CAMediaTimingFunction(name: .easeOut)
        
        let fadeAnimation = CABasicAnimation(keyPath: "opacity")
        fadeAnimation.fromValue = 1.0
        fadeAnimation.toValue = 0.0
        fadeAnimation.duration = 0.5
        fadeAnimation.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
        fadeAnimation.fillMode = .forwards
        fadeAnimation.isRemovedOnCompletion = false
        
        // Grouper les animations
        let animationGroup = CAAnimationGroup()
        animationGroup.animations = [scaleAnimation, fadeAnimation]
        animationGroup.duration = 0.5
        animationGroup.delegate = self
        
        playerLayer?.add(animationGroup, forKey: "sophisticatedTransition")
        
        // Animation du view principal
        UIView.animate(withDuration: 0.5, delay: 0, options: [.curveEaseInOut], animations: {
            self.view.alpha = 0.0
            self.view.transform = CGAffineTransform(scaleX: 1.1, y: 1.1)
        }, completion: { _ in
            self.transitionToMainApp()
        })
    }
    
    private func startQuickTransition() {
        // Transition rapide sans délai (peut causer du flash sur émulateur)
        UIView.animate(withDuration: 0.3, delay: 0, options: [.curveEaseInOut], animations: {
            self.view.alpha = 0.0
        }, completion: { _ in
            self.transitionToMainApp()
        })
    }
    
    private func transitionToMainApp() {
        // Créer et présenter le ViewController principal Capacitor
        let storyboard = UIStoryboard(name: "Main", bundle: nil)
        if let mainViewController = storyboard.instantiateInitialViewController() {
            mainViewController.modalPresentationStyle = .fullScreen
            mainViewController.modalTransitionStyle = .crossDissolve
            
            // Transition avec fade-in personnalisé
            present(mainViewController, animated: true) {
                // Callback après la transition
                print("Transition vers l'app principale terminée")
            }
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

// Extension pour gérer la fin de l'animation
extension SplashViewController: CAAnimationDelegate {
    func animationDidStop(_ anim: CAAnimation, finished flag: Bool) {
        if anim == fadeOutAnimation && flag {
            // L'animation de fade-out est terminée
            print("Animation de fade-out terminée")
        }
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