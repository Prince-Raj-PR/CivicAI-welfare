import Application from '../models/Application.js'
import Program from '../models/Program.js'
import Notification from '../models/Notification.js'
import { errorResponses } from '../utils/authHelpers.js'

// @desc    Create new application
// @route   POST /api/v1/applications
// @access  Private
export const createApplication = async (req, res) => {
  try {
    const { programId, formData, notes } = req.body

    // Validate program exists
    const program = await Program.findById(programId)
    if (!program) {
      return res.status(404).json({
        success: false,
        error: 'Program not found',
      })
    }

    // Check if user already has an application for this program
    const existingApplication = await Application.findOne({
      user: req.user.id,
      program: programId,
      status: { $in: ['draft', 'submitted', 'under_review'] },
    })

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        error: 'You already have an active application for this program',
      })
    }

    // Create application
    const application = await Application.create({
      user: req.user.id,
      program: programId,
      formData: formData || {},
      notes,
      status: 'draft',
    })

    const populatedApplication = await Application.findById(application._id)
      .populate('program', 'name category agency benefitType')
      .populate('user', 'firstName lastName email')

    res.status(201).json({
      success: true,
      data: populatedApplication,
    })
  } catch (error) {
    console.error('Create application error:', error)
    errorResponses.serverError(res)
  }
}

// @desc    Get all applications for current user
// @route   GET /api/v1/applications
// @access  Private
export const getApplications = async (req, res) => {
  try {
    const { status } = req.query

    const applications = await Application.findByUser(req.user.id, status)

    res.json({
      success: true,
      count: applications.length,
      data: applications,
    })
  } catch (error) {
    console.error('Get applications error:', error)
    errorResponses.serverError(res)
  }
}

// @desc    Get single application
// @route   GET /api/v1/applications/:id
// @access  Private
export const getApplication = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('program')
      .populate('user', 'firstName lastName email phone')
      .populate('documents')
      .populate('assignedReviewer', 'firstName lastName email')

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found',
      })
    }

    // Check authorization
    if (
      application.user._id.toString() !== req.user.id &&
      req.user.role !== 'admin' &&
      application.assignedReviewer?._id.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this application',
      })
    }

    res.json({
      success: true,
      data: application,
    })
  } catch (error) {
    console.error('Get application error:', error)
    errorResponses.serverError(res)
  }
}

// @desc    Update application
// @route   PUT /api/v1/applications/:id
// @access  Private
export const updateApplication = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found',
      })
    }

    // Check authorization
    if (application.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this application',
      })
    }

    // Only allow updates to draft applications
    if (application.status !== 'draft') {
      return res.status(400).json({
        success: false,
        error: 'Only draft applications can be updated',
      })
    }

    // Update allowed fields
    const { formData, notes } = req.body
    if (formData) application.formData = formData
    if (notes !== undefined) application.notes = notes

    await application.save()

    const updatedApplication = await Application.findById(application._id)
      .populate('program', 'name category agency benefitType')

    res.json({
      success: true,
      data: updatedApplication,
    })
  } catch (error) {
    console.error('Update application error:', error)
    errorResponses.serverError(res)
  }
}

// @desc    Submit application
// @route   POST /api/v1/applications/:id/submit
// @access  Private
export const submitApplication = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found',
      })
    }

    // Check authorization
    if (application.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to submit this application',
      })
    }

    // Submit application
    await application.submit()

    // Create notification
    await Notification.createApplicationNotification(
      req.user.id,
      application._id,
      'submitted'
    )

    const submittedApplication = await Application.findById(application._id)
      .populate('program', 'name category agency benefitType')

    res.json({
      success: true,
      message: 'Application submitted successfully',
      data: submittedApplication,
    })
  } catch (error) {
    console.error('Submit application error:', error)
    if (error.message.includes('Only draft')) {
      return res.status(400).json({
        success: false,
        error: error.message,
      })
    }
    errorResponses.serverError(res)
  }
}

// @desc    Withdraw application
// @route   POST /api/v1/applications/:id/withdraw
// @access  Private
export const withdrawApplication = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found',
      })
    }

    // Check authorization
    if (application.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to withdraw this application',
      })
    }

    // Withdraw application
    await application.withdraw()

    res.json({
      success: true,
      message: 'Application withdrawn successfully',
      data: application,
    })
  } catch (error) {
    console.error('Withdraw application error:', error)
    if (error.message.includes('Cannot withdraw')) {
      return res.status(400).json({
        success: false,
        error: error.message,
      })
    }
    errorResponses.serverError(res)
  }
}

// @desc    Delete application
// @route   DELETE /api/v1/applications/:id
// @access  Private
export const deleteApplication = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found',
      })
    }

    // Check authorization
    if (application.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this application',
      })
    }

    // Only allow deletion of draft or withdrawn applications
    if (!['draft', 'withdrawn'].includes(application.status)) {
      return res.status(400).json({
        success: false,
        error: 'Only draft or withdrawn applications can be deleted',
      })
    }

    await application.deleteOne()

    res.json({
      success: true,
      message: 'Application deleted successfully',
    })
  } catch (error) {
    console.error('Delete application error:', error)
    errorResponses.serverError(res)
  }
}

// @desc    Get applications for review (Admin only)
// @route   GET /api/v1/applications/review/queue
// @access  Private/Admin
export const getReviewQueue = async (req, res) => {
  try {
    const { status = 'submitted' } = req.query

    const applications = await Application.findForReview(status)

    res.json({
      success: true,
      count: applications.length,
      data: applications,
    })
  } catch (error) {
    console.error('Get review queue error:', error)
    errorResponses.serverError(res)
  }
}

// @desc    Assign application to reviewer (Admin only)
// @route   PUT /api/v1/applications/:id/assign
// @access  Private/Admin
export const assignReviewer = async (req, res) => {
  try {
    const { reviewerId } = req.body
    const application = await Application.findById(req.params.id)

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found',
      })
    }

    application.assignedReviewer = reviewerId
    application.status = 'under_review'
    application.reviewDate = new Date()
    await application.save()

    // Create notification
    await Notification.createApplicationNotification(
      application.user,
      application._id,
      'under_review'
    )

    res.json({
      success: true,
      message: 'Reviewer assigned successfully',
      data: application,
    })
  } catch (error) {
    console.error('Assign reviewer error:', error)
    errorResponses.serverError(res)
  }
}

// @desc    Approve application (Admin only)
// @route   POST /api/v1/applications/:id/approve
// @access  Private/Admin
export const approveApplication = async (req, res) => {
  try {
    const { notes } = req.body
    const application = await Application.findById(req.params.id)

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found',
      })
    }

    await application.approve(req.user.id, notes)

    // Create notification
    await Notification.createApplicationNotification(
      application.user,
      application._id,
      'approved'
    )

    res.json({
      success: true,
      message: 'Application approved successfully',
      data: application,
    })
  } catch (error) {
    console.error('Approve application error:', error)
    if (error.message.includes('Only applications under review')) {
      return res.status(400).json({
        success: false,
        error: error.message,
      })
    }
    errorResponses.serverError(res)
  }
}

// @desc    Deny application (Admin only)
// @route   POST /api/v1/applications/:id/deny
// @access  Private/Admin
export const denyApplication = async (req, res) => {
  try {
    const { reason, notes } = req.body

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: 'Denial reason is required',
      })
    }

    const application = await Application.findById(req.params.id)

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found',
      })
    }

    await application.deny(req.user.id, reason, notes)

    // Create notification
    await Notification.createApplicationNotification(
      application.user,
      application._id,
      'denied'
    )

    res.json({
      success: true,
      message: 'Application denied',
      data: application,
    })
  } catch (error) {
    console.error('Deny application error:', error)
    if (error.message.includes('Only applications under review')) {
      return res.status(400).json({
        success: false,
        error: error.message,
      })
    }
    errorResponses.serverError(res)
  }
}
