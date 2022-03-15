package com.reactnativepolarble
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter
import com.polar.sdk.api.PolarBleApi
import com.polar.sdk.api.PolarBleApiCallback
import com.polar.sdk.api.PolarBleApiDefaultImpl.defaultImplementation
import com.polar.sdk.api.model.PolarDeviceInfo
import com.polar.sdk.api.model.PolarHrData
import io.reactivex.rxjava3.disposables.Disposable
import java.util.*

enum class PolarEvent {
    DEVICE_FOUND,
    DEVICE_CONNECTING,
    DEVICE_CONNECTED,
    DEVICE_DISCONNECTED,
    BATTERY_LEVEL_RECEIVED,
    DIS_INFORMATION_RECEIVED,
    BLE_POWER_ON,
    BLE_POWER_OFF,
    HR_FEATURE_READY,
    FTP_FEATURE_READY,
    STREAMING_FEATURES_READY,
    HR_VALUE_RECEIVED
}

class PolarBleModule(private  val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext), LifecycleEventListener {
    private lateinit var api: PolarBleApi
    private var autoConnectDisposable: Disposable? = null
    private var searchDisposable: Disposable? = null

    override fun getName(): String {
        return "PolarBle"
    }

    override fun getConstants(): MutableMap<String, Any> {
        return (super.getConstants() ?: mutableMapOf()).apply {
            PolarEvent.values().forEach {
                put(it.name, it.name)
            }
            put("HR", PolarBleApi.FEATURE_HR)
            put("DEVICE_INFO", PolarBleApi.FEATURE_DEVICE_INFO)
            put("BATTERY_STATUS", PolarBleApi.FEATURE_BATTERY_INFO)
            put("POLAR_SENSOR_STREAMING", PolarBleApi.FEATURE_POLAR_SENSOR_STREAMING)
            put("POLAR_FILE_TRANSFER", PolarBleApi.FEATURE_POLAR_FILE_TRANSFER)
            put("ALL_FEATURES", PolarBleApi.ALL_FEATURES)
        }
    }

    override fun onHostResume() {
        api.foregroundEntered()
    }

    override fun onHostPause() {}

    override fun onHostDestroy() {
        api.shutDown()
    }

    @ReactMethod
    fun configure(features: Int, promise: Promise) {
        runCatching {
            api = defaultImplementation(reactContext, features).apply {
                setApiCallback(object : PolarBleApiCallback() {
                    override fun blePowerStateChanged(powered: Boolean) {
                        super.blePowerStateChanged(powered)
                        sendEvent(if (powered) PolarEvent.BLE_POWER_ON.name else PolarEvent.BLE_POWER_OFF.name)
                    }

                    override fun deviceConnected(polarDeviceInfo: PolarDeviceInfo) {
                        super.deviceConnected(polarDeviceInfo)
                        sendEvent(PolarEvent.DEVICE_CONNECTED.name, polarDeviceInfo.createMap())
                    }

                    override fun deviceConnecting(polarDeviceInfo: PolarDeviceInfo) {
                        super.deviceConnecting(polarDeviceInfo)
                        sendEvent(PolarEvent.DEVICE_CONNECTING.name, polarDeviceInfo.createMap())
                    }

                    override fun deviceDisconnected(polarDeviceInfo: PolarDeviceInfo) {
                        super.deviceDisconnected(polarDeviceInfo)
                        sendEvent(PolarEvent.DEVICE_DISCONNECTED.name, polarDeviceInfo.createMap())
                    }

                    override fun streamingFeaturesReady(identifier: String, features: MutableSet<PolarBleApi.DeviceStreamingFeature>) {
                        super.streamingFeaturesReady(identifier, features)
                        sendEvent(PolarEvent.STREAMING_FEATURES_READY.name, Arguments.createMap().apply {
                            putString("identifier", identifier)
                            putArray("features", Arguments.fromArray(features.map {
                                it.ordinal
                            }))
                        })
                    }

                    override fun hrFeatureReady(identifier: String) {
                        super.hrFeatureReady(identifier)
                        sendEvent(PolarEvent.HR_FEATURE_READY.name, identifier)
                    }

                    override fun disInformationReceived(identifier: String, uuid: UUID, value: String) {
                        super.disInformationReceived(identifier, uuid, value)
                        sendEvent(PolarEvent.DIS_INFORMATION_RECEIVED.name, Arguments.createMap().apply {
                            putString("identifier", identifier)
                            putString("uuid", uuid.toString())
                            putString("value", value)
                        })
                    }

                    override fun batteryLevelReceived(identifier: String, level: Int) {
                        super.batteryLevelReceived(identifier, level)
                        sendEvent(PolarEvent.BATTERY_LEVEL_RECEIVED.name, Arguments.createMap().apply {
                            putString("identifier", identifier)
                            putInt("level", level)
                        })
                    }

                    override fun hrNotificationReceived(identifier: String, data: PolarHrData) {
                        super.hrNotificationReceived(identifier, data)
                        sendEvent(PolarEvent.HR_VALUE_RECEIVED.name, Arguments.createMap().apply {
                            putString("identifier", identifier)
                            putMap("data", Arguments.createMap().apply {
                                putInt("hr", data.hr)
                                putArray("rrs", Arguments.fromList(data.rrs))
                                putArray("rrsMs", Arguments.fromList(data.rrsMs))
                                putBoolean("contactStatus", data.contactStatus)
                                putBoolean("contactStatusSupported", data.contactStatusSupported)
                                putBoolean("rrAvailable", data.rrAvailable)
                            })
                        })
                    }

                    override fun polarFtpFeatureReady(identifier: String) {
                        super.polarFtpFeatureReady(identifier)
                        sendEvent(PolarEvent.FTP_FEATURE_READY.name, identifier)
                    }
                })
            }
        }.onSuccess(promise::resolve).onFailure(promise::reject)
    }

    @ReactMethod
    fun connectToDevice(identifier: String, promise: Promise) {
        runCatching {
            api.connectToDevice(identifier)
        }.onSuccess(promise::resolve).onFailure(promise::reject)
    }

    @ReactMethod
    fun disconnectFromDevice(identifier: String, promise: Promise) {
        runCatching {
            api.disconnectFromDevice(identifier)
        }.onSuccess(promise::resolve).onFailure(promise::reject)
    }

    @ReactMethod
    fun searchForDevice(promise: Promise) {
        runCatching {
            searchDisposable?.dispose()
            searchDisposable = api.searchForDevice().subscribe({ data ->
                sendEvent(PolarEvent.DEVICE_FOUND.name, data.createMap())
            }, promise::reject, {
                promise.resolve(null)
            })
        }.onFailure(promise::reject)
    }

    @ReactMethod
    fun startAutoConnectToDevice(rssi: Int, service: String?, polarDevice: String?, promise: Promise) {
        runCatching {
            autoConnectDisposable?.dispose()
            autoConnectDisposable = api.autoConnectToDevice(rssi, service, polarDevice).subscribe({
                promise.resolve(null)
            }, promise::reject)
        }.onFailure(promise::reject)
    }

    private fun sendEvent(eventName: String, params: ReadableMap) = sendEvent(eventName, params as Any)

    private fun sendEvent(eventName: String, params: ReadableArray) = sendEvent(eventName, params as Any)

    private fun sendEvent(eventName: String) = sendEvent(eventName, null as Any?)

    private fun sendEvent(eventName: String, value: Any?) {
        reactContext.getJSModule(RCTDeviceEventEmitter::class.java).emit(eventName, value)
    }

    private fun PolarDeviceInfo.createMap(): WritableMap = Arguments.createMap().apply {
        putString("deviceId", deviceId)
        putString("address", address)
        putInt("rssi", rssi)
        putString("name", name)
        putBoolean("isConnectable", isConnectable)
    }
}
