# KAPSAMLI TEST PLANI — Articless (NASA HACKATHON)

**Proje:** Articless — Akademik Makale Arama, Özetleme ve Sunum Platformu  
**Tarih:** 24 Mayıs 2026  
**Test Mühendisi:** AI Test Engineer  
**Ortam Bilgisi:**
- Backend: Node.js + Express 5 + TypeScript
- Frontend: React 19 + Vite + TypeScript
- Veritabanı: SQLite (better-sqlite3)
- Harici Servisler: PubMed E-utilities API, Google Gemini AI, msedge-tts
- Çalışma Portu: Backend `localhost:5000`, Frontend `localhost:5173` (varsayılan Vite)

---

## İÇİNDEKİLER

1. [API TEST SENARYOLARI](#1-api-test-senaryolari)
   - 1.1 GET /api/trends
   - 1.2 GET /api/search?q=...
   - 1.3 POST /api/article/:id/process
   - 1.4 POST /api/article/:id/presentation
   - 1.5 POST /api/ai-writer/chat
   - 1.6 POST /api/presentation/chat
2. [FRONTEND TEST AKIŞLARI](#2-frontend-test-akışları)
   - 2.1 Arama Akışı
   - 2.2 Sunum Editörü
   - 2.3 Raf Yönetimi
   - 2.4 AI Writer (AI Yazar)
3. [GÜVENLİK TESTLERİ](#3-güvenlik-testleri)
4. [PERFORMANS TESTLERİ](#4-performans-testleri)
5. [KOD İNCELEME BULGULARI (BUG/İYİLEŞTİRME)](#5-kod-inceleme-bulguları)

---

## 1. API TEST SENARYOLARI

---

### 1.1 GET /api/trends

**Açıklama:** Son 7 gündeki en popüler arama sorgularını getirir.

| # | Senaryo | Adımlar | Beklenen Sonuç | Edge Case'ler |
|---|---------|---------|----------------|---------------|
| 1.1.1 | **Başarılı trend sorgusu** | 1. Veritabanında kayıtlı arama sorguları olsun<br>2. `GET /api/trends` isteği gönder | • HTTP 200 döner<br>• JSON array döner: `[{ query: string, count: number }]`<br>• Maksimum 10 kayıt döner<br>• count azalan sırada sıralanır | • Veritabanı boşsa boş array `[]` döner<br>• 7 günden eski kayıtlar dahil edilmez |
| 1.1.2 | **Veritabanı hatası** | 1. Veritabanı dosyasını sil/boz<br>2. Trend isteği gönder | HTTP 500 döner: `{ error: 'Failed to fetch trends' }` | Veritabanı bağlantı hatası loglanmalı |
| 1.1.3 | **Limit parametresi override** | Kodda sabit `limit=10` kullanılır (query param yok) | Sadece 10 kayıt döner | — |
| 1.1.4 | **SQLite bağlantı zaman aşımı** | Veritabanı dosyası kilitliyse | HTTP 500 döner, hata loglanır | — |

---

### 1.2 GET /api/search?q=...

**Açıklama:** PubMed'de makale araması yapar, sonuçları döndürür ve sorguyu trending tablosuna ekler.

| # | Senaryo | Adımlar | Beklenen Sonuç | Edge Case'ler |
|---|---------|---------|----------------|---------------|
| 1.2.1 | **Başarılı arama** | `GET /api/search?q=cancer+therapy` | • HTTP 200<br>• JSON array döner: `[{ id, title, source, pubDate, authors }]`<br>• Her makale PubMed ID içerir<br>• Sorgu `searches` tablosuna eklenir | |
| 1.2.2 | **Eksik q parametresi** | `GET /api/search` (q olmadan) | HTTP 400: `{ error: 'Query parameter "q" is required' }` | |
| 1.2.3 | **Boş q parametresi** | `GET /api/search?q=` | HTTP 400: `{ error: 'Query parameter "q" is required' }` (Çünkü `!q` true olur) | |
| 1.2.4 | **Offset parametresi** | `GET /api/search?q=cancer&offset=10` | • PubMed'de 11. kayıttan itibaren 10 kayıt getirir<br>• `parsedOffset=10` olur | • `offset=abc` gönderilirse `parseInt` NaN → `parsedOffset=0` olur (beklenmeyen davranış) |
| 1.2.5 | **Negatif offset** | `GET /api/search?q=cancer&offset=-5` | `parseInt('-5')` → -5, PubMed API'ye negatif retstart gönderilir (PubMed kendi davranışına göre yanıt verir) | • PubMed API negatif retstart'ı 0 olarak yorumlayabilir<br>• **Geliştirme:** Negatif offset kontrolü eklenmeli |
| 1.2.6 | **PubMed API hatası** | PubMed servisi çevrimdışı | HTTP 500: `{ error: 'Failed to search articles' }` | • Sorgu trending'a eklenmez!<br>• Hata mesajı PubMed hatasını maskelemiş |
| 1.2.7 | **Özel karakterli sorgu** | `GET /api/search?q=<script>alert('xss')</script>` | • URL encode edilmiş şekilde PubMed'e iletilir<br>• PubMed kendi validation'ını yapar<br>• Frontend'de encodeURIComponent kullanılır | |
| 1.2.8 | **Çok uzun sorgu** | 5000+ karakterlik q parametresi | PubMed API muhtemelen hata döner → backend 500 hatası | • PubMed URL limiti kontrol edilmeli |
| 1.2.9 | **Timeout** | PubMed yavaş yanıt verirse | Axios timeout ayarı yok, istek sonsuza kadar bekleyebilir | • **Geliştirme:** axios timeout eklenmeli (örn. 15sn) |
| 1.2.10 | **Concurrent istekler (race condition)** | Aynı sorguya eşzamanlı 2 istek | Her ikisi de `addSearchQuery` çağırır → 2 kayıt eklenir (normal davranış) | |

---

### 1.3 POST /api/article/:id/process

**Açıklama:** Bir makaleyi işler: özetini çıkarır, seslendirir.

| # | Senaryo | Adımlar | Beklenen Sonuç | Edge Case'ler |
|---|---------|---------|----------------|---------------|
| 1.3.1 | **Başarılı işleme** | `POST /api/article/12345678/process` | • HTTP 200<br>• `{ originalAbstract, summary, audioUrl }`<br>• `audioUrl` `/audio/<hash>.mp3` formatında<br>• Ses dosyası `data/audio/` dizininde oluşur | |
| 1.3.2 | **Geçersiz PMID** | `POST /api/article/99999999/process` (var olmayan ID) | • PubMed `efetch` boş/bulunamadı döner<br>• Backend `abstract.trim().length === 0` kontrolü → HTTP 404: `{ error: 'No abstract available for this article.' }` | |
| 1.3.3 | **Özel karakterli ID** | `POST /api/article/%00/process` (null byte) | • Express params ile gelir, PubMed'e iletilir<br>• PubMed geçersiz ID hatası döner → 500 | • **Güvenlik:** Path traversal riski yok (PubMed API'ye gidiyor, dosya sistemine değil) |
| 1.3.4 | **Gemini API hatası** | Özetleme sırasında Gemini hatası | HTTP 500: `{ error: 'Failed to summarize article with Gemini.' }` | Ses dosyası oluşturulmaz, kısmi işlem olmaz |
| 1.3.5 | **TTS (Text-to-Speech) hatası** | Özet başarılı, seslendirme başarısız | • TTS `generateAudio` içinde catch bloğu var<br>• Promise reject → catch'e düşer<br>• HTTP 500: `{ error: error.message || 'Failed to process article' }` | |
| 1.3.6 | **API key yok** | `.env` dosyasında GEMINI_API_KEY yok/placeholder | • Gemini servisi hata fırlatır<br>• `throw new Error('GEMINI_API_KEY is not configured...')`<br>• HTTP 500 döner | |
| 1.3.7 | **Çok uzun abstract** | PubMed abstract 10.000+ kelime | Gemini token limitine takılabilir → 500 hatası | • Token limit kontrolü yok |
| 1.3.8 | **TTS kullanılamaz durumda** | msedge-tts servisi bağlantı hatası | Promise reject → HTTP 500 | |
| 1.3.9 | **Ses dosyası önbelleği** | Aynı metinle tekrar işleme | • MD5 hash aynı olur<br>• `fs.existsSync` true döner → önbellekten döner<br>• Yeni ses dosyası oluşturulmaz | |

---

### 1.4 POST /api/article/:id/presentation

**Açıklama:** Bir makale için slaytlar oluşturur, her slayda ses ekler.

| # | Senaryo | Adımlar | Beklenen Sonuç | Edge Case'ler |
|---|---------|---------|----------------|---------------|
| 1.4.1 | **Başarılı sunum oluşturma** | `POST /api/article/12345678/presentation` | • HTTP 200<br>• `{ originalAbstract, slides: [{ text, audioUrl }] }`<br>• Her slayt için ayrı ses dosyası<br>• Tüm slaytlar paralel oluşturulur (`Promise.all`) | |
| 1.4.2 | **Geçersiz PMID** | `POST /api/article/99999999/presentation` | HTTP 404: `{ error: 'No abstract available for this article.' }` | |
| 1.4.3 | **Gemini JSON ayrıştırma hatası** | Gemini geçersiz JSON dönerse | • `JSON.parse(resultText)` hata fırlatır<br>• Catch bloğu: `throw new Error('Failed to generate presentation slides with Gemini.')`<br>• HTTP 500 | • Gemini bazen markdown wrappers ile JSON döner (kod bunu temizlemeye çalışır ama başarısız olabilir) |
| 1.4.4 | **Slaytlardan biri için TTS hatası** | Slaytlardan biri seslendirilemezse | • `Promise.all` tek bir hata → tüm Promise reddedilir<br>• Tüm işlem başarısız olur<br>• HTTP 500 | • **Geliştirme:** `Promise.allSettled` kullanılmalı, hatalı slayt atlanmalı |
| 1.4.5 | **Boş slayt listesi** | Gemini boş array `[]` dönerse | `slides: []` olarak döner | Frontend'de boş sunum gösterilir |
| 1.4.6 | **Multiple concurrent istekler** | Aynı makale için 10 eşzamanlı istek | Her istek ayrı ayrı çalışır, aynı ses dosyaları önbellekten döner | |

---

### 1.5 POST /api/ai-writer/chat

**Açıklama:** AI Yazar asistanı ile sohbet.

| # | Senaryo | Adımlar | Beklenen Sonuç | Edge Case'ler |
|---|---------|---------|----------------|---------------|
| 1.5.1 | **Başarılı sohbet** | `POST /api/ai-writer/chat` body: `{ messages: [{ role: 'user', parts: [{ text: 'Merhaba' }] }] }` | • HTTP 200<br>• `{ reply: '...' }`<br>• Role prompt dosyası varsa yüklenir, yoksa varsayılan kullanılır | |
| 1.5.2 | **Eksik messages alanı** | `POST /api/ai-writer/chat` body: `{}` | HTTP 400: `{ error: 'Messages array is required' }` | |
| 1.5.3 | **messages array değil** | Body: `{ messages: 'string' }` | HTTP 400: `{ error: 'Messages array is required' }` (`!Array.isArray(messages)` true) | |
| 1.5.4 | **Boş messages array** | Body: `{ messages: [] }` | Gemini API'ye boş içerik gider, hata dönebilir → HTTP 500 | • Validasyon yok, boş array kabul edilir |
| 1.5.5 | **Role prompt dosyası bulunamazsa** | `data/ai_writer_role.txt` yok | `fs.existsSync` false → varsayılan `'Sen akademik bir asistansın.'` kullanılır | |
| 1.5.6 | **Role prompt dosyası çok büyükse** | 10MB'lık role prompt dosyası | `fs.readFileSync` belleğe yükler, performans sorunu | • Stream kullanılmalı veya boyut sınırı eklenmeli |
| 1.5.7 | **Çok uzun mesaj geçmişi** | 100+ mesajlık dizi | • Gemini token limitine takılabilir<br>• İstek zaman aşımına uğrayabilir | • Mesaj geçmişi budanmalı |
| 1.5.8 | **Gemini API hatası** | Gemini servis hatası | HTTP 500: `{ error: 'Failed to generate chat response.' }` | |

---

### 1.6 POST /api/presentation/chat

**Açıklama:** Sunum asistanı ile sohbet. Çoğu senaryo 1.5 ile aynıdır.

| # | Senaryo | Adımlar | Beklenen Sonuç | Edge Case'ler |
|---|---------|---------|----------------|---------------|
| 1.6.1 | **Başarılı sohbet** | `POST /api/presentation/chat` body: `{ messages: [...] }` | HTTP 200: `{ reply: '...' }` | Role prompt sabit tanımlı, dosyadan okunmaz |
| 1.6.2 | **Eksik/geçersiz messages** | Body: `{}` veya `{ messages: 'xyz' }` | HTTP 400: `{ error: 'Messages array is required' }` | |
| 1.6.3 | **Markdown yanıtı** | Asistan markdown formatında yanıt verir | `reply` alanında markdown metni döner | Frontend markdown render etmeli (şu an raw metin gösteriyor) |
| 1.6.4 | **Sunum bağlamı eksik** | Slayt bilgisi olmadan "slayt düzenle" isteği | Asistan sadece metin önerisi yapabilir, slaytlara direkt müdahele edemez | AI asistanı ile slayt düzenleme entegrasyonu yok (manuel) |

---

## 2. FRONTEND TEST AKIŞLARI

---

### 2.1 Arama Akışı (Search.tsx)

| # | Senaryo | Adımlar | Beklenen Sonuç | Edge Case'ler |
|---|---------|---------|----------------|---------------|
| 2.1.1 | **Başarılı arama** | 1. Arama sayfasına git `/search?q=cancer`<br>2. Sonuçlar yüklenene kadar bekle | • Loader gösterilir (`Loader2` animasyonu)<br>• Sonuçlar grid halinde listelenir<br>• Her kartta: başlık, kaynak, tarih, yazarlar, PMID<br>• "Rafa Ekle" ve "Özetle & Sun" butonları görünür | |
| 2.1.2 | **Arama sorgusu boş** | `/search` (q parametresi yok) | Sayfa boş gösterilir, hata mesajı veya yükleme yok | • `if (!query) return;` → useEffect çalışmaz, hiçbir şey yapılmaz<br>• Kullanıcıya anlamlı bir mesaj gösterilmeli |
| 2.1.3 | **API hatası** | Backend kapalıyken arama yap | Hata mesajı: `"Makaleler aranırken bir hata oluştu. (Lütfen biraz bekleyip tekrar deneyin)"` | |
| 2.1.4 | **İstek iptali (abort)** | 1. `q=cancer` ile arama yap<br>2. Hemen `q=diabetes` ile değiştir | • İlk istek AbortController ile iptal edilir<br>• `axios.isCancel(err)` true → hata gösterilmez<br>• Yeni arama başlar | |
| 2.1.5 | **Sonuç bulunamadı** | `q=zzzzzrandomnonexistent` | Mesaj: `"Sonuç bulunamadı."` | |
| 2.1.6 | **Daha fazla yükle** | 1. Arama yap (10+ sonuç olsun)<br>2. "Daha Fazla Yükle" butonuna tıkla | • Yeni 10 sonuç eklenir<br>• Buton disabled olur ve loader gösterilir<br>• Offset artar<br>• 10'dan az sonuç gelirse `hasMore=false` olur, buton kaybolur | |
| 2.1.7 | **Hızlı çift tıklama "Daha Fazla Yükle"** | Butona hızlıca 2 kere tıkla | • `loadingMore` true olduğu için 2. çağrı yapılmaz<br>• Race condition önlenmiş | |
| 2.1.8 | **Makale kartına tıklama** | "Özetle & Sun" butonuna tıkla | `/presentation/<id>?title=<encoded-title>` sayfasına yönlendirilir | |
| 2.1.9 | **Uzun başlık** | Başlık çok uzunsa | `line-clamp-2` CSS sınıfı ile 2 satırdan sonra kesilir | |
| 2.1.10 | **Çok sayıda yazar** | 10+ yazar varsa | `authors.slice(0, 3).join(', ') + (authors.length > 3 ? ' et al.' : '')` ile ilk 3 yazar + "et al." gösterilir | |

---

### 2.2 Sunum Editörü (Presentation.tsx)

| # | Senaryo | Adımlar | Beklenen Sonuç | Edge Case'ler |
|---|---------|---------|----------------|---------------|
| 2.2.1 | **Başarılı sunum yükleme** | `/presentation/12345678?title=Test` | • `loadingInitial=true` → loader gösterilir<br>• API'den slaytlar yüklenir<br>• Başlık slaytı eklenir<br>• Sağ panelde AI asistan mesajı gelir | |
| 2.2.2 | **API hatası** | Backend kapalı | Fallback mesajı: `"İçerik yüklenemedi. AI asistanı kullanarak yeni slaytlar oluşturabilirsiniz."` | |
| 2.2.3 | **Slayt gezinme** | Sol-sağ ok butonları/thumbnail tıklama | • `currentSlideIndex` güncellenir<br>• Canvas ve thumbnail vurgusu değişir<br>• Slayt sayacı güncellenir (`Slayt X / Y`) | |
| 2.2.4 | **Metin elementi ekleme** | "Metin" butonuna tıkla | • Yeni metin elementi eklenir (`{ type: 'text', content: 'Yeni Metin' }`)<br>• Otomatik seçili gelir<br>• Toolbar'da boyut/yön tuşları görünür | |
| 2.2.5 | **Görsel elementi ekleme** | "Görsel" butonuna tıkla → URL gir | • `prompt()` ile URL alınır<br>• URL boşsa işlem iptal<br>• Yeni image elementi eklenir | • `prompt()` kullanıcı deneyimi zayıf<br>• Geçersiz URL hatası yok (img src broken gösterir) |
| 2.2.6 | **Element silme** | 1. Bir elementi seç<br>2. Çöp kutusu butonuna tıkla | • Element silinir<br>• `selectedElementId` null olur<br>• Toolbar'daki element düzenleme butonları kaybolur | |
| 2.2.7 | **Element taşıma** | Yön oklarına tıkla (↑ ↓ ← →) | • `top` veya `left` CSS değeri %5 artar/azalır<br>• Element görsel olarak hareket eder | • `parseFloat` NaN olursa → `0 + 5 = 5%` olur<br>• Taşma kontrolü yok (element canvas dışına çıkabilir) |
| 2.2.8 | **Yazı boyutu değiştirme** | Boyut input'una değer gir | `fontSize` güncellenir | |
| 2.2.9 | **Yeni slayt ekleme** | "+" butonuna tıkla | • Boş slayt eklenir<br>• `currentSlideIndex` son slayta ayarlanır<br>• Thumbnail listesinde görünür | |
| 2.2.10 | **PPTX dışa aktarma** | "PPTX İndir" butonuna tıkla | • `pptxgenjs` ile sunum oluşturulur<br>• `Articless_<id>.pptx` dosyası indirilir<br>• Her slayt için arka plan `#1a1a24` | • Text elementler için `w: '80%'` sabit, özelleştirilebilir width yok<br>• Image elementler için `w: '40%'` sabit |
| 2.2.11 | **AI asistan mesaj gönderme** | 1. Input alanına mesaj yaz<br>2. Enter'a bas veya Send butonuna tıkla | • Kullanıcı mesajı eklenir<br>• Input temizlenir<br>• "AI Düşünüyor..." loader görünür<br>• AI yanıtı gelince mesaj olarak eklenir | • Shift+Enter yeni satır, Enter gönderir |
| 2.2.12 | **AI asistan boş mesaj** | Input boşken Send'e tıkla | `!input.trim()` → buton disabled, hiçbir şey olmaz | |
| 2.2.13 | **AI asistan hatası** | API hata dönerse | Mesaj: `{ role: 'model', text: 'Hata oluştu.' }` eklenir | Hata mesajı çok genel, spesifik hata gizlenmiş |
| 2.2.14 | **İlk mesajın filtrelenmesi** | Mesaj gönderirken ilk mesaj (model karşılama mesajı) filtrelenir | `if (filteredMessages[0].role === 'model') filteredMessages = filteredMessages.slice(1)` | • Referans sorunu: `let filteredMessages = messages;` ile referans kopyalanır, slice yeni dizi oluşturur ama orijinal `messages`'a dokunulmaz — sorun yok |
| 2.2.15 | **Metin düzenleme (textarea)** | Slayttaki metne tıkla, içeriği değiştir | `updateElementContent` ile content güncellenir | |
| 2.2.16 | **Birden çok element seçimi** | Farklı elementlere tıkla | • Tek seçim (`selectedElementId` state)<br>• Çoklu seçim desteklenmez | |

---

### 2.3 Raf Yönetimi (useStore.ts + Search.tsx ShelfModal)

| # | Senaryo | Adımlar | Beklenen Sonuç | Edge Case'ler |
|---|---------|---------|----------------|---------------|
| 2.3.1 | **Rafa makale ekleme** | 1. Arama sonuçlarında "Rafa Ekle" butonuna tıkla<br>2. Modal açılır: hedef rafı seç | • Makale rafa eklenir<br>• Modal kapanır<br>• `addArticleToShelf` çağrılır | |
| 2.3.2 | **Yeni raf oluşturma** | 1. Modal'da input'a yeni raf adı yaz<br>2. "+" butonuna tıkla | • Yeni raf oluşur (`addShelf`)<br>• Input temizlenir<br>• Listede görünür | • `if (newShelfName.trim())` kontrolü — boşlardan korur |
| 2.3.3 | **Raf yokken modal** | Hiç raf yokken modal açılır | `"Henüz rafınız yok."` mesajı gösterilir | |
| 2.3.4 | **Aynı makaleyi tekrar ekleme** | Aynı makaleyi aynı rafa tekrar ekle | • `shelf.articles.some(a => a.id === article.id)` kontrolü<br>• Ekleme yapılmaz (duplicate prevention) | |
| 2.3.5 | **Raf silme** | (useStore'da `removeShelf` var ama UI'da buton yok) | **UI'da raf silme özelliği eksik!** | Store'da fonksiyon var ama kullanılmıyor |
| 2.3.6 | **Makale silme** | (useStore'da `removeArticleFromShelf` var ama UI'da buton yok) | **UI'da makale silme özelliği eksik!** | Store'da fonksiyon var ama kullanılmıyor |
| 2.3.7 | **State persistence** | 1. Makale ekle<br>2. Sayfayı yenile<br>3. Rafı kontrol et | • `zustand/middleware` persist ile localStorage'a kaydedilir<br>• Sayfa yenilemede raf korunur<br>• Anahtar: `articless-shelves` | |
| 2.3.8 | **LocalStorage hatası** | Tarayıcı localStorage devre dışı | Zustand persist hata fırlatabilir, store çalışmayabilir | Hata yakalama yok |

---

### 2.4 AI Writer (AI Yazar)

**Not:** Kodda `ai-writer/chat` endpoint'i backend'de tanımlıdır ancak frontend'de bu endpoint'i kullanan bir sayfa/komponent **bulunamadı**. Test edilebilmesi için frontend'de AI Writer sayfasının/komponentinin oluşturulması gerekir.

| # | Senaryo | Adımlar | Beklenen Sonuç | Edge Case'ler |
|---|---------|---------|----------------|---------------|
| 2.4.1 | **AI Writer sayfası mevcut değil** | Frontend kodunda AI Writer UI'ı yok | **Eksik özellik:** Backend'de endpoint var ama frontend'de UI yok | Test edilemez |
| 2.4.2 | **Direkt API testi** | `POST /api/ai-writer/chat` | API seviyesinde test edilebilir (bkz. bölüm 1.5) | |

---

## 3. GÜVENLİK TESTLERİ

---

### 3.1 CORS (Cross-Origin Resource Sharing)

| # | Senaryo | Adımlar | Beklenen Sonuç |
|---|---------|---------|----------------|
| 3.1.1 | **Varsayılan CORS yapılandırması** | `cors()` hiçbir opsiyon olmadan kullanılır | • Tüm origin'lere izin verir (`Access-Control-Allow-Origin: *`)<br>• Üretim ortamı için çok gevşek |
| 3.1.2 | **Farklı origin'den istek** | Farklı bir domaine sahip frontend'den API isteği | Başarılı olur (kısıtlama yok) |
| 3.1.3 | **Credentials ile istek** | `fetch(url, { credentials: 'include' })` | `Access-Control-Allow-Origin: *` ile credentials gönderilemez (tarayıcı engeller) | |
| 3.1.4 | **Öneri** | Üretimde whitelist kullanılmalı: `cors({ origin: ['http://localhost:5173', 'https://...'] })` | |

---

### 3.2 Input Validation

| # | Senaryo | Adımlar | Beklenen Sonuç | Risk |
|---|---------|---------|----------------|------|
| 3.2.1 | **NoSQL/XML injection (PubMed)** | `q=<script>...</script>` içeren sorgu | PubMed API'ye direkt iletilir, PubMed kendi validation'ını yapar | Düşük |
| 3.2.2 | **SQL injection** | Tüm DB sorguları parametrized (`?`) | **Güvenli** — `better-sqlite3` parametrik sorgu kullanır | Yok |
| 3.2.3 | **ID enjeksiyonu** | `:id` parametresine `../../etc/passwd` gibi path traversal | • Sadece PubMed API'ye iletilir<br>• Dosya sistemine erişim yok | Düşük |
| 3.2.4 | **messages array validasyonu** | `{ messages: [{ role: 'admin', parts: [{ text: '...' }] }] }` | Sadece array kontrolü yapılır, içerik validasyonu yok | Orta |
| 3.2.5 | **Request body boyut sınırı** | `express.json()` varsayılan limit: 100kb | 100kb üzeri body'ler hata döner (Express 5 varsayılan limit) | |
| 3.2.6 | **Geçersiz offset** | `offset=NaN`, `offset=-1`, `offset=1e10` | `parseInt` ile kısmi dönüşüm, NaN durumunda 0 olur | |

---

### 3.3 API Key Yönetimi

| # | Senaryo | Adımlar | Beklenen Sonuç | Risk |
|---|---------|---------|----------------|------|
| 3.3.1 | **API key .env'de** | `GEMINI_API_KEY` `.env` dosyasında | • `.env` `.gitignore`'da olmalı<br>• Sunucuda güvenli şekilde saklanmalı | |
| 3.3.2 | **Placeholder key kontrolü** | Key `'your_gemini_api_key_here'` ise | Gemini servisleri hata fırlatır, API 500 döner | İyi koruma |
| 3.3.3 | **Key exposure** | Backend hata mesajında API key sızdırmaz | Hata mesajları generic: `'Failed to...'` | İyi |
| 3.3.4 | **Çevre değişkeni yok** | `process.env.GEMINI_API_KEY` undefined | `!apiKey` true → hata fırlatılır | İyi |

---

### 3.4 Path Traversal & Dosya Güvenliği

| # | Senaryo | Adımlar | Beklenen Sonuç | Risk |
|---|---------|---------|----------------|------|
| 3.4.1 | **Statik dosya sunumu** | `/audio/../../../etc/passwd` | Express `express.static` path traversal'ı engeller | Düşük |
| 3.4.2 | **Ses dosyası isimleri** | MD5 hash ile isimlendirme | Sadece `.mp3` dosyaları, tahmin edilemez | Güvenli |
| 3.4.3 | **AI writer role prompt** | `../../data/ai_writer_role.txt` okunur | Sadece proje içi dosya, güvenli | Düşük |
| 3.4.4 | **Veritabanı dosyası** | `data/articless.db` | `.gitignore`'da olmalı, public erişime kapalı | |

---

### 3.5 Rate Limiting & DoS

| # | Senaryo | Adımlar | Beklenen Sonuç | Risk |
|---|---------|---------|----------------|------|
| 3.5.1 | **Rate limiting yok** | 1000 istek/saniye | • Tüm isteklere yanıt verilir (hizmet kalitesi düşer)<br>• PubMed API rate limitine takılınabilir<br>• Gemini API ücretli kullanım artar | **Yüksek** |
| 3.5.2 | **Öneri** | `express-rate-limit` eklenmeli | API başına dakikada maksimum istek sınırı konulmalı | |

---

## 4. PERFORMANS TESTLERİ

| # | Senaryo | Adımlar | Beklenen Sonuç |
|---|---------|---------|----------------|
| 4.1 | **Büyük arama sonuçları**  (TBD) | 1000+ makale dönen sorgu | Frontend'de render performansı ölçülmeli |
| 4.2 | **Çok slaytlı sunum** (TBD) | 50+ slaytlı sunum yükleme | Paralel TTS + render süresi ölçülmeli |
| 4.3 | **Eşzamanlı kullanıcı** (TBD) | 10+ kullanıcı aynı anda işlem yapıyor | Backend işlem süresi, SQLite locking davranışı |
| 4.4 | **Önbellek performansı** (TBD) | Aynı metinle tekrar TTS | Önbellek vuruşu süresi vs. yeni TTS süresi karşılaştırması |

---

## 5. KOD İNCELEME BULGULARI (BUG / İYİLEŞTİRME)

### BUG-01: AI Writer Frontend UI Eksik
- **Dosya:** `backend/src/index.ts` (endpoint var) / `frontend/src/` (UI yok)
- **Tanım:** Backend'de `POST /api/ai-writer/chat` endpoint'i tanımlı olmasına rağmen frontend'de AI Writer'ı kullanacak bir sayfa veya komponent bulunmamaktadır.
- **Risk:** Orta — Kullanılamayan özellik
- **Öneri:** AI Writer sayfası oluşturulmalı.

### BUG-02: Raf Silme / Makale Silme UI Butonları Eksik
- **Dosya:** `frontend/src/store/useStore.ts` (fonksiyonlar var) / UI (yok)
- **Tanım:** Store'da `removeShelf` ve `removeArticleFromShelf` fonksiyonları tanımlı olmasına rağmen frontend'de bu işlemleri yapacak buton/UI bulunmamaktadır.
- **Risk:** Düşük-Orta — Kullanıcı rafları yönetemez
- **Öneri:** Raf listesine silme butonları eklenmeli.

### BUG-03: Sunum Asistanı Referans Mutasyonu
- **Dosya:** `frontend/src/pages/Presentation.tsx` — satır 189
- **Tanım:** `let filteredMessages = messages;` ile referans kopyalanır. `slice(1)` yeni dizi oluşturur (referans problemi yok) ancak `filteredMessages` değişkenine atama yapılır. Bu çalışır ama okunabilirlik sorunu var.
- **Risk:** Düşük
- **Öneri:** `const filteredMessages = messages.slice(1);` yapılmalı.

### BUG-04: Negatif Offset Kontrolü Yok
- **Dosya:** `backend/src/index.ts` — satır 42
- **Tanım:** Offset negatif girilirse `parseInt`ile sayıya dönüşür ama negatif olduğu kontrol edilmez.
- **Risk:** Düşük — PubMed API negatif değerleri tolere edebilir
- **Öneri:** `if (parsedOffset < 0) parsedOffset = 0;` eklenmeli.

### BUG-05: Promise.all ile Tüm Slaytların Başarısız Olması
- **Dosya:** `backend/src/index.ts` — satır 97
- **Tanım:** Slaytlar `Promise.all` ile paralel oluşturulur. Bir slayt için TTS başarısız olursa tüm sunum iptal olur.
- **Risk:** Orta — Kısmi başarısızlık tüm işlemi çökertir
- **Öneri:** `Promise.allSettled` kullanılmalı, başarısız slaytlar atlanmalı.

### BUG-06: Axios Timeout Ayarı Yok
- **Dosya:** `backend/src/services/pubmed.ts`, `backend/src/services/gemini.ts`
- **Tanım:** Harici API çağrılarında timeout ayarı yok. PubMed veya Gemini yavaş yanıt verirse backend sonsuza kadar bekleyebilir.
- **Risk:** Yüksek — Kaynak tükenmesi
- **Öneri:** Her axios çağrısına `timeout: 15000` eklenmeli.

### BUG-07: Frontend'de Hardcoded API URL
- **Dosya:** `frontend/src/pages/Search.tsx` satır 97, `frontend/src/pages/Presentation.tsx` satır 50, 196
- **Tanım:** API URL'si `http://localhost:5000` olarak sabit kodlanmış. Farklı ortamlarda çalışmaz.
- **Risk:** Yüksek — Deploy edilemez
- **Öneri:** Vite ortam değişkeni `import.meta.env.VITE_API_URL` kullanılmalı.

### BUG-08: TTS Hata Yönetimi Eksik
- **Dosya:** `backend/src/services/tts.ts` — satır 24-35
- **Tanım:** Promise içinde try-catch var ama `streamObj.audioStream.pipe(writeStream)` akışı sırasında oluşan hatalar sadece `writeStream.on('error', reject)` ile yakalanır. WriteStream dışındaki hatalar (ör. TTS servis bağlantı hatası) yakalanmayabilir.
- **Risk:** Orta — Sessiz hata
- **Öneri:** `tts.toStream(text)` çağrısı try-catch dışında, stream olayları daha kapsamlı dinlenmeli.

### BUG-09: Gemini JSON Parse Güvenliği
- **Dosya:** `backend/src/services/gemini.ts` — satır 66
- **Tanım:** `JSON.parse(resultText)` başarısız olursa catch bloğu generic hata fırlatır. Gemini bazen beklenmedik formatlarda yanıt dönebilir.
- **Risk:** Orta
- **Öneri:** Daha esnek bir parse (regex ile array yakalama) veya tekrar deneme mekanizması eklenmeli.

### BUG-10: Arama Sayfasında `offset` State'in Closure Sorunu
- **Dosya:** `frontend/src/pages/Search.tsx`
- **Tanım:** `loadMore` fonksiyonunda `offset` state'i closure'da yakalanır. `setOffset(nextOffset)` asenkron olduğu için bir sonraki `loadMore` çağrısında `offset` değeri eski kalabilir.
- **Risk:** Düşük — Kullanıcı hızlı tıklamadıkça sorun olmaz
- **Öneri:** `offset` state'i yerine `useRef` veya fonksiyonel update kullanılabilir.

### BUG-11: Sunum Editöründe Görsel URL Doğrulaması Yok
- **Dosya:** `frontend/src/pages/Presentation.tsx` — satır 128
- **Tanım:** `prompt()` ile alınan URL doğrulanmaz. Geçersiz URL girilirse resim gösterilemez.
- **Risk:** Düşük
- **Öneri:** URL formatı kontrolü veya hata durumunda placeholder resim gösterilmeli.

### BUG-12: Rate Limiting Eksik
- **Tüm API'ler**
- **Tanım:** Hiçbir rate limiting mekanizması yok. DoS saldırılarına açık.
- **Risk:** Yüksek
- **Öneri:** `express-rate-limit` paketi eklenmeli.

---

## TEST ORTAMI KURULUM NOTLARI

1. **Backend bağımlılıkları:** `cd backend && npm install`
2. **Frontend bağımlılıkları:** `cd frontend && npm install`
3. **Çevre değişkenleri:** `backend/.env` dosyasına `GEMINI_API_KEY=<gerçek-anahtar>` eklenmeli
4. **Veritabanı:** Otomatik oluşur (`data/articless.db`)
5. **Ses dizini:** Otomatik oluşur (`data/audio/`)
6. **Frontend'i başlatma:** `cd frontend && npm run dev`
7. **Backend'i başlatma:** `cd backend && npm run dev`

---

## REGRESYON TEST STRATEJİSİ

Her kod değişikliğinden sonra:
1. Değişiklikten etkilenen tüm endpoint'ler test edilmeli
2. Tüm frontend sayfaları render testi
3. Store persistence testi (sayfa yenileme)
4. PubMed/Gemini/TTS entegrasyon testleri
5. Hata senaryoları (404, 500, timeout)

---

**TEST PLANI TAMAMLANDI**
