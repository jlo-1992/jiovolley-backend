import { Schema, model } from 'mongoose'
import validator from 'validator'
import bcrypt from 'bcrypt'

const cartSchema = new Schema(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'products',
      required: [true, '商品 ID 必填'],
    },
    quantity: {
      type: Number,
      required: [true, '數量必填'],
      min: [1, '數量最少為 1'],
    },
  },
  { versionKey: false },
)

const userSchema = new Schema(
  {
    line_uid: {
      type: String,
      sparse: true, // 允許為 null 的唯一值
    },
    google_uid: {
      type: String,
      sparse: true, // 允許為 null 的唯一值
    },
    email: {
      type: String,
      unique: true,
      trim: true,
      sparse: true, // 允許為 null 的唯一值
      validator: {
        validator(value) {
          // 允許空值，但如果填了要驗證格式
          return !value || validator.isEmail(value)
        },
        message: '請輸入有效的電子郵件地址',
      },
    },
    password: {
      type: String,
      minLength: [8, '密碼長度須至少 8 個字元'],
      required: function () {
        // 如果不是用 line 或 google 就必須填密碼
        return !this.line_uid && !this.google_uid
      },
    },
    loginMethod: {
      type: String,
      enum: ['Line', 'Google', 'E-mail'],
    },
    name: {
      type: String,
      // required: [true, '姓名為必填'],
      trim: true,
    },
    avatar: {
      type: String,
    },
    cart: {
      type: [cartSchema],
    },
    tokens: {
      type: [String],
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    gender: {
      // required: [true, '性別為必填'],
      type: String,
      enum: ['female', 'male', '女性', '男性'],
    },
    skillLevel: {
      // required: [true, '球技程度為必填'],
      type: String,
      enum: ['S 體保生', 'A 一般生校隊', 'B 一般生系隊', 'C 排球初階', 'D 排球初心者'],
    },
    attendanceRate: {
      type: Number,
      default: 100,
      // required: true,
    },
    attendanceTotal: {
      type: Number,
      default: 0,
      // required: true,
    },
    attendancePresent: {
      type: Number,
      default: 0,
      // required: true,
    },
    favoriteVenues: [String],
    favoriteProducts: [String],
  },
  {
    versionKey: false,
    timestamps: true,
  },
)

// postman 測試用 jSON
// {
//     "email":"helen@gmail.com",
//     "password":"12345678",
//     "skillLevel":"S 體保生",
//     "name":"Jamie",
//     "gender":"female"
// }

// ✅ 自訂驗證：至少要有 email 或 line_uid
userSchema.pre('validate', function (next) {
  if (!this.email && !this.line_uid) {
    this.invalidate('email', '請使用 LINE、Google 或創建帳號的方式登入')
    this.invalidate('line_uid', '請使用 LINE、Google 或創建帳號的方式登入')
    this.invalidate('google_uid', '請使用 LINE、Google 或創建帳號的方式登入')
  }
  next()
})

// 在保存前對密碼進行加密處理，不可以存明碼
// 盡量用 function 不要用箭頭
// next = 讓 mongoose 繼續下一步處理
// https://mongoosejs.com/docs/middleware.html#middleware
userSchema.pre('save', async function (next) {
  // this = 現在要保存的資料
  const user = this
  // 如果密碼欄位有修改，進行加密
  if (user.isModified('password')) {
    try {
      // 使用 bcrypt 加密密碼
      user.password = bcrypt.hashSync(user.password, 10)
    } catch (error) {
      next(error)
      return
    }
  }

  // 限制有效 token 數量
  if (user.isModified('tokens') && user.tokens.length > 3) {
    user.tokens.shift()
  }
  // 繼續處理
  next()
})

// req.user 轉換成 JSON 時會自動排除敏感欄位
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password // 排除 password
    delete ret.tokens // 排除 tokens
    // 排除其他不希望前端直接看到的內部欄位
    return ret
  },
})

// 虛擬的動態欄位
// 盡量用 function 不要用箭頭
// .get() 欄位資料的產生方式
userSchema.virtual('cartTotal').get(function () {
  // this = 現在要保存的資料
  const user = this
  return user.cart.reduce((total, item) => {
    return total + item.quantity
  }, 0)
})

export default model('users', userSchema)
