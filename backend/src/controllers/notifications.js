import Notification from '../models/Notification.js'
import { errorResponses } from '../utils/authHelpers.js'

// @desc    Get user's notifications
// @route   GET /api/v1/notifications
// @access  Private
export const getNotifications = async (req, res) => {
  try {
    const { unreadOnly } = req.query
    const notifications = await Notification.findByUser(
      req.user.id,
      unreadOnly === 'true'
    )

    res.json({
      success: true,
      count: notifications.length,
      data: notifications,
    })
  } catch (error) {
    console.error('Get notifications error:', error)
    errorResponses.serverError(res)
  }
}

// @desc    Get unread notification count
// @route   GET /api/v1/notifications/unread/count
// @access  Private
export const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.getUnreadCount(req.user.id)

    res.json({
      success: true,
      data: { count },
    })
  } catch (error) {
    console.error('Get unread count error:', error)
    errorResponses.serverError(res)
  }
}

// @desc    Get single notification
// @route   GET /api/v1/notifications/:id
// @access  Private
export const getNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id)
      .populate('relatedApplication', 'status')
      .populate('relatedProgram', 'name')
      .populate('relatedDocument', 'documentType fileName')

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found',
      })
    }

    // Check authorization
    if (notification.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this notification',
      })
    }

    res.json({
      success: true,
      data: notification,
    })
  } catch (error) {
    console.error('Get notification error:', error)
    errorResponses.serverError(res)
  }
}

// @desc    Mark notification as read
// @route   PUT /api/v1/notifications/:id/read
// @access  Private
export const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id)

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found',
      })
    }

    // Check authorization
    if (notification.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this notification',
      })
    }

    await notification.markAsRead()

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: notification,
    })
  } catch (error) {
    console.error('Mark as read error:', error)
    errorResponses.serverError(res)
  }
}

// @desc    Mark notification as unread
// @route   PUT /api/v1/notifications/:id/unread
// @access  Private
export const markAsUnread = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id)

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found',
      })
    }

    // Check authorization
    if (notification.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this notification',
      })
    }

    await notification.markAsUnread()

    res.json({
      success: true,
      message: 'Notification marked as unread',
      data: notification,
    })
  } catch (error) {
    console.error('Mark as unread error:', error)
    errorResponses.serverError(res)
  }
}

// @desc    Mark all notifications as read
// @route   PUT /api/v1/notifications/read-all
// @access  Private
export const markAllAsRead = async (req, res) => {
  try {
    const result = await Notification.markAllAsRead(req.user.id)

    res.json({
      success: true,
      message: 'All notifications marked as read',
      data: { modifiedCount: result.modifiedCount },
    })
  } catch (error) {
    console.error('Mark all as read error:', error)
    errorResponses.serverError(res)
  }
}

// @desc    Delete notification
// @route   DELETE /api/v1/notifications/:id
// @access  Private
export const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id)

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found',
      })
    }

    // Check authorization
    if (notification.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this notification',
      })
    }

    await notification.deleteOne()

    res.json({
      success: true,
      message: 'Notification deleted successfully',
    })
  } catch (error) {
    console.error('Delete notification error:', error)
    errorResponses.serverError(res)
  }
}

// @desc    Create notification (Admin only)
// @route   POST /api/v1/notifications
// @access  Private/Admin
export const createNotification = async (req, res) => {
  try {
    const {
      userId,
      type,
      title,
      message,
      actionUrl,
      actionText,
      priority,
      expiresAt,
    } = req.body

    if (!userId || !type || !title || !message) {
      return res.status(400).json({
        success: false,
        error: 'userId, type, title, and message are required',
      })
    }

    const notification = await Notification.createNotification({
      user: userId,
      type,
      title,
      message,
      actionUrl,
      actionText,
      priority,
      expiresAt,
    })

    res.status(201).json({
      success: true,
      message: 'Notification created successfully',
      data: notification,
    })
  } catch (error) {
    console.error('Create notification error:', error)
    errorResponses.serverError(res)
  }
}
