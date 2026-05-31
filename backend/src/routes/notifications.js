import express from 'express'
import {
  getNotifications,
  getUnreadCount,
  getNotification,
  markAsRead,
  markAsUnread,
  markAllAsRead,
  deleteNotification,
  createNotification,
} from '../controllers/notifications.js'
import { protect, authorize } from '../middleware/auth.js'

const router = express.Router()

// Protected routes (authenticated users)
router.use(protect)

router.route('/')
  .get(getNotifications)
  .post(authorize('admin'), createNotification)

router.get('/unread/count', getUnreadCount)
router.put('/read-all', markAllAsRead)

router.route('/:id')
  .get(getNotification)
  .delete(deleteNotification)

router.put('/:id/read', markAsRead)
router.put('/:id/unread', markAsUnread)

export default router
