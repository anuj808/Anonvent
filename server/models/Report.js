import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  reporterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Reporter ID is required'],
  },
  reportedUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Reported User ID is required'],
  },
  reportType: {
    type: String,
    enum: ['post', 'message'],
    required: [true, 'Report type must be post or message'],
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Target ID is required'],
  },
  reason: {
    type: String,
    enum: ['harassment', 'spam', 'self-harm-concern', 'inappropriate', 'other'],
    required: [true, 'Reason is required'],
  },
  details: {
    type: String,
    maxlength: [500, 'Details cannot exceed 500 characters'],
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'actioned', 'dismissed'],
    default: 'pending',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Report = mongoose.model('Report', reportSchema);
export default Report;
