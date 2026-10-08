import { createAndDispatchVideo } from './colab-video'

export function registerVideoGenerationTool(ctx: any): () => void {
  if (!ctx?.tools?.register)
    return () => {}

  const tool = {
    name: 'generate_video',
    description: 'Create a video job with Ari video engine on Colab. The tool returns a job identifier quickly; generation continues asynchronously and the chat UI tracks progress.',
    timeoutMs: 90000,
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['prompt'],
      properties: {
        prompt: { type: 'string', description: 'Description of the video to generate.' },
        title: { type: 'string', description: 'Optional short title.' },
        duration_seconds: { type: 'integer', minimum: 5, maximum: 3600, description: 'Target duration in seconds.' },
        type: { type: 'string', description: 'Optional style/preset, for example cinematic, documentary, historical or trailer.' },
        seed: { type: 'integer', description: 'Optional deterministic seed.' },
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['jobId', 'status'],
        properties: {
          jobId: { type: 'string' },
          status: { type: 'string' },
          progress: { type: 'number' },
          currentPhase: { type: 'string' },
          completedShots: { type: 'integer' },
          totalShots: { type: 'integer' },
        },
      },
      render(_args: any, value: any) {
        return [{ type: 'text', text: `Video job ${value.jobId} started. Status: ${value.status}.` }]
      },
      presentationMeta(_args: any, value: any) {
        return { ariVideoJob: value }
      },
    },
    async execute(args: any) {
      const result = await createAndDispatchVideo({
        prompt: String(args.prompt || ''),
        title: typeof args.title === 'string' ? args.title : undefined,
        durationSeconds: args.duration_seconds,
        type: typeof args.type === 'string' ? args.type : undefined,
        seed: args.seed,
      })
      if (!result.ok || !result.localJobId)
        throw new Error(result.error || 'video_generation_failed')
      return {
        jobId: result.localJobId,
        status: result.status || 'submitted',
        progress: Number(result.progress || 0),
        currentPhase: result.currentPhase || 'waiting_worker',
        completedShots: Math.trunc(Number(result.completedShots || 0)),
        totalShots: Math.trunc(Number(result.totalShots || 0)),
      }
    },
  } as any

  return ctx.tools.register(tool)
}