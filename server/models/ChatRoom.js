import mongoose from 'mongoose';

const chatRoomSchema = new mongoose.Schema({
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: [true, 'Post ID is required'],
  },
  participants: {
    type: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    validate: {
      validator: function (val) {
        return Array.isArray(val) && val.length === 2;
      },
      message: 'A chat room must have exactly 2 participants',
    },
    required: true,
  },
  participantAnonIds: {
    type: [String],
    validate: {
      validator: function (val) {
        return Array.isArray(val) && val.length === 2;
      },
      message: 'A chat room must store exactly 2 anonymous IDs',
    },
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'closed'],
    default: 'active',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index participants to quickly look up user conversations
chatRoomSchema.index({ participants: 1 });

const ChatRoom = mongoose.model('ChatRoom', chatRoomSchema);
export default ChatRoom;
