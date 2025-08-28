import { Schema, model } from 'mongoose'

const schema = new Schema(
  {
    name: {
      type: String,
      required: [true, '商品名稱必填'],
      trim: true,
      unique: true,
      minlength: [1, '商品名稱至少需要 1 個字'],
      maxlength: [50, '商品名稱最多只能 50 個字'],
    },
    price: {
      type: Number,
      required: [true, '價格必填'],
      min: [0, '價格不能為負數'],
    },
    description: {
      type: String,
      required: [true, '商品描述為必填'],
      trim: true,
      minLength: [1, '商品描述不能為空'],
      maxlength: [100, '描述最多只能 100 個字'],
    },
    category: {
      type: String,
      required: [true, '分類必選'],
      enum: {
        values: ['球衣', '球褲', '護具', '包包', '配件', '其他'],
        message: '請選擇有效的分類',
      },
    },
    sell: {
      type: Boolean,
      default: true,
      required: [true, '是否上架必填'],
    },
    images: {
      type: [String],
      validate: {
        validator: (arr) => arr.length > 0,
        message: '必須至少上傳一張商品圖片',
      },
    },
  },
  { versionKey: false, timestamps: true },
)

export default model('products', schema)
