import mongoose from 'mongoose';

const blockSchema = new mongoose.Schema({
  blockerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Blocker ID is required'],
  },
  blockedUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Blocked user ID is required'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Enforce unique compound index so a user cannot block another user multiple times
blockSchema.index({ blockerId: 1, blockedUserId: 1 }, { unique: true });

const Block = mongoose.model('Block', blockSchema);
export default Block;
