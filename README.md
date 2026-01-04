# FitPortal MVP

React, Vite, TailwindCSS ve Firebase ile geliştirilmiş, AI destekli Trainer-Üye platformu.

## Özellikler

### 🏋️‍♂️ Üyeler İçin
- **Marketplace:** Uzman eğitmenleri bul ve abone ol.
- **Active Workout UI:** Kronometre ve log tutma özellikli antrenman ekranı.
- **AI Analiz:** Antrenman sonrası otomatik performans analizi ve koç raporu.

### 👟 Eğitmenler (Trainers) İçin
- **Onboarding:** Sertifika ve uzmanlık alanı doğrulama süreci.
- **Program Stüdyosu:** AI destekli hızlı program oluşturma.
- **Öğrenci Takibi:** Öğrencilerin gelişim raporlarını detaylı inceleme.
- **Hareket Kütüphanesi:** Kendi video içeriklerini ekleme.

### 🛡️ Admin
- Eğitmen başvurularını onaylama/reddetme.

## Kurulum

1. Bağımlılıkları yükleyin:
   ```bash
   npm install
   ```

2. Firebase yapılandırmasını `.env` dosyasına ekleyin:
   ```env
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   ...
   VITE_GEMINI_API_KEY=... (AI özellikleri için)
   ```

3. Projeyi başlatın:
   ```bash
   npm run dev
   ```

## Güvenlik Notu
AI işlemleri şu an demo amaçlı client-side (frontend) yapılmaktadır. Production ortamında bu işlemlerin Firebase Functions veya güvenli bir backend servisine taşınması gerekmektedir.
