import { Handler } from '@netlify/functions';
import { GoogleAIFileManager } from '@google/genai/server';

const handler: Handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { name, size, mimeType } = JSON.parse(event.body || '{}');

        if (!name || !size || !mimeType) {
            return { statusCode: 400, body: 'Missing file metadata' };
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return { statusCode: 500, body: 'Server configuration error' };
        }

        // We need to construct a raw request to the Gemini API to get the upload URL
        // because the SDK might try to handle the upload itself.
        // However, let's try to use the SDK if possible, or fallback to fetch.
        // The GoogleAIFileManager usually handles the upload in one go.
        // To get just the resumable upload URL, we might need to do a raw fetch.

        // Protocol: Resumable upload for Google APIs
        // POST https://generativelanguage.googleapis.com/upload/v1beta/files?key=API_KEY
        // Headers: 
        //  X-Goog-Upload-Protocol: resumable
        //  X-Goog-Upload-Command: start
        //  X-Goog-Upload-Header-Content-Length: <file_size>
        //  X-Goog-Upload-Header-Content-Type: <mime_type>
        // Body: JSON metadata { file: { display_name: name } }

        const reqUrl = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`;

        const response = await fetch(reqUrl, {
            method: 'POST',
            headers: {
                'X-Goog-Upload-Protocol': 'resumable',
                'X-Goog-Upload-Command': 'start',
                'X-Goog-Upload-Header-Content-Length': size.toString(),
                'X-Goog-Upload-Header-Content-Type': mimeType,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ file: { display_name: name } }),
        });

        const uploadUrl = response.headers.get('x-goog-upload-url');
        const uploadStatus = response.headers.get('x-goog-upload-status');

        if (!uploadUrl) {
            const text = await response.text();
            console.error(`Failed to get upload URL. Status: ${response.status} ${response.statusText}. Body: ${text}`);
            return { statusCode: 500, body: `Google API Error (${response.status} ${response.statusText}): ${text}` };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ uploadUrl }),
        };

    } catch (error) {
        console.error('Error in gemini-upload function:', error);
        return { statusCode: 500, body: String(error) };
    }
};

export { handler };
