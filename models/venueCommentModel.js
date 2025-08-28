import { Schema, model } from 'mongoose'

const venueCommentSchema = new Schema(
  {
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
    comment: {
      type: String,
      required: [true, '留言內容為必填'],
      trim: true,
      minLength: [1, '留言不可為空白'],
    },
    emoji: {
      type: String,
      default: 'mdi-emoticon',
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
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  },
)

export default model('venueComments', venueCommentSchema)
