# Building Android APK with EAS Build

## Prerequisites
- Expo account (sign up at https://expo.dev if you don't have one)
- Backend URL configured in `src/lib/config.ts` (already set to Railway URL)

## Steps to Build APK

### 1. Install EAS CLI (if not already installed)
```bash
npm install -g eas-cli
# OR use npx (no installation needed):
npx eas-cli --version
```

### 2. Login to Expo
```bash
cd Grimoire
npx eas-cli login
```

### 3. Configure EAS (if needed)
```bash
npx eas-cli build:configure
```

### 4. Build the APK
For a preview/test APK:
```bash
npx eas-cli build --platform android --profile preview
```

For a production APK:
```bash
npx eas-cli build --platform android --profile production
```

### 5. Wait for Build
- The build will run on Expo's servers (usually 10-15 minutes)
- You'll get a QR code and URL to track progress
- Once complete, download the APK from the Expo dashboard

### 6. Install APK
- Transfer the APK to your Android device
- Enable "Install from Unknown Sources" in Android settings
- Install and test!

## Alternative: Local Build (Requires Android Studio)
If you prefer to build locally:
```bash
npx eas-cli build --platform android --local
```

## Notes
- The APK will include the Railway backend URL from `src/lib/config.ts`
- Camera and microphone permissions are configured in `app.json`
- Make sure your Railway backend is running before testing

