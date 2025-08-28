import passport from 'passport'
import { Strategy as OpenStreetMapStrategy } from 'passport-openstreetmap'
import dotenv from 'dotenv'

passport.use(
  new OpenStreetMapStrategy(
    {
      consumerKey: process.env.OpenStreetMap_ID,
      consumerSecret: process.env.OpenStreetMap_SECRET_KEY,
      callbackURL: 'https://d531eb852440.ngrok-free.app',
    },
    function (token, tokenSecret, profile, done) {
      // 在這裡，你可以將 token 和 tokenSecret 儲存到你的資料庫中
      // 這樣後續的 API 呼叫就不需要重新認證了
      // 我們只需要在建立球場時使用這些 token
      return done(null, { token, tokenSecret })
    },
  ),
)
