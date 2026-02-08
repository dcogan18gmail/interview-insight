import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from 'docx';
import { TranscriptSegment } from '@/types';

export type DocxVariant = 'english' | 'original' | 'combined';

export const formatTimestamp = (seconds?: number): string => {
  if (seconds === undefined) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const generateDocxBlob = async (
  transcript: TranscriptSegment[],
  variant: DocxVariant
): Promise<Blob> => {
  const children = [];

  // Title
  children.push(
    new Paragraph({
      text: `Interview Transcript - ${variant.charAt(0).toUpperCase() + variant.slice(1)}`,
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  // Content
  transcript.forEach((t) => {
    const timestamp = formatTimestamp(t.timestamp);

    // Speaker + Timestamp Header
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `[${timestamp}] ${t.speaker}`,
            bold: true,
            size: 24, // 12pt
          }),
        ],
        spacing: { before: 200, after: 50 },
      })
    );

    // Text Body
    if (variant === 'english') {
      children.push(new Paragraph({ text: t.englishText }));
    } else if (variant === 'original') {
      children.push(new Paragraph({ text: t.originalText }));
    } else if (variant === 'combined') {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'English: ', bold: true }),
            new TextRun({ text: t.englishText }),
          ],
        })
      );
      // Only add original if different
      if (t.originalText !== t.englishText) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: 'Original: ', bold: true, italics: true }),
              new TextRun({ text: t.originalText, italics: true }),
            ],
            spacing: { after: 100 },
          })
        );
      }
    }
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: children,
      },
    ],
  });

  return await Packer.toBlob(doc);
};

export const saveBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const element = document.createElement('a');
  element.href = url;
  element.download = filename;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
  URL.revokeObjectURL(url);
};
