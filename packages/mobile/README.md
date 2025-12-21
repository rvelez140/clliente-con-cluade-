# Gemini Mail Mobile

Aplicación móvil para Android e iOS construida con React Native.

## Requisitos

- Node.js 20+
- npm
- React Native CLI
- Android Studio (para Android)
- Xcode (para iOS, solo en macOS)

## Instalación de dependencias

```bash
npm install

# Para iOS
cd ios && pod install && cd ..
```

## Desarrollo

### Android
```bash
npm run android
```

### iOS
```bash
npm run ios
```

## Construcción

### Android

1. Generar keystore (primera vez):
```bash
cd android/app
keytool -genkeypair -v -storetype PKCS12 -keystore gemini-mail.keystore -alias gemini-mail -keyalg RSA -keysize 2048 -validity 10000
```

2. Configurar `android/gradle.properties`:
```
MYAPP_RELEASE_STORE_FILE=gemini-mail.keystore
MYAPP_RELEASE_KEY_ALIAS=gemini-mail
MYAPP_RELEASE_STORE_PASSWORD=****
MYAPP_RELEASE_KEY_PASSWORD=****
```

3. Construir APK:
```bash
npm run build:android
```

El APK se generará en `android/app/build/outputs/apk/release/app-release.apk`

### iOS

1. Abrir el proyecto en Xcode:
```bash
open ios/GeminiMail.xcworkspace
```

2. Configurar el signing en Xcode
3. Product → Archive
4. Distribuir a App Store o exportar IPA

## Instalación

### Android

1. Instalar APK directamente:
```bash
adb install app-release.apk
```

2. O distribuir vía Google Play Store

### iOS

1. Distribuir vía TestFlight
2. O publicar en App Store

## Características

- Cliente de correo completo para móviles
- Soporte para Gmail, Outlook y servidores personalizados
- Integración con Gemini AI
- Notificaciones push (próximamente)
- Sincronización en tiempo real
- Temas personalizables
