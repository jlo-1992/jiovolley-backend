import nodemailer from 'nodemailer'
import dotenv from 'dotenv'

dotenv.config()

// 建立一個 Transporter 物件
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

const sendEmail = async (to, subject, htmlContent) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: to,
    subject: subject,
    html: htmlContent,
  }

  try {
    await transporter.sendMail(mailOptions)
    console.log(`Email sent to ${to}: ${subject}`)
    return true
  } catch (error) {
    console.error(`Error sending email to ${to}:`, error)
    return false
  }
}

export { sendEmail }
