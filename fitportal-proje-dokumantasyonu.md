# FitPortal - Proje Dokümantasyonu

FitPortal, kişisel antrenörler (Trainer) ile üyeleri (Member) bir araya getiren, yapay zeka destekli, kapsamlı bir fitness ve koçluk yönetim platformudur. Bu doküman, projenin mevcut özelliklerini, kullanıcı akışlarını ve teknik yapısını detaylandırır.

---

## 1. Kullanıcı Rolleri ve Temel Akışlar

Sistemde üç temel kullanıcı rolü bulunmaktadır:

### A. Yönetici (Admin)
Platformun genel yönetiminden sorumludur.
*   **Trainer Onayı:** Kayıt olan eğitmenlerin başvurularını inceler, onaylar veya reddeder.
*   **Egzersiz Kütüphanesi:** Sisteme global egzersizler ekler, GIF/Video yükler, kas gruplarını tanımlar.
*   **SaaS Paketleri:** Eğitmenler için abonelik paketlerini yönetir.

### B. Eğitmen (Trainer)
Öğrencilerini yöneten ve program hazırlayan profesyonel kullanıcıdır.
*   **Öğrenci Yönetimi:** Kendisine abone olan öğrencilerin gelişimini takip eder.
*   **Program Oluşturma:** Antrenman ve beslenme şablonları oluşturur.
*   **Özelleştirme:** Global havuzdan egzersiz seçip kendi videolarını ekleyebilir.
*   **Takip ve Analiz:** Öğrencilerin antrenman loglarını, yapay zeka analizlerini ve haftalık kontrol formlarını inceler.

### C. Üye (Member/Student)
Eğitmenlerden hizmet alan son kullanıcıdır.
*   **Antrenman:** Atanan programı uygular, set/tekrar/ağırlık verilerini girer.
*   **Gelişim Takibi:** Vücut ölçülerini girer, grafiklerle gelişimini izler.
*   **İletişim:** Eğitmeniyle mesajlaşır, haftalık durum bildiriminde bulunur.

---

## 2. Modüller ve Özellikler

### 🩺 Anamnez (İlk Değerlendirme) Sistemi
*   **Amaç:** Eğitmenin öğrenciyi tanıması ve güvenli program hazırlaması.
*   **İşleyiş:** Üye ilk giriş yaptığında zorunlu bir sağlık ve hedef formu doldurur (Boy, Kilo, Sakatlıklar, Hedefler vb.).
*   **Trainer Görünümü:** Eğitmen, öğrenci detay sayfasında bu verileri "Sağlık & Hedef Profili" başlığı altında görüntüler.

### 🏋️‍♂️ Antrenman Yönetimi (Core Özellik)

#### 1. Egzersiz Kütüphanesi
*   **Global Havuz:** Admin tarafından yönetilen, herkesin erişebileceği standart hareketler.
*   **Kütüphanem:** Eğitmenin kendi listesine eklediği hareketler. Eğitmen, global hareketlere kendi YouTube/Vimeo linklerini ekleyerek özelleştirebilir.

#### 2. Program Oluşturucu (Builder)
*   **Şablon Yapısı:** Eğitmenler tekrar kullanılabilir "Antrenman" veya "Beslenme" şablonları oluşturur.
*   **Antrenman Builder:** Gün bazlı planlama (Gün 1, Gün 2...), set, tekrar, ağırlık, dinlenme ve not alanları.
*   **Beslenme Builder:** Serbest metin veya Markdown formatında beslenme planı oluşturma.

#### 3. Program Atama ve Özelleştirme (Kritik Özellik)
*   **Atama:** Eğitmen hazır bir şablonu öğrenciye atar.
*   **Kişiye Özel Düzenleme:** Atama yapıldıktan sonra, **şablon bozulmadan** sadece o öğrenciye ait program üzerinde değişiklik yapılabilir.
*   **Kural:** Bir öğrencinin aynı anda sadece 1 aktif antrenman ve 1 aktif beslenme programı olabilir. Yenisi atandığında eskisi otomatik arşivlenir.
*   **Görünüm:** Eğitmen panelinde program detayları "Accordion" (açılır/kapanır) yapı ile hızlıca görüntülenebilir.

#### 4. Aktif Antrenman Modu (Member Side)
*   **Önizleme:** Üye antrenmana başlamadan önce "Detayları İncele" butonu ile o günün hareketlerini görür.
*   **Logging:** Antrenman sırasında dahili kronometre çalışır. Her set için ağırlık ve tekrar sayıları girilir.
*   **Çok Günlü Destek:** Eğer program split (bölünmüş) ise, üye o gün yapacağı günü (Örn: Bacak Günü) seçip başlatır.

### 📊 Raporlama ve Analiz (AI Powered)
*   **Antrenman Raporu:** Antrenman bittiğinde süre, toplam hacim ve loglar kaydedilir.
*   **Yapay Zeka Analizi (Gemini):** Sistem, antrenman verilerini analiz eder ve eğitmene/üyeye "Özet", "Gelişim Alanı" ve "Öneri" içeren bir metin sunar.
*   **Rozet Sistemi (Gamification):** "İlk Antrenman", "Sabah Kuşu", "Maratoncu" gibi başarı rozetleri otomatik tanımlanır.

### 📈 Gelişim Takibi (Progress)
*   **Ölçümler:** Kilo, Bel, Göğüs, Kol, Bacak ölçüleri tarih bazlı kaydedilir.
*   **Grafikler:** `Recharts` kütüphanesi ile zaman içindeki değişim çizgi grafik olarak gösterilir.
*   **Fotoğraflar:** Form fotoğrafları (Ön, Yan, Arka) yüklenebilir.

### 📋 Haftalık Kontroller (Weekly Check-ins)
*   **Öğrenci Formu:** Üye haftalık olarak; Programa Uyum (1-10), Ruh Hali (Emoji), Güncel Kilo ve Notlarını girer.
*   **Trainer Geri Bildirimi:** Eğitmen gelen formu inceler ve sistem üzerinden geri bildirim yazar. Üyeye bildirim gider.

### 💬 İletişim (Messaging) - *Geliştirme Aşamasında*
*   Eğitmen ve üye arasında gerçek zamanlı (Real-time) mesajlaşma.
*   Firestore tabanlı chat altyapısı.

---

## 3. Teknik Altyapı

*   **Frontend:** React (Vite), Tailwind CSS 4.0.
*   **Backend (BaaS):** Firebase (Auth, Firestore, Storage).
*   **State Management:** React Context API (`AuthContext`).
*   **Yapay Zeka:** Google Gemini API.
*   **Grafikler:** Recharts.
*   **İkonlar:** Lucide React.

### Veritabanı Şeması (Özet)
*   `users`: Kullanıcı profilleri (role: 'trainer' | 'member' | 'admin').
*   `exercises`: Global ve trainer'a özel egzersiz tanımları.
*   `programs`: Eğitmenlerin oluşturduğu şablonlar.
*   `assigned_programs`: Öğrenciye kopyalanmış, özelleştirilebilir programlar.
*   `workout_reports`: Tamamlanan antrenman logları ve AI analizleri.
*   `measurements`: Vücut ölçüm kayıtları.
*   `weekly_checkins`: Haftalık kontrol formları.
*   `anamnesis_forms`: Sağlık ve hedef formları.
*   `notifications`: Uygulama içi bildirimler.

---

## 4. Yakın Gelecek Planları (Roadmap)

1.  **Chat İyileştirmeleri:** Okundu bilgisi, medya paylaşımı.
2.  **Ödeme Sistemleri:** Iyzico entegrasyonu ile SaaS paket satışı ve Marketplace yapısı.
3.  **Mobile App:** React Native ile mobil marketlere çıkış.
4.  **Storage Güvenliği:** Dosya yükleme altyapısının (Firebase Storage) iyileştirilmesi.

