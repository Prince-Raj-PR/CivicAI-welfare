import express from 'express'
import {
  createApplication,
  getApplications,
  getApplication,
  updateApplication,
  submitApplication,
  withdrawApplication,
  deleteApplication,
  getReviewQueue,
  assignReviewer,
  approveApplication,
  denyApplication,
} from '../controllers/applications.js'
import { protect, authorize } from '../middleware/auth.js'

const router = express.Router()

// Public routes (none)

// Protected routes (authenticated users)
router.use(protect)

router.route('/')
  .get(getApplications)
  .post(createApplication)

router.route('/:id')
  .get(getApplication)
  .put(updateApplication)
  .delete(deleteApplication)

router.post('/:id/submit', submitApplication)
router.post('/:id/withdraw', withdrawApplication)

// Admin routes
router.get('/review/queue', authorize('admin'), getReviewQueue)
router.put('/:id/assign', authorize('admin'), assignReviewer)
router.post('/:id/approve', authorize('admin'), approveApplication)
router.post('/:id/deny', authorize('admin'), denyApplication)

export default router
