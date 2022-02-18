import CoreBluetooth
import PolarBleSdk
import React
import RxSwift

enum PolarEvent: String, CaseIterable {
    case deviceFound
    case deviceConnecting
    case deviceConnected
    case deviceDisconnected
    case batteryLevelReceived
    case disInformationReceived
    case blePowerOn
    case blePowerOff
    case hrFeatureReady
    case ftpFeatureReady
    case streamingFeaturesReady
    case hrValueReceived
}

enum PolarBleError: Error {
    case unconfigured
}

@objc(PolarBle)
class PolarBle: RCTEventEmitter, PolarBleApiObserver, PolarBleApiPowerStateObserver,
    PolarBleApiDeviceInfoObserver, PolarBleApiDeviceFeaturesObserver, PolarBleApiDeviceHrObserver
{
    private var api: PolarBleApi?
    private var autoConnectDisposable: Disposable?
    private var searchDisposable: Disposable?

    @objc override func startObserving() {
        super.startObserving()
        setObservers()
    }

    @objc override func supportedEvents() -> [String]! {
        return PolarEvent.allCases.map { $0.rawValue }
    }

    @objc override func constantsToExport() -> [AnyHashable: Any]! {
        let keyValuePairs = PolarEvent.allCases.map {
            (
                $0.rawValue
                    .reduce("") { $0 + ($1.isUppercase ? "_\($1.lowercased())" : "\($1)") }
                    .uppercased(),
                $0.rawValue
            )
        }

        return Dictionary(uniqueKeysWithValues: keyValuePairs)
    }

    @objc override class func requiresMainQueueSetup() -> Bool {
        return true
    }

    @objc(configureWithFeatures:)
    func configure(features: Int) {
        api = PolarBleApiDefaultImpl.polarImplementation(.main, features: features)
        setObservers()
    }

    @objc(connectToDevice:resolver:rejecter:)
    func connectToDevice(
        _ identifier: String, resolver resolve: RCTPromiseResolveBlock,
        rejecter reject: RCTPromiseRejectBlock
    ) {
        do {
            guard let api = api else {
                throw PolarBleError.unconfigured
            }

            try api.connectToDevice(identifier)
            resolve(nil)
        } catch {
            reject(nil, error.localizedDescription, error)
        }
    }

    @objc(disconnectFromDevice:resolver:rejecter:)
    func disconnectFromDevice(
        _ identifier: String, resolver resolve: RCTPromiseResolveBlock,
        rejecter reject: RCTPromiseRejectBlock
    ) {
        do {
            guard let api = api else {
                throw PolarBleError.unconfigured
            }

            try api.disconnectFromDevice(identifier)
            resolve(nil)
        } catch {
            reject(nil, error.localizedDescription, error)
        }
    }

    @objc(searchForDeviceWithResolver:rejecter:)
    func searchForDevice(
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        do {
            guard let api = api else {
                throw PolarBleError.unconfigured
            }

            searchDisposable?.dispose()
            searchDisposable = api.searchForDevice().subscribe { event in
                switch event {
                case .completed:
                    resolve(nil)
                case .error(let error):
                    reject(nil, error.localizedDescription, error)
                case .next(let deviceInfo):
                    self.sendEvent(
                        withName: PolarEvent.deviceFound.rawValue,
                        body: self.toJsDictionary(from: deviceInfo))
                }
            }
        } catch {
            reject(nil, error.localizedDescription, error)
        }
    }

    @objc(startAutoConnectToDeviceWithRssi:service:polarDeviceType:resolver:rejecter:)
    func startAutoConnectToDevice(
        rssi: Int, service: String, polarDeviceType: String,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        do {
            guard let api = api else {
                throw PolarBleError.unconfigured
            }

            autoConnectDisposable?.dispose()
            autoConnectDisposable = api.startAutoConnectToDevice(
                rssi, service: CBUUID(string: service), polarDeviceType: polarDeviceType
            )
            .subscribe { event in
                switch event {
                case .completed:
                    resolve(nil)
                case .error(let error):
                    reject(nil, error.localizedDescription, error)
                }
            }
        } catch {
            reject(nil, error.localizedDescription, error)
        }
    }

    func deviceConnecting(_ identifier: PolarDeviceInfo) {
        sendEvent(
            withName: PolarEvent.deviceConnecting.rawValue, body: toJsDictionary(from: identifier))
    }

    func deviceConnected(_ identifier: PolarDeviceInfo) {
        sendEvent(
            withName: PolarEvent.deviceConnected.rawValue, body: toJsDictionary(from: identifier))
    }

    func deviceDisconnected(_ identifier: PolarDeviceInfo) {
        sendEvent(
            withName: PolarEvent.deviceDisconnected.rawValue, body: toJsDictionary(from: identifier)
        )
    }

    func batteryLevelReceived(_ identifier: String, batteryLevel: UInt) {
        sendEvent(
            withName: PolarEvent.batteryLevelReceived.rawValue,
            body: ["identifier": identifier, "batteryLevel": Int(batteryLevel)])
    }

    func disInformationReceived(_ identifier: String, uuid: CBUUID, value: String) {
        sendEvent(
            withName: PolarEvent.disInformationReceived.rawValue,
            body: ["identifier": identifier, "uuid": uuid.uuidString, "value": value])
    }

    func blePowerOn() {
        sendEvent(withName: PolarEvent.blePowerOn.rawValue, body: nil)
    }

    func blePowerOff() {
        sendEvent(withName: PolarEvent.blePowerOff.rawValue, body: nil)
    }

    func hrFeatureReady(_ identifier: String) {
        sendEvent(withName: PolarEvent.hrFeatureReady.rawValue, body: identifier)
    }

    func ftpFeatureReady(_ identifier: String) {
        sendEvent(withName: PolarEvent.ftpFeatureReady.rawValue, body: identifier)
    }

    func streamingFeaturesReady(
        _ identifier: String, streamingFeatures: Set<DeviceStreamingFeature>
    ) {
        sendEvent(
            withName: PolarEvent.streamingFeaturesReady.rawValue,
            body: ["identifier": identifier, "streamingFeatures": streamingFeatures])
    }

    func hrValueReceived(_ identifier: String, data: PolarHrData) {
        sendEvent(
            withName: PolarEvent.hrValueReceived.rawValue,
            body: [
                "identifier": identifier,
                "data": [
                    "hr": Int(data.hr),
                    "rrs": data.rrs,
                    "rrsMs": data.rrsMs,
                    "contact": data.contact,
                    "contactSupported": data.contactSupported,
                ],
            ])
    }

    private func toJsDictionary(from deviceInfo: PolarDeviceInfo) -> [String: Any] {
        return [
            "deviceId": deviceInfo.deviceId,
            "address": deviceInfo.address.uuidString,
            "rssi": deviceInfo.rssi,
            "name": deviceInfo.name,
            "connectable": deviceInfo.connectable,
        ]
    }

    private func setObservers() {
        api?.observer = self
        api?.deviceInfoObserver = self
        api?.powerStateObserver = self
        api?.deviceHrObserver = self
        api?.deviceFeaturesObserver = self
    }
}
