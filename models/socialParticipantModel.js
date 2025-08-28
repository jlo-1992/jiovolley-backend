import { Schema, model } from 'mongoose'

const socialParticipantSchema = new Schema(
  {
    social: {
      type: Schema.Types.ObjectId,
      ref: 'socials',
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'users',
      required: true,
    },
    status: {
      type: String,
      enum: ['已報名', '已取消報名', '候補中', '已遞補', '已出席', '缺席', '已補登出席'],
      default: '已報名',
      required: true,
    },
    registeredAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    isCancelled: {
      type: Boolean,
      default: false,
    },
    cancelledAt: {
      type: Date,
    },
    checkedIn: {
      type: Boolean,
      default: false,
    },
    checkedInTime: {
      type: Date,
      default: Date.now,
    },
    isOverrided: {
      type: Boolean,
      default: false,
    },
    overridedAt: {
      type: Date,
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    versionKey: false,
    timestamps: true,
    indexes: [{ unique: true, fields: ['social', 'user'] }],
  },
)

socialParticipantSchema.index({ social: 1, user: 1 }, { unique: true })
export default model('socialParticipants', socialParticipantSchema)
