import mongoose from 'mongoose';
import { ALLOWED_TAGS } from '../config/constants.js';

const postSchema = new mongoose.Schema({
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Author ID is required'],
    index: true,
  },
  authorAnonId: {
    type: String,
    required: [true, 'Author anonymous ID is required'],
  },
  content: {
    type: String,
    required: [true, 'Post content is required'],
    minlength: [10, 'Content must be at least 10 characters'],
    maxlength: [1000, 'Content cannot exceed 1000 characters'],
    trim: true,
  },
  tags: {
    type: [String],
    validate: {
      validator: function (val) {
        return Array.isArray(val) && val.length <= 3 && val.every(t => ALLOWED_TAGS.includes(t));
      },
      message: 'Tags must be an array of up to 3 valid tags from the allowed list',
    },
    default: [],
  },
  status: {
    type: String,
    enum: ['open', 'in_conversation', 'closed'],
    default: 'open',
  },
  flaggedForReview: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

const Post = mongoose.model('Post', postSchema);
export default Post;
