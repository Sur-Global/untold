import { google } from '@ai-sdk/google'
import { convertToModelMessages, streamText } from 'ai'
import {
  aiDocumentFormats,
  injectDocumentStateMessages,
  toolDefinitionsToToolSet,
} from '@blocknote/xl-ai/server'

export const maxDuration = 30

// Extend the base prompt to prevent Gemini from generating columnList/column
// HTML nodes that xl-multi-column cannot reconstruct, causing ProseMirror errors.
const SYSTEM_PROMPT =
  aiDocumentFormats.html.systemPrompt +
  '\nIMPORTANT: Never output HTML with data-node-type="columnList" or data-node-type="column". Do not create multi-column layouts.'

export async function POST(req: Request) {
  const { messages, toolDefinitions } = await req.json()

  // BlockNote recommends toolChoice 'auto' for google.generative-ai
  // (see PROVIDER_OVERRIDES in @blocknote/xl-ai ClientSideTransport)
  const result = streamText({
    model: google('gemini-2.5-flash'),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(
      injectDocumentStateMessages(messages),
    ),
    tools: toolDefinitionsToToolSet(toolDefinitions),
    toolChoice: 'auto',
  })

  return result.toUIMessageStreamResponse()
}
