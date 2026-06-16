import Capacitor
import UIKit

@objc(MainViewController)
class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(DocumentSaverPlugin())
        bridge?.registerPluginInstance(MessageNotifierPlugin())
    }
}
