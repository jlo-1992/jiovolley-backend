import QRCode from 'qrcode'

const generateQrCodeDataUrl = async (data) => {
  try {
    // data 是簽到 URL
    const qrCodeDataUrl = await QRCode.toDataURL(data)
    // 返回 Data URL 字符串，可以直接在前端 <img> 標籤中使用
    return qrCodeDataUrl
  } catch (err) {
    console.error('Error generating QR Code:', err)
    throw new Error('無法生成 QR Code')
  }
}

export { generateQrCodeDataUrl }
