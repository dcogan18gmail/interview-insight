import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import { TranscriptSegment } from '@/types';
import { getDecryptedKey } from '@/services/cryptoService';

/**
 * Create a GoogleGenAI client using the decrypted API key from localStorage.
 * Returns a fresh instance each time (key may change between calls).
 */
const createAI = async (): Promise<GoogleGenAI> => {
  const apiKey = await getDecryptedKey();
  if (!apiKey) {
    throw new Error(
      'No API key configured. Please add your Gemini API key in Settings.'
    );
  }
  return new GoogleGenAI({ apiKey });
};

const MODEL_NAME = 'gemini-3-pro-preview';

// Helper to parse JSONL from the stream buffer
const parseBuffer = (
  buffer: string
): { segments: TranscriptSegment[]; remainingBuffer: string } => {
  const lines = buffer.split('\n');
  const remainingBuffer = lines.pop() || ''; // Keep the last partial line
  const segments: TranscriptSegment[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;
    try {
      // Clean up potential JSON formatting artifacts
      const jsonStr = trimmedLine
        .replace(/,$/, '')
        .replace(/^\[/, '')
        .replace(/\]$/, '');
      const segment: TranscriptSegment = JSON.parse(jsonStr);

      // Basic validation
      if (segment.speaker && (segment.englishText || segment.originalText)) {
        // Ensure timestamp is a number
        segment.timestamp =
          typeof segment.timestamp === 'number' ? segment.timestamp : 0;
        segments.push(segment);
      }
    } catch (_e) {
      // Ignore non-JSON lines (preambles, thoughts, code blocks)
    }
  }
  return { segments, remainingBuffer };
};

// Helper to checking overlap
const isDuplicate = (
  newSegment: TranscriptSegment,
  existingSegments: TranscriptSegment[]
): boolean => {
  if (existingSegments.length === 0) return false;

  // Check against the last 50 segments (approx 5-10 mins of conversation)
  const lookback = existingSegments.slice(-50);

  const newText = (newSegment.originalText || '').trim().toLowerCase();
  const newEnglish = (newSegment.englishText || '').trim().toLowerCase();

  // Ignore very short segments (e.g. "Yes", "No") from duplicate checks to avoid false positives
  if (newText.length < 10 && newEnglish.length < 10) return false;

  return lookback.some((existing) => {
    const existingText = (existing.originalText || '').trim().toLowerCase();
    const existingEnglish = (existing.englishText || '').trim().toLowerCase();

    // Exact match or high similarity
    return existingText === newText || existingEnglish === newEnglish;
  });
};

export const uploadFile = async (
  file: File,
  onUploadProgress: (progress: number) => void
): Promise<string> => {
  try {
    // Decrypt user's API key for BYOK
    const apiKey = await getDecryptedKey();
    if (!apiKey) {
      throw new Error(
        'No API key configured. Please add your Gemini API key in Settings.'
      );
    }

    // 1. Get Upload URL from Netlify Function (v2 path, BYOK header)
    const response = await fetch('/api/gemini-upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Gemini-Key': apiKey,
      },
      body: JSON.stringify({
        name: file.name,
        size: file.size,
        mimeType: file.type,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to initiate upload: ${errorText}`);
    }

    const { uploadUrl } = await response.json();

    // 2. Upload via Edge Function Proxy (Chunked)
    // We use 8MB chunks to satisfy Google's requirement.
    // The Edge Function streams this, so it bypasses the 6MB Netlify Function limit.
    const CHUNK_SIZE = 8 * 1024 * 1024;
    const totalBytes = file.size;
    let offset = 0;

    while (offset < totalBytes) {
      const chunk = file.slice(offset, offset + CHUNK_SIZE);
      const isLastChunk = offset + chunk.size >= totalBytes;
      const command = isLastChunk ? 'upload, finalize' : 'upload';

      const arrayBuffer = await chunk.arrayBuffer();

      // Upload to Edge Function Proxy
      const proxyResponse = await fetch('/proxy-upload', {
        method: 'PUT',
        headers: {
          'X-Upload-Url': uploadUrl,
          'Content-Range': `bytes ${offset}-${offset + chunk.size - 1}/${totalBytes}`,
          'X-Goog-Upload-Command': command,
          'X-Goog-Upload-Offset': offset.toString(),
          'Content-Type': 'application/octet-stream',
        },
        body: arrayBuffer,
      });

      if (!proxyResponse.ok) {
        const errorText = await proxyResponse.text();
        throw new Error(`Upload failed at offset ${offset}: ${errorText}`);
      }

      if (isLastChunk) {
        const responseData = await proxyResponse.json();
        return responseData.file.uri;
      }

      offset += chunk.size;
      const percentComplete = Math.round((offset / totalBytes) * 100);
      onUploadProgress(Math.min(percentComplete, 99));
    }

    throw new Error('Upload loop finished without returning URI');
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};

export const generateTranscript = async (
  fileUri: string,
  mimeType: string,
  durationSeconds: number,
  onProgress: (
    percentage: number,
    currentSegment: TranscriptSegment | null
  ) => void
): Promise<TranscriptSegment[]> => {
  const allSegments: TranscriptSegment[] = [];
  let currentStartTime = 0;
  let isComplete = false;
  let retryCount = 0;
  const MAX_RETRIES = 3;
  let loopCount = 0;
  const MAX_LOOPS = 40;

  try {
    // Create AI client once before the loop (BYOK: decrypts key from localStorage)
    const aiClient = await createAI();

    while (!isComplete && loopCount < MAX_LOOPS) {
      loopCount++;

      // HARD EXIT: If we are effectively at the end of the file, stop.
      if (durationSeconds > 0 && currentStartTime >= durationSeconds - 2) {
        console.log('[GeminiService] Reached end of file duration. Finishing.');
        isComplete = true;
        break;
      }

      // Prepare Context for "Seeking"
      const lastSegments = allSegments.slice(-5); // Increase context to last 5 segments
      const contextText = lastSegments.map((s) => s.originalText).join(' ... ');
      const isContinuation = allSegments.length > 0;

      const promptText = `
        You are a professional transcriber and translator.

        INPUT METADATA:
        - Total Duration: ${Math.round(durationSeconds)} seconds.
        ${isContinuation ? `- RESUME FROM: ${Math.round(currentStartTime)} seconds.` : ''}

        TASK:
        ${
          isContinuation
            ? `
            We are resuming transcription.
            1. Start listening at timestamp ${Math.round(currentStartTime)}.
            2. Verify context: The last spoken words were: "...${contextText.slice(-200)}"
            3. Transcribe the NEW content that follows immediately.
            `
            : `Transcribe the audio file from the beginning.`
        }

        CRITICAL INSTRUCTIONS:
        - CONTINUOUS OUTPUT: Transcribe as much as possible in a single response. Do NOT stop after a few sentences. Aim to transcribe until the end of the file or until you hit the token limit.
        - IGNORE PAUSES: Do not stop generating if there is silence. Continue transcribing until the very end of the audio file.
        - FORMAT: JSON Lines (JSONL) only.

        FORMATTING RULES:
        1. OUTPUT FORMAT: JSON Lines (JSONL). One object per line.
        2. GROUPING: Combine consecutive sentences by the same speaker into a single paragraph-sized segment.
        3. FIELDS:
           - "speaker": Identify the speaker.
           - "originalText": The exact words spoken.
           - "englishText": The English translation.
           - "timestamp": The start time of the segment in seconds (number).
        4. LANGUAGE: If non-English, provide BOTH original and English.
        5. END OF FILE: If you reach the end, stop.

        Example line:
        {"speaker": "Guest", "originalText": "Bonjour.", "englishText": "Hello.", "timestamp": 120.5}
      `;

      console.log(
        `[GeminiService] Loop ${loopCount}: Starting from approx ${currentStartTime}s`
      );

      try {
        const stream = await aiClient.models.generateContentStream({
          model: MODEL_NAME,
          contents: {
            parts: [{ fileData: { fileUri, mimeType } }, { text: promptText }],
          },
          config: {
            maxOutputTokens: 65536,
            temperature: 0.3, // Slight increase to avoid "stuck" repetitive states
          },
        });

        let buffer = '';
        let segmentsInThisChunk = 0;
        let lastSegmentInChunk: TranscriptSegment | null = null;

        for await (const chunk of stream) {
          const chunkText = (chunk as GenerateContentResponse).text || '';
          buffer += chunkText;

          const { segments, remainingBuffer } = parseBuffer(buffer);
          buffer = remainingBuffer;

          for (const segment of segments) {
            // De-duplication: Skip if this text already exists in the last few segments
            if (isContinuation && isDuplicate(segment, allSegments)) {
              continue;
            }

            // Timestamp Safety: If a segment claims to be from the distant past (e.g. start of file), ignore it
            if (
              isContinuation &&
              (segment.timestamp || 0) < currentStartTime - 30
            ) {
              continue;
            }

            allSegments.push(segment);
            lastSegmentInChunk = segment;
            segmentsInThisChunk++;

            // Progress Update
            const percentage =
              durationSeconds > 0
                ? Math.min(
                    Math.round(
                      ((segment.timestamp || 0) / durationSeconds) * 100
                    ),
                    99
                  )
                : 99;
            onProgress(percentage, segment);
          }
        }

        // Process any remaining buffer
        if (buffer.trim()) {
          try {
            const jsonStr = buffer
              .trim()
              .replace(/,$/, '')
              .replace(/^\[/, '')
              .replace(/\]$/, '');
            const segment = JSON.parse(jsonStr);
            if (!isDuplicate(segment, allSegments)) {
              allSegments.push(segment);
              lastSegmentInChunk = segment;
              segmentsInThisChunk++;
            }
          } catch (_e) {
            // Skip malformed JSON segments
          }
        }

        // --- LOOP CONTROL LOGIC ---

        if (segmentsInThisChunk === 0) {
          // Check if we are near the end. If so, this lack of data likely means "Silence / End of File".
          const remainingTime = durationSeconds - currentStartTime;
          const progressRatio =
            durationSeconds > 0 ? currentStartTime / durationSeconds : 0;

          // Strict completion check to prevent truncation
          if (remainingTime < 10 || progressRatio > 0.99) {
            console.log(
              '[GeminiService] No new segments near end of file. Assuming completion.'
            );
            isComplete = true;
            break;
          }

          // If we are in the middle of the file, this is likely an error or timeout. Retry.
          console.warn(
            '[GeminiService] No NEW segments received mid-file. Retrying...'
          );
          retryCount++;
          currentStartTime += 5; // Small nudge to get past a potential glitch, but minimize skipping

          if (retryCount > MAX_RETRIES) {
            console.error('Max retries reached with no progress.');
            break;
          }
          continue;
        } else {
          retryCount = 0; // Reset retries on success
        }

        const lastTimestamp = lastSegmentInChunk?.timestamp || 0;
        const timeLeft = durationSeconds - lastTimestamp;

        console.log(
          `[GeminiService] Chunk ended at ${lastTimestamp}s. Time remaining: ${timeLeft}s`
        );

        if (timeLeft < 10) {
          isComplete = true;
        } else {
          // Update start time for next loop
          currentStartTime = lastTimestamp;
        }
      } catch (innerError) {
        console.error('Error in chunk generation:', innerError);
        retryCount++;
        if (retryCount > MAX_RETRIES) throw innerError;
      }
    }

    // Final 100% update
    if (allSegments.length > 0) {
      const lastSegment = allSegments[allSegments.length - 1];
      if (lastSegment) {
        onProgress(100, lastSegment);
      }
    }
    return allSegments;
  } catch (error) {
    console.error('Gemini Transcription Fatal Error:', error);
    throw error;
  }
};
