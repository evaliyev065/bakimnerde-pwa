# Bakımnerde PWA 2.0

Saha personeli rolünü test ekiplerine APK beklemeden sunan, yönetim paneliyle aynı REST API üzerinden çalışan bağımsız web uygulamasıdır. Android, iOS/iPadOS ve Huawei cihazlarda modern tarayıcı üzerinden çalışır ve desteklenen tarayıcılarda ana ekrana kurulabilir.

`bakimnerde-field-app` native Android uygulaması olarak kalır. Bu depo Capacitor, Gradle, Android SDK veya JDK gerektirmez.

## Yerel ağda çalıştırma

1. Bilgisayarın LAN IP adresini bulun: `ipconfig`.
2. REST API `.env` dosyasında `API_HOST=0.0.0.0` yapın ve `CORS_ORIGIN` listesine `http://BILGISAYAR_IP:4175` ekleyin.
3. Bu depoda `.env` oluşturup `VITE_API_URL=http://BILGISAYAR_IP:3000` yazın.
4. `npm.cmd install` ve ardından `npm.cmd run dev` çalıştırın.
5. Telefonu aynı Wi-Fi ağına bağlayıp `http://BILGISAYAR_IP:4175` adresini açın.

Kamera, bildirim, service worker ve ana ekrana kurulum özelliklerinin gerçek cihazda eksiksiz çalışması için uygulamayı production ortamında HTTPS ile yayınlayın. Yerel HTTP kullanımı yalnız hızlı ekran/API testi içindir.

## Cihaza kurma

- Android / Huawei: Chrome, Edge veya Huawei Browser menüsünden “Ana ekrana ekle” ya da “Uygulamayı yükle”.
- iPhone / iPad: Safari’de Paylaş menüsünden “Ana Ekrana Ekle”.
- Masaüstü: Tarayıcının adres çubuğundaki yükleme simgesi.

İlk çevrimiçi giriş ve görev yenilemesinden sonra görevler IndexedDB ve yerel depoda saklanır. REST API kapalıyken bu kayıtlar açılır; form, fotoğraf, sohbet, bildirim ve ek tedarik yazımları outbox’a alınır ve bağlantı gelince sırayla gönderilir.

## Kalite kapısı

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```
