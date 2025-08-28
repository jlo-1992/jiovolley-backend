import { Schema, model } from 'mongoose'

const venueSchema = new Schema(
  {
    name: {
      type: String,
      unique: true,
      trim: true,
      required: [true, '球場名稱必填'],
      minLength: [1, '球場名稱不能為空'],
    },
    city: {
      type: String,
      required: [true, '請選擇球場所在的城市'],
      enum: {
        values: [
          '臺北市',
          '新北市',
          '基隆市',
          '桃園市',
          '臺中市',
          '臺南市',
          '高雄市',
          '宜蘭縣',
          '新竹縣',
          '新竹市',
          '苗栗縣',
          '彰化縣',
          '南投縣',
          '雲林縣',
          '嘉義縣',
          '嘉義市',
          '屏東縣',
          '花蓮縣',
          '臺東縣',
          '澎湖縣',
          '金門縣',
          '連江縣',
        ],
        message: '請選擇球場所在的城市',
      },
    },
    address: {
      type: String,
      required: [true, '球場地址必填'],
      trim: true,
      minLength: [1, '球場名稱不能為空'],
    },
    lat: {
      type: Number,
      // required: [true, '球場緯度必填'],
    },
    lng: {
      type: Number,
      // required: [true, '球場緯度必填'],
    },
    description: {
      type: String,
      required: [true, '球場敘述必填'],
      trim: true,
      minLength: [1, '球場敘述不能為空'],
      maxLength: [200, '球場敘述最多只能 200 個字'],
    },
    facilities: {
      type: [String],
      required: [true, '球場設備必須至少選擇一個項目'],
      enum: [
        '廁所',
        '更衣室',
        '置物櫃',
        '販賣機',
        '吹風機',
        '藍芽喇叭',
        '球與球車',
        '商品販賣',
        '桌椅',
        '飲水機',
        '重訓器材',
        '肌肉放鬆器材',
        '其他',
      ],
    },
    images: {
      type: [String],
      validate: {
        validator: (arr) => arr.length > 0,
        message: '必須至少上傳一張球場圖片',
      },
    },
    trafficInfo: {
      type: String,
      required: [true, '球場交通及停車資訊必填'],
      trim: true,
      minLength: [1, '球場交通及停車資訊不能為空'],
      maxLength: [200, '球場交通及停車資訊最多只能 200 個字'],
    },
    // 是否為營運狀態
    open: {
      type: Boolean,
      default: true,
      required: true,
    },
    lastUpdateBy: {
      type: Schema.Types.ObjectId,
      ref: 'users',
      required: true,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  },
)

export default model('venues', venueSchema)
