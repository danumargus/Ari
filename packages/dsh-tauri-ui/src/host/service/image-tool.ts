import { generateCloudflareImage } from './cloudflare-image'

const IMAGE_MEDIA_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])

export function registerImageGenerationTool(ctx: any): () => void {
  if (!ctx?.tools?.register)
    return () => {}

  const tool = {
    name: 'generate_image',
    description: 'Generate an image from a text description using Ari visual engine. Use when the user asks to create, draw, render or generate an image.',
    timeoutMs: 260000,
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['prompt'],
      properties: {
        prompt: { type: 'string', description: 'Detailed description of the image to generate.' },
        width: { type: 'integer', description: 'Image width in pixels, normally 512, 768 or 1024.' },
        height: { type: 'integer', description: 'Image height in pixels, normally 512, 768 or 1024.' },
        seed: { type: 'integer', description: 'Optional deterministic seed.' },
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['provider', 'model', 'attachment'],
        properties: {
          provider: { type: 'string' },
          model: { type: 'string' },
          attachment: { type: 'object', additionalProperties: true },
        },
      },
      render(_args: any, value: any) {
        return [
          { type: 'image', attachment: value.attachment },
          { type: 'text', text: `Image generated with ${value.provider} (${value.model}).` },
        ]
      },
    },
    async execute(args: any, exec: any) {
      const result = await generateCloudflareImage({
        prompt: String(args.prompt || ''),
        width: args.width,
        height: args.height,
        seed: args.seed,
      })
      if (!result.ok || !result.imageBase64)
        throw new Error(result.error || 'image_generation_failed')

      const mediaType = IMAGE_MEDIA_TYPES.has(String(result.mimeType)) ? String(result.mimeType) : 'image/png'
      const attachments = ctx.get?.('attachments') ?? ctx.attachments
      if (!attachments?.saveImage)
        throw new Error('attachment_store_unavailable')

      exec?.signal?.throwIfAborted?.()
      const bytes = Buffer.from(result.imageBase64, 'base64')
      const attachment = await attachments.saveImage({
        data: bytes,
        mediaType,
        name: `ari-${Date.now()}.${mediaType === 'image/jpeg' ? 'jpg' : mediaType.split('/')[1]}`,
      })
      exec?.signal?.throwIfAborted?.()
      return { provider: result.provider, model: result.model, attachment }
    },
  } as any

  return ctx.tools.register(tool)
}