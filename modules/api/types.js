export class ApiError extends Error {
  constructor(message, status, data = null, response = null) {
    super(message)
    this.response = response
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }

  isStatus(status) {
    return this.status === status
  }
  isClientError() {
    return this.status >= 400 && this.status < 500
  }
  isServerError() {
    return this.status >= 500 && this.status < 600
  }
  isNetworkError() {
    return this.status === 0
  }
  isTimeoutError() {
    return this.status === 408
  }
  isUnauthorized() {
    return this.status === 401
  }
  isForbidden() {
    return this.status === 403
  }
  isNotFound() {
    return this.status === 404
  }
}
