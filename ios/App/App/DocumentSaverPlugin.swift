import Capacitor
import Foundation
import UIKit

@objc(DocumentSaverPlugin)
public class DocumentSaverPlugin: CAPPlugin, CAPBridgedPlugin, UIDocumentPickerDelegate {
    public let identifier = "DocumentSaverPlugin"
    public let jsName = "DocumentSaver"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "saveJson", returnType: CAPPluginReturnPromise)
    ]

    private var pendingCall: CAPPluginCall?
    private var pendingFileURL: URL?

    @objc func saveJson(_ call: CAPPluginCall) {
        let fileName = sanitizedFileName(call.getString("fileName") ?? "ma-voix-profils.json")
        guard let content = call.getString("content"), !content.isEmpty else {
            call.reject("Le contenu est vide.")
            return
        }

        do {
            let exportDirectory = FileManager.default.temporaryDirectory
                .appendingPathComponent("MaVoixExports", isDirectory: true)
            try FileManager.default.createDirectory(
                at: exportDirectory,
                withIntermediateDirectories: true
            )

            let fileURL = exportDirectory.appendingPathComponent(fileName)
            try content.write(to: fileURL, atomically: true, encoding: .utf8)
            call.keepAlive = true

            DispatchQueue.main.async { [weak self] in
                guard let self else {
                    call.keepAlive = false
                    call.reject("Impossible de finaliser l'export iOS.")
                    return
                }
                guard self.pendingCall == nil else {
                    call.keepAlive = false
                    call.reject("Un export est deja en cours.")
                    return
                }
                guard let viewController = self.bridge?.viewController else {
                    call.keepAlive = false
                    call.reject("Impossible d'ouvrir le selecteur de fichier iOS.")
                    return
                }

                self.pendingCall = call
                self.pendingFileURL = fileURL

                let picker = UIDocumentPickerViewController(
                    forExporting: [fileURL],
                    asCopy: true
                )
                picker.delegate = self
                viewController.present(picker, animated: true)
            }
        } catch {
            call.reject("Erreur lors de l'enregistrement : \(error.localizedDescription)", nil, error)
        }
    }

    public func documentPicker(
        _ controller: UIDocumentPickerViewController,
        didPickDocumentsAt urls: [URL]
    ) {
        let exportedURL = urls.first ?? pendingFileURL
        pendingCall?.resolve([
            "uri": exportedURL?.absoluteString ?? ""
        ])
        clearPendingExport()
    }

    public func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
        pendingCall?.reject("Enregistrement annule.")
        clearPendingExport()
    }

    private func clearPendingExport() {
        if let call = pendingCall {
            call.keepAlive = false
            bridge?.releaseCall(call)
        }
        pendingCall = nil
        pendingFileURL = nil
    }

    private func sanitizedFileName(_ value: String) -> String {
        let forbiddenCharacters = CharacterSet(charactersIn: "/\\:?%*|\"<>")
        let cleanName = value
            .components(separatedBy: forbiddenCharacters)
            .joined(separator: "-")
            .trimmingCharacters(in: .whitespacesAndNewlines)

        return cleanName.isEmpty ? "ma-voix-profils.json" : cleanName
    }
}
