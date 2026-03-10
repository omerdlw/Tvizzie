import { apiClient } from '@/modules/api/client'

/**
 * Merkezi API Servis Yapısı
 * Her türlü URL yapısına ve HTTP metoduna uyum sağlar.
 * Dönen cevap daima { data, error, loading, status } formatındadır.
 * Exception fırlatmaz, try/catch ile sarmalanmıştır.
 * Interceptor desteği, underlying apiClient tarafından desteklenmektedir.
 */
export class BaseService {
  /**
   * Özel istek atmaya yarayan ana metod. Diğer tüm GET, POST metodları bunu kullanır.
   * @param {string} endpoint - İstek atılacak URL (dinamik endpoint veya path)
   * @param {object} options - istek ayarları (method, body, headers vs)
   * @returns {Promise<{data: any, error: string | null, loading: boolean, status: number}>}
   */
  static async request(endpoint, options = {}) {
    try {
      const response = await apiClient.request(endpoint, options)
      return {
        data: response.data,
        error: null,
        loading: false,
        status: response.status || 200,
      }
    } catch (err) {
      return {
        data: null,
        error: err.message || 'An error occurred',
        loading: false,
        status: err.status || 0,
      }
    }
  }

  /**
   * GET isteği atar.
   */
  static async get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' })
  }

  /**
   * POST isteği atar.
   */
  static async post(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'POST', body })
  }

  /**
   * PUT isteği atar.
   */
  static async put(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'PUT', body })
  }

  /**
   * PATCH isteği atar.
   */
  static async patch(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'PATCH', body })
  }

  /**
   * DELETE isteği atar.
   */
  static async delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' })
  }
}
