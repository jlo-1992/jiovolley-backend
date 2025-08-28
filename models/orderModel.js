import { Schema, model } from 'mongoose'

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

const orderSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'users',
      required: [true, '使用者 ID 必填'],
    },
    cart: {
      type: [cartSchema],
    },
    totalPrice: {
      type: Number,
      required: true,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  },
)

export default model('orders', orderSchema)
