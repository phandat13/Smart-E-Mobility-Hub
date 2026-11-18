import { setupWorker } from 'msw/browser'
import { reHandlers } from '../features/re/mocks/handlers'

// Mỗi module tự khai báo handler trong features/<module>/mocks, rồi thêm vào đây.
export const worker = setupWorker(...reHandlers)
