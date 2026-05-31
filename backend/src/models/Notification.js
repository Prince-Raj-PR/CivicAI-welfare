import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        'application_submitted',
        'application_approved',
        'application_denied',
        'application_under_review',
        'document_verified',
        'document_rejected',
        'document_expiring',
        'new_program_match',
        'profile_incomplete',
        'system_announcement',
        'reminder',
      ],
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
    },
    actionUrl: {
      type: String,
    },
    actionText: {
      type: String,
    },
    relatedApplication: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
    },
    relatedProgram: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Program',
    },
    relatedDocument: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    expiresAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
)

// Indexes
notificationSchema.index({ user: 1, isRead: 1 })
notificationSchema.index({ user: 1, createdAt: -1 })
notificationSchema.index({ expiresAt: 1 })

// Method to mark as read
notificationSchema.methods.markAsRead = async function () {
  if (!this.isRead) {
    this.isRead = true
    this.readAt = new Date()
    return this.save()
  }
  return this
}

// Method to mark as unread
notificationSchema.methods.markAsUnread = async function () {
  if (this.isRead) {
    this.isRead = false
    this.readAt = null
    return this.save()
  }
  return this
}

// Static method to get user's notifications
notificationSchema.statics.findByUser = function (userId, unreadOnly = false) {
  const query = { user: userId }
  if (unreadOnly) query.isRead = false
  
  return this.find(query)
    .populate('relatedApplication', 'status')
    .populate('relatedProgram', 'name')
    .populate('relatedDocument', 'documentType fileName')
    .sort({ createdAt: -1 })
}

// Static method to get unread count
notificationSchema.statics.getUnreadCount = function (userId) {
  return this.countDocuments({ user: userId, isRead: false })
}

// Static method to mark all as read
notificationSchema.statics.markAllAsRead = async function (userId) {
  return this.updateMany(
    { user: userId, isRead: false },
    { isRead: true, readAt: new Date() }
  )
}

// Static method to create notification
notificationSchema.statics.createNotification = async function (data) {
  const notification = new this(data)
  await notification.save()
  
  // TODO: Integrate with real-time notification service (Socket.io, Firebase, etc.)
  // TODO: Send email/SMS based on user preferences
  
  return notification
}

// Static method to clean up expired notifications
notificationSchema.statics.cleanupExpired = async function () {
  return this.deleteMany({
    expiresAt: { $lt: new Date() },
  })
}

// Helper function to create application status notification
notificationSchema.statics.createApplicationNotification = async function (
  userId,
  applicationId,
  status,
  additionalInfo = {}
) {
  const notificationMap = {
    submitted: {
      type: 'application_submitted',
      title: 'Application Submitted',
      message: 'Your application has been successfully submitted and is awaiting review.',
      priority: 'medium',
    },
    under_review: {
      type: 'application_under_review',
      title: 'Application Under Review',
      message: 'Your application is now being reviewed by our team.',
      priority: 'medium',
    },
    approved: {
      type: 'application_approved',
      title: 'Application Approved! 🎉',
      message: 'Congratulations! Your application has been approved.',
      priority: 'high',
    },
    denied: {
      type: 'application_denied',
      title: 'Application Decision',
      message: 'Your application has been reviewed. Please check the details for more information.',
      priority: 'high',
    },
  }

  const config = notificationMap[status]
  if (!config) return null

  return this.createNotification({
    user: userId,
    ...config,
    relatedApplication: applicationId,
    actionUrl: `/applications/${applicationId}`,
    actionText: 'View Application',
    ...additionalInfo,
  })
}

const Notification = mongoose.model('Notification', notificationSchema)

export default Notification
