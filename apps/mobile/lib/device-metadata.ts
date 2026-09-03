import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Application from 'expo-application';

// Subject V.6 requires backend logs to record Platform/Device model/App version
// per mobile action. The backend has no logging middleware yet (out of scope -
// no backend edits in this pass), so we attach the data as headers on every
// request now. Whenever backend logging is added it can read these for free.
const deviceHeaders: Record<string, string> = {
  'X-Client-Platform': Platform.OS,
  'X-Client-Device-Model': Device.modelName ?? 'unknown',
  'X-Client-OS-Version': `${Device.osName ?? ''} ${Device.osVersion ?? ''}`.trim() || 'unknown',
  'X-Client-App-Version': Application.nativeApplicationVersion ?? 'dev',
  'X-Client-Build-Number': Application.nativeBuildVersion ?? 'dev',
};

export function getDeviceHeaders(): Record<string, string> {
  return deviceHeaders;
}
