import { Schema, model } from 'mongoose'

const socialSchema = new Schema(
  {
    venue: {
      type: Schema.Types.ObjectId,
      ref: 'venues',
      required: true,
    },
    host: {
      type: Schema.Types.ObjectId,
      ref: 'users',
      required: true,
    },
    startDateTime: {
      type: Date,
      required: [true, '場次開始時間為必填'],
    },
    endDateTime: {
      type: Date,
      required: [true, '場次結束時間為必填'],
    },
    fee: {
      type: Number,
      required: [true, '場次價格為必填'],
      min: [0, '場次價格不能為負數'],
    },
    skillLevel: {
      type: String,
      required: [true, '球技程度為必填'],
      enum: ['S 體保生', 'A 一般生校隊', 'B 一般生系隊', 'C 排球初級班', 'D 排球初心者'],
    },
    demandFemalePlayers: {
      type: Number,
      default: 0,
      required: [true, '需求女性球員數為必填'],
      min: 0,
    },
    demandMalePlayers: {
      type: Number,
      default: 0,
      required: [true, '需求男性球員數為必填'],
      min: 0,
    },
    currentFemalePlayers: {
      type: Number,
      default: 0,
      required: true,
      min: 0,
    },
    currentMalePlayers: {
      type: Number,
      default: 0,
      required: true,
      min: 0,
    },
    waitingList: [
      {
        user: {
          type: Schema.Types.ObjectId,
          ref: 'users',
          required: true,
        },
        gender: {
          type: String,
          enum: ['male', 'female'],
          required: true,
        },
        joinedAt: {
          type: Date,
          default: Date.now,
          required: true,
        },
      },
    ],
    note: {
      type: String,
      trim: true,
      maxLength: [100, '備註最多 100 個字'],
    },
    isCanceled: {
      type: Boolean,
      default: false,
    },
    qrCodeGenerated: {
      type: Boolean,
      default: false,
    },
    qrCodeNotificationSent: {
      type: Boolean,
      default: false,
    },
    qrCodeToken: {
      type: String,
      unique: true,
      sparse: true,
    },
    // 是否已結算出席
    attendanceFinalized: {
      type: Boolean,
      default: false,
    },
    socialNotificationSent: {
      type: Boolean,
      default: false,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  },
)

export default model('socials', socialSchema)
