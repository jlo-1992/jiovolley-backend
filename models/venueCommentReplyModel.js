import { Schema, model } from 'mongoose'

const venueCommentReplySchema = new Schema(
  {
    parentComment: {
      type: Schema.Types.ObjectId,
      ref: 'venueComments',
      required: true,
    },
    venue: {
      type: Schema.Types.ObjectId,
      ref: 'venues',
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'users',
      required: true,
    },
    reply: {
      type: String,
      required: true,
      trim: true,
    },
    likes: {
      type: Number,
      default: 0,
    },
    likedBy: [
      {
        type: Schema.Types.ObjectId,
        ref: 'users',
      },
    ],
    image: {
      type: [String],
    },
    is_deleted: {
      type: Boolean,
      default: false,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    isReported: {
      type: Boolean,
      default: false,
    },
    reports: [
      {
        reportedBy: {
          type: Schema.Types.ObjectId,
          ref: 'users',
        },
        reason: {
          type: String,
          enum: ['詐騙', '仇恨言論', '色情言論', '其他'],
          required: true,
        },
        reportedAt: {
          type: Date,
          default: Date.now(),
        },
      },
    ],
    reportCount: {
      type: Number,
      default: 0,
    },
    is_hidden: Boolean,
  },
  {
    versionKey: false,
    timestamps: true,
  },
)

export default model('venueCommentReplies', venueCommentReplySchema)
