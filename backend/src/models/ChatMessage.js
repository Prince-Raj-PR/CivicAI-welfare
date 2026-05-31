import mongoose from 'mongoose'

const chatMessageSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    conversationId: {
      type: String,
      required: true,
      index: true,
    },
    role: {
      type: String,
      required: true,
      enum: ['user', 'assistant', 'system'],
    },
    content: {
      type: String,
      required: true,
    },
    contextData: {
      type: mongoose.Schema.Types.Mixed,
    },
    // AI Metadata
    modelUsed: {
      type: String,
    },
    tokensUsed: {
      type: Number,
    },
    responseTimeMs: {
      type: Number,
    },
    // Feedback
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    feedback: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
)

// Indexes
chatMessageSchema.index({ user: 1, conversationId: 1, createdAt: -1 })
chatMessageSchema.index({ conversationId: 1, createdAt: 1 })

// Static method to get conversation history
chatMessageSchema.statics.getConversation = function (conversationId, limit = 50) {
  return this.find({ conversationId })
    .sort({ createdAt: 1 })
    .limit(limit)
}

// Static method to get user's conversations
chatMessageSchema.statics.getUserConversations = function (userId) {
  return this.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId) } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: '$conversationId',
        lastMessage: { $first: '$content' },
        lastMessageAt: { $first: '$createdAt' },
        messageCount: { $sum: 1 },
      },
    },
    { $sort: { lastMessageAt: -1 } },
  ])
}

// Static method to create message
chatMessageSchema.statics.createMessage = async function (data) {
  const message = new this(data)
  await message.save()
  return message
}

// Static method to delete conversation
chatMessageSchema.statics.deleteConversation = async function (conversationId) {
  return this.deleteMany({ conversationId })
}

// Method to add rating
chatMessageSchema.methods.addRating = async function (rating, feedback = null) {
  this.rating = rating
  if (feedback) this.feedback = feedback
  return this.save()
}

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema)

export default ChatMessage
