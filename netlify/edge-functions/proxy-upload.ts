import type { Config, Context } from "@netlify/edge-functions";

const ALLOWED_ORIGINS = [
  "https://celebrated-selkie-3cbc3b.netlify.app",
  "http://localhost:3000",
  "http://localhost:8888",
];

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : "";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "PUT, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, X-Upload-Url, Content-Range, X-Goog-Upload-Command, X-Goog-Upload-Offset",
  };
}

function isAllowedUploadUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === "generativelanguage.googleapis.com" &&
      parsed.pathname.startsWith("/upload/")
    );
  } catch {
    return false;
  }
}

export default async (request: Request, context: Context) => {
  const corsHeaders = getCorsHeaders(request);

  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  if (request.method !== "PUT") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    const uploadUrl = request.headers.get("X-Upload-Url");
    if (!uploadUrl || !isAllowedUploadUrl(uploadUrl)) {
      return new Response(
        JSON.stringify({ error: "Invalid upload URL" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Prepare headers for Google
    const googleHeaders = new Headers();
    googleHeaders.set(
      "Content-Length",
      request.headers.get("Content-Length") || "0"
    );
    googleHeaders.set(
      "Content-Range",
      request.headers.get("Content-Range") || ""
    );
    googleHeaders.set(
      "X-Goog-Upload-Command",
      request.headers.get("X-Goog-Upload-Command") || "upload, finalize"
    );
    googleHeaders.set(
      "X-Goog-Upload-Offset",
      request.headers.get("X-Goog-Upload-Offset") || "0"
    );

    // Forward the request to Google, streaming the body
    const googleResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: googleHeaders,
      body: request.body,
    });

    // Return the response from Google with CORS headers
    const responseHeaders = new Headers(googleResponse.headers);
    for (const [key, value] of Object.entries(corsHeaders)) {
      responseHeaders.set(key, value);
    }

    return new Response(googleResponse.body, {
      status: googleResponse.status,
      statusText: googleResponse.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("[proxy-upload] Error:", error);
    return new Response(
      JSON.stringify({
        error: "Upload proxy error. Please try again.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

export const config: Config = {
  path: "/proxy-upload",
  rateLimit: {
    windowLimit: 100,
    windowSize: 60,
    aggregateBy: ["ip", "domain"],
  },
};
