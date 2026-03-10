# MongoDB Altyapısı Kullanım Rehberi

Mevcut `mongodb.service.js` ve `services.config.js` dosya mimarisi, veritabanı işlemlerini "Repository Pattern" ile modüler, güvenli ve yüksek performanslı (bağlantı önbellekleme) bir şekilde yapmanızı sağlar.

Bu rehberde, projeye yeni bir yapı (örneğin bir **ürünler - products** veya **görevler - tasks** koleksiyonu) eklemek ve bu altyapıyı kullanmak adım adım örneklendirilmiştir.

---

## Adım 1: Çevre Değişkenlerini Tanımlama (`.env`)

Veritabanına bağlanmak için gerekli olan bilgileri projenizin kök dizininde bulunan `.env` veya `.env.local` dosyanıza tanımlayın. `services.config.js` dosyası varsayılan olarak `main` veritabanı için `MONGODB_URI` ve `MONGODB_DB` anahtarlarını arar.

```env
# MongoDB Bağlantı URL'si (Lokal veya Atlas vb.)
MONGODB_URI=mongodb+srv://<kullanici_adi>:<sifre>@cluster.mongodb.net/?retryWrites=true&w=majority

# Kullanılacak Hedef Veritabanının Adı
MONGODB_DB=yeni_proje_veritabani
```

## Adım 2: Konfigürasyonu Güncelleme (`config/services.config.js`)

`services.config.js` dosyasında bulunan `collections` objesine projenizde kullanacağınız yeni koleksiyonun kurallarını ve şemasını tanımlamanız gerekir. 

Örnek olarak bir **"tasks" (görevler)** koleksiyonu oluşturalım:

```javascript
export const SERVICES_CONFIG = {
  mongodb: {
    enabled: true,
    databases: {
      main: {
        uriEnvKey: 'MONGODB_URI',
        dbEnvKey: 'MONGODB_DB',
      },
    },
    collections: {
      // 💡 YENİ EKLENEN KOLEKSİYON: tasks
      tasks: {
        database: 'main', // Hangi veritabanına bağlanacağı
        collectionName: 'tasks', // MongoDB'de oluşturulacak tablo/koleksiyon adı
        fields: {
          title: { type: 'string', required: true },
          description: { type: 'string', required: false },
          status: { type: 'string', default: 'pending' }, // Varsayılan değer atanabilir
          priority: { type: 'number', default: 1 },
          createdAt: { type: 'date', auto: 'createdAt' }, // Oluşturulma tarihi otomatik eklenir
          updatedAt: { type: 'date', auto: 'updatedAt' }, // Güncellenme tarihi otomatik güncellenir
        },
      },
    },
  },
  // ... diğer servisler
}
```

Bu yapılandırma sayesinde `tasks` koleksiyonunda `createdAt` ve `updatedAt` gibi alanlar manuel olarak girilmeden servis tarafından otomatik olarak yönetilecektir.

## Adım 3: Servisi Kullanma (CRUD İşlemleri)

Konfigürasyonu tamamladıktan sonra projenizin herhangi bir yerinde `createRepository` fonksiyonunu çağırarak veritabanı işlemlerini (Create, Read, Update, Delete) kolayca yapabilirsiniz.

İlgili dosyada servisi içe aktarın ve repository'nizi oluşturun:

```javascript
import { createRepository } from '@/services/mongodb.service';

// Parametre olarak services.config.js dosyasında tanımladığımız anahtarı ('tasks') veriyoruz.
const tasksRepo = createRepository('tasks');
```

Aşağıda bu repository'i kullanarak yapabileceğiniz temel ve gelişmiş işlemlerin örnekleri bulunmaktadır.

### 1. Veri Oluşturma (Create)

Veri oluştururken `createdAt` ve `status` gibi default veya otomatik atanan alanları belirtmenize gerek kalmaz, `mongodb.service.js` bunları sizin için halleder.

```javascript
async function createTask() {
  const newTask = await tasksRepo.create({
    title: 'Yeni Proje Tasarımı',
    description: 'Anasayfa için mockup hazırlanacak.',
    priority: 3
    // 'status' otomatik olarak 'pending' olacak
    // 'createdAt' otomatik olarak anlık tarih olacak
  });

  console.log('Oluşturulan Görev ID:', newTask._id);
  return newTask;
}
```

### 2. Çoklu Veri Çekme, Filtreleme ve Sayfalama (Find / Read)

Birden çok veriyi koşullu olarak çekebilir, sınırlandırabilir (limit) ve sıralayabilirsiniz (sort).

```javascript
async function getPendingTasks() {
  const tasks = await tasksRepo.find(
    // Filtre: Sadece 'pending' ve önceliği 2'den büyük olanlar
    { status: 'pending', priority: { $gt: 2 } }, 
    
    // Opsiyonlar: İlk 10 veriyi atla (skip), 20 tane getir (limit) ve tarihe göre son eklenen ilk gelsin (sort)
    { 
      limit: 20, 
      skip: 0, 
      sort: { createdAt: -1 } 
    }
  );

  return tasks;
}
```

### 3. Tekil Veri Çekme (FindOne)

```javascript
async function getTaskById(taskId) {
  // Veritabanından direkt belirli bir kritere uyan tek kaydı getirir.
  // Not: Eğer _id ile arama yapacaksanız MongoDB'nin ObjectId'sine dönüştürmeniz gerekebilir.
  const task = await tasksRepo.findOne({ title: 'Yeni Proje Tasarımı' });
  
  if (!task) {
    throw new Error('Görev bulunamadı!');
  }

  return task;
}
```

### 4. Veri Güncelleme (Update)

Kod altyapınızdaki `.update()` metodunuz, `$set` operatörünü otomatik uygulayarak mevcut veriyi günceller ve değişiklikten **sonraki** halini size döndürür (`returnDocument: 'after'`). Üstelik `updatedAt` tarihi arka planda anlık zamana güncellenir.

```javascript
async function completeTask(taskId) {
  const updatedTask = await tasksRepo.update(
    { _id: taskId }, // Hangi verinin güncelleneceğini belirten query
    { 
      status: 'completed',
      priority: 5
    } // Hangi alanların değişeceği
  );

  return updatedTask; // Güncellenmiş dokümanın son hali
}
```

### 5. Veri Silme (Delete)

```javascript
async function deleteTask(taskId) {
  const result = await tasksRepo.deleteOne({ _id: taskId });
  
  if (result.deletedCount === 1) {
    console.log('Görev başarıyla silindi.');
  }
}
```

### 6. Kayıt Sayısını Öğrenme (Count)

Bazen verileri çekmeden sadece toplam sayısını bilmek isteyebilirsiniz (Özellikle sayfalama işlemlerinde).

```javascript
async function getCompletedTaskCount() {
  const count = await tasksRepo.count({ status: 'completed' });
  console.log(`Toplam tamamlanan görev sayısı: ${count}`);
  return count;
}
```

---

## Mimari Avantajların Özeti

1. **Performanslı Bağlantı (Connection Caching):** `getClient` fonksiyonu, veritabanı bağlantılarını `clientCache` objesinde saklar. Sunucu (veya Next.js Serverless Function'ı) ilk çalıştığında bağlantıyı kurar, sonraki isteklerde mevcut açık bağlantıyı kullanır. 
2. **Bakım Kolaylığı:** Kodun her yerine `MongoClient.connect()` yazmak yerine sadece repository'den metodları kullanırsınız. Projede veritabanı sürücüsünü değiştirmek isterseniz sadece `mongodb.service.js` dosyasını güncellemeniz yeterlidir.
3. **Otomatize Edilmiş Şema Yönetimi:** `fields` konfigürasyonunuzla `create` ve `update` aşamalarında otomatik `createdAt`, `updatedAt` gibi alan atamaları yapılarak hata payı sıfıra indirilir.
