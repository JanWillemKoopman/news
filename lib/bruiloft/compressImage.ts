// Client-side compressie vóór upload (Canvas API, geen extra library) —
// zelfde techniek als de fotomuur-uploader, hier als gedeelde helper zodat
// het moodboard 'm ook kan gebruiken zonder de logica te dupliceren.
export async function compressImage(file: File, maxWidth = 1600, quality = 0.82): Promise<File> {
  // SVG/GIF (animatie) niet door canvas halen: dat verliest respectievelijk
  // vectorkwaliteit/animatie. Alleen echte raster-foto's comprimeren.
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') return file

  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      let { width, height } = img
      if (width > maxWidth) {
        height = Math.round((height / width) * maxWidth)
        width = maxWidth
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas niet beschikbaar'))
        return
      }
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Compressie mislukt'))
            return
          }
          const naam = file.name.replace(/\.[^.]+$/, '') || 'foto'
          resolve(new File([blob], `${naam}.jpg`, { type: 'image/jpeg' }))
        },
        'image/jpeg',
        quality
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Laden mislukt'))
    }
    img.src = objectUrl
  })
}
