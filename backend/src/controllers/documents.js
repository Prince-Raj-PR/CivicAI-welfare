import Document from '../models/Document.js'
import Application from '../models/Application.js'
import { errorResponses } from '../utils/authHelpers.js'
import path from 'path'
import fs from 'fs/promises'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Upload directory
const UPLOAD_DIR = path.join(__dirname, '../../uploads/documents')

// Ensure upload directory exists
await fs.mkdir(UPLOAD_DIR, { recursive: true })

// Allowed file types
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// @desc    Upload document
// @route   POST /api/v1/documents/upload
// @access  Private
export const uploadDocument = async (req, res) => {
  try {
    // Note: This is a basic implementation
    // In production, use multer or similar middleware for file uploads
    // and integrate with S3 or other cloud storage

    const { documentType, applicationId, description, expirationDate } = req.body

    if (!req.files || !req.files.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
      })
    }

    const file = req.files.file

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file type. Allowed types: PDF, JPG, PNG, GIF, DOC, DOCX',
      })
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return res.status(400).json({
        success: false,
        error: 'File size exceeds 10MB limit',
      })
    }

    // Validate application if provided
    if (applicationId) {
      const application = await Application.findById(applicationId)
      if (!application) {
        return res.status(404).json({
          success: false,
          error: 'Application not found',
        })
      }
      if (application.user.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to upload documents for this application',
        })
      }
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(7)
    const fileExtension = path.extname(file.name)
    const uniqueFilename = `${req.user.id}_${timestamp}_${randomString}${fileExtension}`
    const filePath = path.join(UPLOAD_DIR, uniqueFilename)

    // Save file
    await file.mv(filePath)

    // Create document record
    const document = await Document.create({
      user: req.user.id,
      application: applicationId || null,
      documentType,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.mimetype,
      storageProvider: 'local',
      storagePath: filePath,
      storageUrl: `/uploads/documents/${uniqueFilename}`,
      description,
      expirationDate: expirationDate || null,
    })

    // If application provided, add document to application
    if (applicationId) {
      await Application.findByIdAndUpdate(applicationId, {
        $push: { documents: document._id },
      })
    }

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: document,
    })
  } catch (error) {
    console.error('Upload document error:', error)
    errorResponses.serverError(res)
  }
}

// @desc    Get user's documents
// @route   GET /api/v1/documents
// @access  Private
export const getDocuments = async (req, res) => {
  try {
    const { documentType, applicationId } = req.query

    let documents
    if (applicationId) {
      documents = await Document.findByApplication(applicationId)
    } else {
      documents = await Document.findByUser(req.user.id, documentType)
    }

    res.json({
      success: true,
      count: documents.length,
      data: documents,
    })
  } catch (error) {
    console.error('Get documents error:', error)
    errorResponses.serverError(res)
  }
}

// @desc    Get single document
// @route   GET /api/v1/documents/:id
// @access  Private
export const getDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id)
      .populate('user', 'firstName lastName email')
      .populate('application', 'status')
      .populate('verifiedBy', 'firstName lastName')

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found',
      })
    }

    // Check authorization
    if (
      document.user._id.toString() !== req.user.id &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this document',
      })
    }

    res.json({
      success: true,
      data: document,
    })
  } catch (error) {
    console.error('Get document error:', error)
    errorResponses.serverError(res)
  }
}

// @desc    Download document
// @route   GET /api/v1/documents/:id/download
// @access  Private
export const downloadDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id)

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found',
      })
    }

    // Check authorization
    if (
      document.user.toString() !== req.user.id &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to download this document',
      })
    }

    // Check if file exists
    try {
      await fs.access(document.storagePath)
    } catch {
      return res.status(404).json({
        success: false,
        error: 'File not found on server',
      })
    }

    // Send file
    res.download(document.storagePath, document.fileName)
  } catch (error) {
    console.error('Download document error:', error)
    errorResponses.serverError(res)
  }
}

// @desc    Delete document
// @route   DELETE /api/v1/documents/:id
// @access  Private
export const deleteDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id)

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found',
      })
    }

    // Check authorization
    if (
      document.user.toString() !== req.user.id &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this document',
      })
    }

    // Delete file from storage
    try {
      await fs.unlink(document.storagePath)
    } catch (error) {
      console.error('Error deleting file:', error)
      // Continue even if file deletion fails
    }

    // Remove document from application if associated
    if (document.application) {
      await Application.findByIdAndUpdate(document.application, {
        $pull: { documents: document._id },
      })
    }

    // Delete document record
    await document.deleteOne()

    res.json({
      success: true,
      message: 'Document deleted successfully',
    })
  } catch (error) {
    console.error('Delete document error:', error)
    errorResponses.serverError(res)
  }
}

// @desc    Verify document (Admin only)
// @route   POST /api/v1/documents/:id/verify
// @access  Private/Admin
export const verifyDocument = async (req, res) => {
  try {
    const { notes } = req.body
    const document = await Document.findById(req.params.id)

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found',
      })
    }

    await document.verify(req.user.id, notes)

    res.json({
      success: true,
      message: 'Document verified successfully',
      data: document,
    })
  } catch (error) {
    console.error('Verify document error:', error)
    errorResponses.serverError(res)
  }
}

// @desc    Reject document verification (Admin only)
// @route   POST /api/v1/documents/:id/reject
// @access  Private/Admin
export const rejectDocument = async (req, res) => {
  try {
    const { notes } = req.body

    if (!notes) {
      return res.status(400).json({
        success: false,
        error: 'Rejection notes are required',
      })
    }

    const document = await Document.findById(req.params.id)

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found',
      })
    }

    await document.rejectVerification(req.user.id, notes)

    res.json({
      success: true,
      message: 'Document verification rejected',
      data: document,
    })
  } catch (error) {
    console.error('Reject document error:', error)
    errorResponses.serverError(res)
  }
}

// @desc    Get expiring documents (Admin only)
// @route   GET /api/v1/documents/expiring
// @access  Private/Admin
export const getExpiringDocuments = async (req, res) => {
  try {
    const { days = 30 } = req.query
    const documents = await Document.findExpiringSoon(parseInt(days))

    res.json({
      success: true,
      count: documents.length,
      data: documents,
    })
  } catch (error) {
    console.error('Get expiring documents error:', error)
    errorResponses.serverError(res)
  }
}
