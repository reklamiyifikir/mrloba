# RC Şantiye — Instagram Story Generator

Tek komutla, sahadaki fotoğraflardan **kalitesi bozulmadan** 1080×1920 (9:16)
Instagram Hikaye paylaşımları üretir.

## Hızlı kullanım

1. RC Şantiye fotoğraflarını `stories/input/` klasörüne kopyala. Hangi
   şablonun kullanılacağını dosya adıyla belirle:

   - `*_cover.*` → büyük başlıklı **kapak** (1. hikaye)
   - `*_cta.*`   → çağrı butonlu **CTA** (son hikaye)
   - diğer hepsi → bant altyazılı **galeri** şablonu

   Örnek isimler:

   ```
   stories/input/
     01_cover.jpg
     02_alan.jpg
     03_filo.jpg
     04_yakindan.jpg
     05_cta.jpg
   ```

2. (İsteğe bağlı) Yazıları özelleştirmek için `captions.json.example`
   dosyasını `captions.json` olarak kopyala ve düzenle.

3. Bağımlılıkları kur ve üretimi başlat:

   ```bash
   npm install
   npm run stories
   ```

4. Çıktılar `stories/output/` klasöründe `.jpg` (Instagram için) ve `.png`
   (kayıpsız arşiv) olarak iki formatta hazırlanır.

## Kalite notları

- **Lanczos3** yeniden örnekleme — keskinlik kaybı minimum.
- **Akıllı kırpma** (`sharp.strategy.attention`) — iş makineleri çerçevenin
  içinde kalır, üst/alt boşluklar logo ve metin için kullanılır.
- **mozjpeg q=95, chroma 4:4:4** — sosyal medya için görsel olarak farkı
  hissedilmeyen sıkıştırma, file boyutu makul.
- **EXIF rotasyonu** otomatik düzeltilir; renk profili korunur.

## Marka

- Sarı: `#FFC400`
- Siyah: `#0E0E0E`
- Şerit deseni: 45° emniyet bandı
- Yazı tipi: Impact / system-ui (kullanıcı sisteminde mevcut)
