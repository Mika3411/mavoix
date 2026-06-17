import AVFoundation
import Capacitor
import Foundation

@objc(NativeSpeechPlugin)
public class NativeSpeechPlugin: CAPPlugin, CAPBridgedPlugin, AVSpeechSynthesizerDelegate {
    public let identifier = "NativeSpeechPlugin"
    public let jsName = "NativeSpeech"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "speak", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise)
    ]

    private let synthesizer = AVSpeechSynthesizer()
    private var pendingCall: CAPPluginCall?
    private var ignoreNextCancel = false

    public override func load() {
        synthesizer.delegate = self
        synthesizer.usesApplicationAudioSession = true
    }

    @objc func speak(_ call: CAPPluginCall) {
        let text = (call.getString("text") ?? "")
            .trimmingCharacters(in: .whitespacesAndNewlines)

        guard !text.isEmpty else {
            call.resolve()
            return
        }

        let lang = call.getString("lang") ?? "fr-FR"
        let rate = call.getFloat("rate") ?? 1.0
        let pitch = call.getFloat("pitch") ?? 1.0
        let volume = call.getFloat("volume") ?? 1.0

        DispatchQueue.main.async { [weak self] in
            guard let self else {
                call.reject("Synthese vocale iOS indisponible.")
                return
            }

            do {
                let audioSession = AVAudioSession.sharedInstance()
                try audioSession.setCategory(.playback, mode: .spokenAudio, options: [.duckOthers])
                try audioSession.setActive(true)
            } catch {
                call.reject("Impossible d'activer l'audio iOS : \(error.localizedDescription)", nil, error)
                return
            }

            if self.synthesizer.isSpeaking {
                self.ignoreNextCancel = true
                self.synthesizer.stopSpeaking(at: .immediate)
            }

            self.pendingCall?.resolve()
            self.pendingCall = call

            let utterance = AVSpeechUtterance(string: text)
            utterance.voice = self.resolveVoice(lang)
            utterance.rate = self.adjustRate(rate)
            utterance.pitchMultiplier = min(2.0, max(0.5, pitch))
            utterance.volume = min(1.0, max(0.0, volume))

            self.synthesizer.speak(utterance)
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            self?.synthesizer.stopSpeaking(at: .immediate)
            self?.pendingCall?.resolve()
            self?.pendingCall = nil
            call.resolve()
        }
    }

    public func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        pendingCall?.resolve()
        pendingCall = nil
    }

    public func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
        if ignoreNextCancel {
            ignoreNextCancel = false
            return
        }

        pendingCall?.resolve()
        pendingCall = nil
    }

    private func resolveVoice(_ lang: String) -> AVSpeechSynthesisVoice? {
        let normalizedLang = lang.isEmpty ? "fr-FR" : lang
        let languagePrefix = String(normalizedLang.prefix(2)).lowercased()

        return AVSpeechSynthesisVoice(language: normalizedLang)
            ?? AVSpeechSynthesisVoice.speechVoices().first {
                $0.language.lowercased() == normalizedLang.lowercased() && $0.quality == .enhanced
            }
            ?? AVSpeechSynthesisVoice.speechVoices().first {
                $0.language.lowercased() == normalizedLang.lowercased()
            }
            ?? AVSpeechSynthesisVoice.speechVoices().first {
                $0.language.lowercased().hasPrefix(languagePrefix)
            }
            ?? AVSpeechSynthesisVoice(language: "fr-FR")
    }

    private func adjustRate(_ rate: Float) -> Float {
        let cleanRate = min(2.0, max(0.5, rate))
        let adjustedRate = AVSpeechUtteranceDefaultSpeechRate * cleanRate
        return min(AVSpeechUtteranceMaximumSpeechRate, max(AVSpeechUtteranceMinimumSpeechRate, adjustedRate))
    }
}
