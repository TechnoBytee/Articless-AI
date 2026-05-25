# Articless AI — Proje Ozeti

> "More research, Less reading."
> NASA Hackathon 2026 Projesi

---

## Genel Bakis

Articless AI, akademik makaleleri birden fazla veritabaninda paralel olarak arayan, yapay zeka ile ozetleyen, seslendiren ve profesyonel sunumlara donusturen bir akilli akademik arama motorudur. Arastirmacilarin, ogrencilerin ve akademisyenlerin bilgiye erisimini hizlandirmayi hedefler.

---

## Temel Ozellikler

### 1. Coklu Kaynakta Paralel Arama
Artik sadece PubMed degil, toplam **7 farkli akademik veritabaninda** ayni anda arama yapabilirsiniz:

**Uluslararasi Kaynaklar:**
- **PubMed** — ABD Ulusal Tip Kutuphanesi (tibbi ve biyolojik makaleler)
- **Semantic Scholar** — AI destekli akademik arama motoru (200M+ makale)
- **OpenAlex** — Acik kaynak akademik dizin (250M+ eser)
- **arXiv** — Fizik, matematik, bilgisayar bilimleri on baski arsivi

**Turk Akademik Kaynaklar:**
- **DergiPark** — TUBITAK tarafindan yonetilen ulusal dergi portali (2000+ dergi)
- **TR Dizin** — ULAKBIM tarafindan yurutulen ulusal akademik veritabani
- **YOK Tez** — Ulusal Tez Merkezi (1M+ lisansustu tez)

Kullanici, arama yapmadan once hangi kaynaklarda arama yapacagini secerek filtreleyebilir. Tum kaynaklar secildiginde sorgu tumune paralel olarak gonderilir ve sonuclar birlestirilir.

### 2. Yapay Zeka ile Makale Ozetleme
Google Gemini AI (gemini-2.5-flash) kullanilarak:
- Uzun akademik makale ozetleri kisaca ozetlenir
- Karmasik terimler herkesin anlayacagi dile cevrilir
- Ozetler slayt formatinda yapilandirilir

### 3. Sesli Ozet (Text-to-Speech)
Microsoft Edge TTS motoru ile:
- Turkce dogal ses sentezleme (Emel sesi)
- Makale ozetleri sesli olarak dinlenebilir
- Her slayt icin ayri ses dosyasi olusturulur
- Ses dosyalari MP3 formatinda kaydedilir ve ortbellegi destegi sayesinde tekrar kullanimda hizlica yuklenir

### 4. Profesyonel Sunum Editoru
Makaleleri interaktif bir sunum editorunde slaytlara donusturun:
- **AI ile slayt olusturma:** Makale ozetinden otomatik slayt metinleri
- **Gorsel ve metin dusman:** Slaytlara gorsel URL'si ekleme, metin kutulari olusturma
- **Surukle-birak duzenleme:** Ogeleri yukari/asagi/sola/saga tasima, yazi boyutunu degistirme
- **Slayt yonetimi:** Slayt ekleme, silme, arasinda gecis
- **PPTX export:** Olusan sunumu PowerPoint formatinda indirme
- **AI Sunum Asistani:** Slayt icerigi icin sohbet tabanli yardim

### 5. Akilli Kutuphane (Raflar)
Makaleleri konularina gore raf adi verilen kategorilerde saklayin:
- **Raf olusturma:** Istediginiz isimde raflar olusturun
- **Makale ekleme/cikarma:** Makaleleri raflara ekleyip cikarin
- **Hizli dinle:** Raftaki makaleleri tek tikla sesli dinleyin
- **Sunuma donustur:** Raftaki makalelerden hizla sunum olusturun

### 6. Iliskisel 3D/2D Grafik
Makaleler ve yazarlari arasindaki iliskileri gorsellestiren interaktif graf:
- **2D ve 3D gosterim** arasinda gecis
- **Dugumler:** Makaleler (mor), Yazarlar (yesil), Raflar (mavi)
- **Baglantilar:** Makale-yazar iliski cizgileri
- Yakinaslastirma, dondurme ve kaydirma destegi

### 7. AI Makale Yazari (AI Writer)
Raftaki makaleleri referans alarak akademik makale yazmaniza yardimci olur:
- **Zengin metin editoru:** ReactQuill ile HTML tabanli duzenleme
- **Akademik asistan:** APA/Harvard referans sistemlerine uygun yazim
- **Literatur taramasi:** Raftaki makaleleri kullanarak kaynakca olusturma
- **Genisletme:** Kisa notlari akademik dile cevirip genisletme

### 8. Gezegen Temalari
4 farkli gorsel tema:
- **Uzay (Space)** — Koyu laci, mavi neon vurgular
- **Ay (Moon)** — Gri tonlamali, sofistike koyu tema
- **Satur'n (Saturn)** — Krem ve kahverengi tonlari, acik tema
- **Venus (Venus)** — Koyu bordo, pembe vurgular

### 9. Populer Aramalar (Trends)
Son 7 gun icinde en cok aranan sorgulari gosterir. Ana sayfada tiklanabilir etiketler halinde listelenir, boylece populer konulari kesfetmek kolaylasir.

### 10. Hiz ve Guvenlik
- **Rate Limiting:** Dakikada 30 istek siniri ile asiri kullanim korumasi
- **In-Memory Cache:** Ayni sorgu tekrarlandiginda hizli yanit (5 dk TTL)
- **Hata toleransi:** Bir kaynak hata verse bile diger kaynaklardan sonuc alinir

---

## Nasil Calisir?

1. **Ana sayfada** arama kutusuna bir konu yazin (ornek: "CRISPR", "Mars colonization", "yapay zeka")
2. **Kaynaklari secin:** Uluslararasi veya Turk kaynaklarini filtreleyin
3. **Makaleleri goruntuleyin:** Tum kaynaklardan gelen sonuclar tek bir listede
4. **Makaleye tiklayin:** AI ile ozetleyin, sesli dinleyin veya sunuma donusturun
5. **Rafa ekleyin:** Makaleyi kutuphanenize kaydedin
6. **AI Writer ile yazin:** Raftaki makaleleri referans alarak akademik metin olusturun

---

## Kullanilan Teknolojiler

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS 4, Framer Motion
- **Backend:** Node.js, Express, TypeScript
- **AI:** Google Gemini 2.5 Flash
- **Ses:** Microsoft Edge TTS
- **Veritabani:** SQLite (better-sqlite3)
- **Gorsellestirme:** 3D Force Graph, 2D Force Graph
- **Dokuman:** PPTX export (pptxgenjs), ReactQuill editor
- **State:** Zustand (localStorage persist)
- **Tema:** CSS custom properties + Tailwind v4

---

## Klasor Yapisi

```
NASA HACKATHON/
├── backend/                  # Express API server
│   ├── src/
│   │   ├── index.ts          6 API endpoint
│   │   ├── database.ts       SQLite veritabani
│   │   └── services/
│   │       ├── pubmed.ts     PubMed entegrasyonu
│   │       ├── gemini.ts     Google AI servisi
│   │       ├── tts.ts        Seslendirme servisi
│   │       ├── orchestrator.ts Paralel kaynak yoneticisi
│   │       ├── cache.ts     In-memory ortbellegi
│   │       └── sources/      Tum veri kaynaklari
│   └── package.json
├── frontend/                 # React kullanici arayuzu
│   └── src/
│       ├── pages/           Home, Search, Presentation, Library, AIWriter
│       ├── components/      Trending, GraphView, ThemeSelector, SourceFilter
│       └── store/           Zustand state yonetimi
├── data/                    SQLite db, AI writer rolu, ses dosyalari
└── .opencode/agents/        AI agent tanimlari
```
