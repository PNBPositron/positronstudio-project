import { createFileRoute } from "@tanstack/react-router";

const mcpUnavailable = () =>
  new Response(JSON.stringify({ error: "MCP is not available on this deployment" }), {
    status: 501,
    headers: { "content-type": "application/json" },
  });

export const Route = createFileRoute("/mcp")({
  server: {
    handlers: { ANY: mcpUnavailable },
  },
});
