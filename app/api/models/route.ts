import { getAvailableModels } from "@/lib/ai/openrouter-models"

export async function GET() {
  return Response.json(await getAvailableModels(), {
    headers: { "Cache-Control": "no-store" },
  })
}
