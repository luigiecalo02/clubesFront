export type CropFrame = {
  offsetX: number
  offsetY: number
  zoom: number
  viewportWidth: number
  viewportHeight: number
}

export type PreparedCropImage = {
  bitmap: ImageBitmap
  previewUrl: string
  width: number
  height: number
}

export type OptimizeImageOptions = {
  outputWidth: number
  mime: string
  quality: number
  maxBytes: number
  fileName: string
}

const EDITOR_MAX_EDGE = 2400

export function coverScale(
  imageWidth: number,
  imageHeight: number,
  viewportWidth: number,
  viewportHeight: number,
): number {
  if (imageWidth <= 0 || imageHeight <= 0 || viewportWidth <= 0 || viewportHeight <= 0) return 1
  return Math.max(viewportWidth / imageWidth, viewportHeight / imageHeight)
}

export function containZoom(
  imageWidth: number,
  imageHeight: number,
  viewportWidth: number,
  viewportHeight: number,
): number {
  if (imageWidth <= 0 || imageHeight <= 0 || viewportWidth <= 0 || viewportHeight <= 0) return 1
  const cover = coverScale(imageWidth, imageHeight, viewportWidth, viewportHeight)
  const contain = Math.min(viewportWidth / imageWidth, viewportHeight / imageHeight)
  return Math.min(1, contain / cover)
}

export function displayedSize(
  imageWidth: number,
  imageHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  zoom: number,
): { width: number; height: number } {
  const scale = coverScale(imageWidth, imageHeight, viewportWidth, viewportHeight) * zoom
  return {
    width: imageWidth * scale,
    height: imageHeight * scale,
  }
}

export function clampOffset(
  offsetX: number,
  offsetY: number,
  displayWidth: number,
  displayHeight: number,
  viewportWidth: number,
  viewportHeight: number,
): { x: number; y: number } {
  const maxX = Math.max(0, (displayWidth - viewportWidth) / 2)
  const maxY = Math.max(0, (displayHeight - viewportHeight) / 2)
  return {
    x: Math.min(maxX, Math.max(-maxX, offsetX)),
    y: Math.min(maxY, Math.max(-maxY, offsetY)),
  }
}

export async function prepareImageForCrop(file: File): Promise<PreparedCropImage> {
  const decoded = await decodeOrientedImage(file)
  const scale = Math.min(1, EDITOR_MAX_EDGE / Math.max(decoded.width, decoded.height))
  const width = Math.max(1, Math.round(decoded.width * scale))
  const height = Math.max(1, Math.round(decoded.height * scale))
  const bitmap = scale === 1 ? decoded : await resizeBitmap(decoded, width, height)
  if (scale !== 1) decoded.close()
  try {
    const previewUrl = await bitmapToPreviewUrl(bitmap)
    return { bitmap, previewUrl, width: bitmap.width, height: bitmap.height }
  } catch (error) {
    bitmap.close()
    throw error
  }
}

export function releasePreparedImage(prepared: PreparedCropImage | null) {
  if (!prepared) return
  try {
    prepared.bitmap.close()
  } catch {
    /* ya estaba cerrada */
  }
  URL.revokeObjectURL(prepared.previewUrl)
}

export async function cropAndOptimize(
  bitmap: ImageBitmap,
  frame: CropFrame,
  options: OptimizeImageOptions,
): Promise<File> {
  const { width: displayWidth, height: displayHeight } = displayedSize(
    bitmap.width,
    bitmap.height,
    frame.viewportWidth,
    frame.viewportHeight,
    frame.zoom,
  )
  const imageLeft = (frame.viewportWidth - displayWidth) / 2 + frame.offsetX
  const imageTop = (frame.viewportHeight - displayHeight) / 2 + frame.offsetY
  const visLeft = Math.max(0, imageLeft)
  const visTop = Math.max(0, imageTop)
  const visRight = Math.min(frame.viewportWidth, imageLeft + displayWidth)
  const visBottom = Math.min(frame.viewportHeight, imageTop + displayHeight)
  const visibleW = visRight - visLeft
  const visibleH = visBottom - visTop
  if (visibleW <= 1 || visibleH <= 1) {
    throw new Error('No se pudo recortar la imagen.')
  }

  const sourceX = Math.min(bitmap.width, Math.max(0, ((visLeft - imageLeft) / displayWidth) * bitmap.width))
  const sourceY = Math.min(bitmap.height, Math.max(0, ((visTop - imageTop) / displayHeight) * bitmap.height))
  const sourceW = Math.min(bitmap.width - sourceX, Math.max(1, (visibleW / displayWidth) * bitmap.width))
  const sourceH = Math.min(bitmap.height - sourceY, Math.max(1, (visibleH / displayHeight) * bitmap.height))
  const outputHeight = Math.max(1, Math.round(options.outputWidth * (frame.viewportHeight / frame.viewportWidth)))

  const canvas = document.createElement('canvas')
  canvas.width = options.outputWidth
  canvas.height = outputHeight
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('No se pudo recortar la imagen.')
  }
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.clearRect(0, 0, canvas.width, canvas.height)
  try {
    context.drawImage(
      bitmap,
      sourceX,
      sourceY,
      sourceW,
      sourceH,
      (visLeft / frame.viewportWidth) * canvas.width,
      (visTop / frame.viewportHeight) * canvas.height,
      (visibleW / frame.viewportWidth) * canvas.width,
      (visibleH / frame.viewportHeight) * canvas.height,
    )
  } catch {
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  }

  return encodeOptimizedCanvas(canvas, options)
}

async function decodeOrientedImage(file: File): Promise<ImageBitmap> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      try {
        return await createImageBitmap(file)
      } catch {
        /* fallback below */
      }
    }
  }
  return decodeWithHtmlImage(file)
}

function decodeWithHtmlImage(file: File): Promise<ImageBitmap> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      const finish = (bitmap: ImageBitmap) => {
        URL.revokeObjectURL(url)
        resolve(bitmap)
      }
      if (typeof createImageBitmap === 'function') {
        void createImageBitmap(image).then(finish).catch(() => {
          URL.revokeObjectURL(url)
          reject(new Error('No se pudo leer la imagen.'))
        })
        return
      }
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo leer la imagen.'))
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo leer la imagen.'))
    }
    image.src = url
  })
}

async function resizeBitmap(bitmap: ImageBitmap, width: number, height: number): Promise<ImageBitmap> {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('No se pudo leer la imagen.')
  }
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(bitmap, 0, 0, width, height)
  return createImageBitmap(canvas)
}

async function bitmapToPreviewUrl(bitmap: ImageBitmap): Promise<string> {
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('No se pudo leer la imagen.')
  }
  context.drawImage(bitmap, 0, 0)
  const blob =
    (await canvasToBlob(canvas, 'image/webp', 0.9)) ?? (await canvasToBlob(canvas, 'image/jpeg', 0.9))
  if (!blob) {
    throw new Error('No se pudo leer la imagen.')
  }
  return URL.createObjectURL(blob)
}

async function encodeOptimizedCanvas(canvas: HTMLCanvasElement, options: OptimizeImageOptions): Promise<File> {
  const mimes =
    options.mime === 'image/png' ? ['image/png'] : uniqueMimes([options.mime, 'image/webp', 'image/jpeg'])
  let best: { blob: Blob; mime: string } | null = null

  for (const mime of mimes) {
    let quality = options.quality
    let blob = await canvasToBlob(canvas, mime, quality)
    if (!blob) continue
    while (blob.size > options.maxBytes && quality > 0.45) {
      quality = Math.max(0.45, quality - 0.08)
      const next = await canvasToBlob(canvas, mime, quality)
      if (!next) break
      blob = next
    }
    if (!best || blob.size < best.blob.size) {
      best = { blob, mime }
    }
  }

  if (!best) {
    throw new Error('No se pudo optimizar la imagen.')
  }

  const base = options.fileName.replace(/\.[^.]+$/, '') || 'imagen'
  return new File([best.blob], `${base}.${extensionForMime(best.mime)}`, { type: best.mime })
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mime, quality)
  })
}

function uniqueMimes(mimes: string[]): string[] {
  return [...new Set(mimes.filter(Boolean))]
}

function extensionForMime(mime: string): string {
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  return 'jpg'
}
