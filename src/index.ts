import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export class McQueenMCP extends McpAgent {
  server = new McpServer({
    name: "mcp-ts-demo-cf",
    version: "1.0.0",
  });

  async init() {
    this.server.tool("turnLightsOn", () => {
      return {
        content: [
          {
            type: "text",
            text: "Lights are on",
          },
        ],
      };
    });

    this.server.tool("turnLightsOff", () => {
      return {
        content: [
          {
            type: "text",
            text: "Lights are off",
          },
        ],
      };
    });

    const driveArgs = z.object({
      direction: z.enum(["left", "right", "forward", "backward"]),
      speed: z.number().min(0).max(100),
    });

    /*
	Instead of passing the driveArgs Zod object directly as the schema, we now pass driveArgs.shape.
  This provides the raw schema definition that the @modelcontextprotocol/sdk expects,
	*/
    this.server.tool("drive", driveArgs.shape, async (args) => {
      return {
        content: [
          {
            type: "text",
            text: `McQueen is driving ${args.direction} at speed ${args.speed}`,
          },
        ],
      };
    });
  }
}

export default {
  /*
  Primary function that Cloudflare Workers use to process HTTP request.
  It handles server send event and the http streaming.
  In summary, this worker acts as a router, directing requests to /sse (and /sse/message)
  to an SSE handler and requests to /mcp to an MCP handler, both managed by McQueenMCP.
  All other requests receive a 404 error.
*/
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (url.pathname === "/sse" || url.pathname === "/sse/message") {
      // @ts-ignore
      return McQueenMCP.serveSSE("/sse").fetch(request, env, ctx);
    }

    if (url.pathname === "/mcp") {
      // @ts-ignore
      return McQueenMCP.serve("/mcp").fetch(request, env, ctx);
    }

    return new Response("Not found", { status: 404 });
  },
};
