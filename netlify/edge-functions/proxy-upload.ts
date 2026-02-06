import { Context } from "@netlify/edge-functions";

export default async (request: Request, context: Context) => {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
        return new Response(null, {
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "PUT, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, X-Upload-Url, Content-Range, X-Goog-Upload-Command, X-Goog-Upload-Offset",
            },
        });
    }

    if (request.method !== "PUT") {
        return new Response("Method Not Allowed", { status: 405 });
    }

    try {
        const uploadUrl = request.headers.get("X-Upload-Url");
        if (!uploadUrl) {
            return new Response("Missing X-Upload-Url header", { status: 400 });
        }

        // Prepare headers for Google
        const googleHeaders = new Headers();
        googleHeaders.set("Content-Length", request.headers.get("Content-Length") || "0");
        googleHeaders.set("Content-Range", request.headers.get("Content-Range") || "");
        googleHeaders.set("X-Goog-Upload-Command", request.headers.get("X-Goog-Upload-Command") || "upload, finalize");
        googleHeaders.set("X-Goog-Upload-Offset", request.headers.get("X-Goog-Upload-Offset") || "0");

        // Forward the request to Google, streaming the body
        const googleResponse = await fetch(uploadUrl, {
            method: "PUT",
            headers: googleHeaders,
            body: request.body, // Stream the body directly
        });

        // Return the response from Google
        const responseHeaders = new Headers(googleResponse.headers);
        responseHeaders.set("Access-Control-Allow-Origin", "*"); // Add CORS to response

        return new Response(googleResponse.body, {
            status: googleResponse.status,
            statusText: googleResponse.statusText,
            headers: responseHeaders,
        });

    } catch (error) {
        return new Response(`Proxy Error: ${String(error)}`, {
            status: 500,
            headers: { "Access-Control-Allow-Origin": "*" }
        });
    }
};
