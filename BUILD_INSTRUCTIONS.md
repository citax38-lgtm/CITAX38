# Istruzioni per la Compilazione dell'APK (Android)

Questa guida ti spiegherà come compilare l'applicazione web in un file APK che può essere installato su dispositivi Android.

## Prerequisiti

Prima di iniziare, assicurati di avere installato sul tuo computer:

1.  **Node.js e npm**: Per gestire le dipendenze e lanciare gli script di compilazione. [Scarica Node.js](https://nodejs.org/).
2.  **Android Studio**: Lo strumento ufficiale di Google per lo sviluppo Android. È necessario per compilare il progetto nativo e generare l'APK. [Scarica Android Studio](https://developer.android.com/studio).
    *   Durante l'installazione, assicurati di installare anche l'**Android SDK**.

## Procedura di Compilazione

Segui questi passaggi dal terminale del tuo computer, nella directory principale del progetto.

### 1. Installa le Dipendenze

Questo comando leggerà il file `package.json` e scaricherà tutte le dipendenze necessarie, inclusi React e Capacitor.

```bash
npm install
```

### 2. Aggiungi la Piattaforma Android

Questo comando crea la directory `android/` che contiene il progetto Android nativo, pronto per essere gestito da Capacitor.

```bash
npx cap add android
```

### 3. Sincronizza l'App Web con il Progetto Android

Questo è il comando principale che esegue due azioni:
1.  Compila la tua applicazione web React nella cartella `dist/`.
2.  Copia i file compilati nel progetto Android nativo.

Esegui questo comando ogni volta che fai delle modifiche all'applicazione web.

```bash
npm run sync:android
```

### 4. Apri il Progetto in Android Studio

Questo comando aprirà automaticamente Android Studio con il progetto Android caricato.

```bash
npm run open:android
```

### 5. Genera l'APK in Android Studio

Una volta che il progetto è aperto in Android Studio, attendi che finisca di sincronizzare e indicizzare i file (potrebbe richiedere qualche minuto la prima volta).

Poi, per generare l'APK:

1.  Vai al menu in alto e seleziona **Build**.
2.  Scegli **Build Bundle(s) / APK(s)**.
3.  Clicca su **Build APK(s)**.

Android Studio inizierà il processo di compilazione. Al termine, una notifica apparirà in basso a destra. Clicca su **"locate"** per trovare il file `app-debug.apk` generato.

Questo file APK può essere trasferito e installato su qualsiasi dispositivo Android per il testing.
