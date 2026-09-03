import { Alert, Platform } from 'react-native';

// react-native-web's Alert.alert() is a complete no-op - see
// node_modules/react-native-web/dist/exports/Alert/index.js ("class Alert {
// static alert() {} }"). No dialog ever appears and no button callback ever
// fires on web, so every Alert.alert() call in this app silently did nothing
// when tested in a browser. These two helpers give a real equivalent on both
// web (window.alert/window.confirm) and native (the real Alert.alert).

export function notify(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}

export function confirm(title: string, message: string, confirmLabel = 'OK'): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}
