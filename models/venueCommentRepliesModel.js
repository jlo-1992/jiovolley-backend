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
    like: {
      type: Number,
      default: 0,
    },
    image: {
      type: [String],
    },
    is_deleted: {
      type: Boolean,
      default: false,
    },
    is_hidden: Boolean,
  },
  {
    versionKey: false,
    timestamps: true,
  },
)

export default model('venueCommentReplies', venueCommentReplySchema)
