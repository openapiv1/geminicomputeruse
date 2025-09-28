import { google } from "@ai-sdk/google";
import { streamText, UIMessage, convertToCoreMessages } from "ai";
import { killDesktop } from "@/lib/e2b/utils";
import { bashTool, computerTool } from "@/lib/e2b/tool";

// Allow streaming responses up to 30 seconds
export const maxDuration = 300;

export async function POST(req: Request) {
  const { messages, sandboxId }: { messages: UIMessage[]; sandboxId: string } =
    await req.json();
  try {
    // Hardcoded API key as requested
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "AIzaSyAs22O1qE0iTGQVMnghzrLI75E4K8H6qj4";
    process.env.E2B_API_KEY = "e2b_8a5c7099485b881be08b594be7b7574440adf09c";

    const result = streamText({
      model: google("gemini-1.5-pro"), // Using Gemini model as requested
      system:
        "You are a helpful assistant with access to a computer. " +
        "Use the computer tool to help the user with their requests. " +
        "Use the bash tool to execute commands on the computer. You can create files and folders using the bash tool. Always prefer the bash tool where it is viable for the task. " +
        "Be sure to advise the user when waiting is necessary. " +
        "If the browser opens with a setup wizard, YOU MUST IGNORE IT and move straight to the next step (e.g. input the url in the search bar). " +
        "ALWAYS start every interaction with a screenshot to see the current state of the desktop. " +
        "You must execute actions and control the sandbox directly - no simulation allowed.",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messages: convertToCoreMessages(messages) as any,
      tools: { computer: computerTool(sandboxId), bash: bashTool(sandboxId) },
    });

    // Create response stream
    return new Response(result.textStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    await killDesktop(sandboxId); // Force cleanup on error
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
