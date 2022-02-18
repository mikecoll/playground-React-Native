#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE (PolarBle, NSObject)

_RCT_EXTERN_REMAP_METHOD(configure, configureWithFeatures
                         : (NSInteger)features, NO)

RCT_EXTERN_METHOD(connectToDevice
                  : (NSString *)identifier resolver
                  : (RCTPromiseResolveBlock)resolve rejecter
                  : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(disconnectFromDevice
                  : (NSString *)identifier resolver
                  : (RCTPromiseResolveBlock)resolve rejecter
                  : (RCTPromiseRejectBlock)reject)

_RCT_EXTERN_REMAP_METHOD(searchForDevice, searchForDeviceWithResolver
                         : (RCTPromiseResolveBlock)resolve rejecter
                         : (RCTPromiseRejectBlock)reject, NO)

_RCT_EXTERN_REMAP_METHOD(startAutoConnectToDevice,
                         startAutoConnectToDeviceWithRssi
                         : (NSInteger)rrsi service
                         : (NSString *)service polarDeviceType
                         : (NSString *)polarDeviceType resolver
                         : (RCTPromiseResolveBlock)resolve rejecter
                         : (RCTPromiseRejectBlock)reject, NO)

@end
