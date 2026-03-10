# API

Sunucu istekleri için HTTP istemci katmanı. Yapılandırılabilir bir `ApiClient`, `apiCache` ile istek önbellekleme, yeniden deneme ve önbellek yardımcıları ile bileşenler içinde veri çekmeye yarayan hook'lar (`useApi`, `useQuery`, `useMutation`) sunar.

`error-boundary` gibi modüller tarafından önbellek temizleme için; herhangi bir bileşen veya sayfada uzak veri çekmek ya da mutate etmek için kullanılır.

---

Olası kullanım örnekleri:

1. "Ürünler sayfasında ürün listesini çekmek için": `const { data, isLoading } = useQuery('/api/products')`
2. "Form verilerini POST isteğiyle göndermek için": `const { mutate } = useMutation('/api/contact'); mutate(formData)`
3. "Otomatik yeniden deneme ile kullanıcı profilini çekmek için": `useApi('/api/user', { retry: 3 })`
4. "Ağır bir endpoint yanıtını önbelleğe almak için": `withCache(() => apiClient.get('/api/config'), { ttl: 60000 })`
5. "Global hata oluştuğunda API önbelleğini temizlemek için": `apiCache.clear()`

---

### useRegistry ile Kullanım

`api` modülü için doğrudan bir `useRegistry` plugin'i yoktur. İstekler sayfa veya bileşen seviyesinde hook'larla (`useQuery`, `useMutation`) doğrudan çağrılır.
