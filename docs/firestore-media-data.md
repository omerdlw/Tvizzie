# Firestore Media Data

Bu proje icin `comments` ve `favorites` verilerini Firestore'da tutmak en mantikli yapi.

Neden Firestore:

- Firebase'in resmi karsilastirma dokumanina gore daha zengin sorgular sunar.
- Dokuman / collection / subcollection modeli medya bazli yorumlari ve kullanici bazli favorileri temiz ayirir.
- Siralama ve limit sorgulari yorum akisi icin dogal sekilde kullanilabilir.

Onerilen koleksiyon yapisi:

```text
media_items/{entityType_entityId}
  entityId
  entityType
  title
  posterPath
  backdropPath
  updatedAt
  lastCommentedAt

media_items/{entityType_entityId}/comments/{userId}
  content
  rating (1-10 | null)
  user.id
  user.name
  user.email
  user.avatarUrl
  createdAt
  updatedAt

users/{userId}/favorites/{entityType_entityId}
  entityId
  entityType
  title
  posterPath
  backdropPath
  createdAt
  updatedAt
```

Yorumlar icin secim:

- Her kullanici bir medya kaydi icin tek yorum / review dokumani tutar.
- Yeni gonderim eski review'u gunceller.
- Opsiyonel rating ayni dokumanda tutulur.

Bu secim neden mantikli:

- rating tekrarli / spamli veri yerine kullanicinin guncel gorusunu temsil eder
- yorum ekraninda `orderBy(updatedAt, 'desc')` ile akisi cekmek kolaydir
- favoriler kullanici eksenli sorgulanir
- security rules daha net yazilir

Ornek Firestore rules:

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /media_items/{mediaKey} {
      allow read: if true;
      allow write: if request.auth != null;

      match /comments/{userId} {
        allow read: if true;
        allow create, update: if request.auth != null
          && request.auth.uid == userId
          && request.resource.data.content is string
          && request.resource.data.content.size() >= 10
          && (
            request.resource.data.rating == null ||
            (
              request.resource.data.rating is int &&
              request.resource.data.rating >= 1 &&
              request.resource.data.rating <= 10
            )
          );
      }
    }

    match /users/{userId}/favorites/{mediaKey} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Bu projede ayni kurallar root'taki [firestore.rules](/Users/omerdeliavci/Documents/Frontend/Tvizzie/firestore.rules) dosyasina da yazildi. Firebase Console > Firestore Database > Rules ekranina yapistirabilir veya Firebase CLI ile deploy edebilirsin.
