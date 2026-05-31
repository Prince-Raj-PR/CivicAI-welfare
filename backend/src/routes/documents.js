import express from 'express'
import {
  uploadDocument,
  getDocuments,
  getDocument,
  downloadDocument,
  deleteDocument,
  verifyDocument,
  rejectDocument,
  getExpiringDocuments,
} from '../controllers/documents.js'
import { protect, authorize } from '../middleware/auth.js'

const router = express.Router()

// Protected routes (authenticated users)
router.use(protect)

router.route('/')
  .get(getDocuments)
  .post(uploadDocument)

router.get('/expiring', authorize('admin'), getExpiringDocuments)

router.route('/:id')
  .get(getDocument)
  .delete(deleteDocument)

router.get('/:id/download', downloadDocument)

// Admin routes
router.post('/:id/verify', authorize('admin'), verifyDocument)
router.post('/:id/reject', authorize('admin'), rejectDocument)

export default router
