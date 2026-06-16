import Capacitor
import Foundation
import UIKit
import UserNotifications

@objc(MessageNotifierPlugin)
public class MessageNotifierPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "MessageNotifierPlugin"
    public let jsName = "MessageNotifier"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "requestPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "showIncoming", returnType: CAPPluginReturnPromise)
    ]

    @objc func requestPermission(_ call: CAPPluginCall) {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            switch settings.authorizationStatus {
            case .authorized, .provisional, .ephemeral:
                call.resolve([
                    "granted": true,
                    "permission": "granted"
                ])
            case .notDetermined:
                UNUserNotificationCenter.current().requestAuthorization(
                    options: [.alert, .sound, .badge]
                ) { granted, error in
                    if let error {
                        call.reject("Impossible de demander l'autorisation : \(error.localizedDescription)", nil, error)
                        return
                    }

                    call.resolve([
                        "granted": granted,
                        "permission": granted ? "granted" : "denied"
                    ])
                }
            case .denied:
                call.resolve([
                    "granted": false,
                    "permission": "denied"
                ])
            @unknown default:
                call.resolve([
                    "granted": false,
                    "permission": "unknown"
                ])
            }
        }
    }

    @objc func showIncoming(_ call: CAPPluginCall) {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            guard settings.authorizationStatus == .authorized
                || settings.authorizationStatus == .provisional
                || settings.authorizationStatus == .ephemeral else {
                call.resolve(["shown": false])
                return
            }

            let title = call.getString("title") ?? "Message Ma Voix"
            let body = call.getString("body") ?? "Nouveau message recu."
            let tag = call.getString("tag") ?? "ma-voix-message"

            let content = UNMutableNotificationContent()
            content.title = title
            content.body = body
            content.sound = .default
            content.categoryIdentifier = "message"

            let request = UNNotificationRequest(
                identifier: tag,
                content: content,
                trigger: nil
            )

            UNUserNotificationCenter.current().add(request) { error in
                if let error {
                    call.reject("Impossible d'afficher la notification : \(error.localizedDescription)", nil, error)
                    return
                }

                call.resolve(["shown": true])
            }
        }
    }
}
