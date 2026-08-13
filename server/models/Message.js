import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatRoom',
    required: [true, 'Room ID is required'],
    index: true,
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Sender ID is required'],
  },
  senderAnonId: {
    type: String,
    required: [true, 'Sender anonymous ID is required'],
  },
  content: {
    type: String,
    required: [true, 'Message content is required'],
    maxlength: [2000, 'Content cannot exceed 2000 characters'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Message = mongoose.model('Message', messageSchema);
export default Message;
