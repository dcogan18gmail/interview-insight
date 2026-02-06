import React, { useState } from 'react';
import { TranscriptSegment } from '../types';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';

interface TranscriptViewProps {
  transcript: TranscriptSegment[];
}

const TranscriptView: React.FC<TranscriptViewProps> = ({ transcript }) => {
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  
  const formatTime = (seconds?: number) => {
    if (seconds === undefined) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const generateDocxBlob = async (type: 'english' | 'original' | 'combined'): Promise<Blob> => {
    const children = [];

    // Title
    children.push(
        new Paragraph({
            text: `Interview Transcript - ${type.charAt(0).toUpperCase() + type.slice(1)}`,
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
        })
    );

    // Content
    transcript.forEach(t => {
        const timestamp = formatTime(t.timestamp);
        
        // Speaker + Timestamp Header
        children.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: `[${timestamp}] ${t.speaker}`,
                        bold: true,
                        size: 24, // 12pt
                    })
                ],
                spacing: { before: 200, after: 50 }
            })
        );

        // Text Body
        if (type === 'english') {
            children.push(new Paragraph({ text: t.englishText }));
        } else if (type === 'original') {
            children.push(new Paragraph({ text: t.originalText }));
        } else if (type === 'combined') {
            children.push(new Paragraph({ 
                children: [
                    new TextRun({ text: "English: ", bold: true }),
                    new TextRun({ text: t.englishText }),
                ]
            }));
             // Only add original if different
            if (t.originalText !== t.englishText) {
                children.push(new Paragraph({ 
                    children: [
                        new TextRun({ text: "Original: ", bold: true, italics: true }),
                        new TextRun({ text: t.originalText, italics: true }),
                    ],
                    spacing: { after: 100 }
                }));
            }
        }
    });

    const doc = new Document({
        sections: [{
            properties: {},
            children: children,
        }],
    });

    return await Packer.toBlob(doc);
  };

  const saveBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const element = document.createElement("a");
    element.href = url;
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(url);
  };

  const handleDownload = async (type: 'english' | 'original' | 'combined' | 'all') => {
    setShowDownloadMenu(false);
    
    if (type === 'all') {
        const blobEng = await generateDocxBlob('english');
        saveBlob(blobEng, 'transcript_english.docx');
        
        const blobOrg = await generateDocxBlob('original');
        setTimeout(() => saveBlob(blobOrg, 'transcript_original.docx'), 200);
        
        const blobComb = await generateDocxBlob('combined');
        setTimeout(() => saveBlob(blobComb, 'transcript_combined.docx'), 400);
    } else {
        const blob = await generateDocxBlob(type);
        saveBlob(blob, `transcript_${type}.docx`);
    }
  };

  const handleCopy = () => {
    const text = transcript.map(t => {
      const isTranslated = t.originalText.trim().toLowerCase() !== t.englishText.trim().toLowerCase();
      return isTranslated 
        ? `[${formatTime(t.timestamp)}] ${t.speaker}:\n(Eng) ${t.englishText}\n(Org) ${t.originalText}` 
        : `[${formatTime(t.timestamp)}] ${t.speaker}: ${t.englishText}`;
    }).join('\n\n');
    
    navigator.clipboard.writeText(text);
    alert("Transcript copied to clipboard!");
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden animate-fade-in">
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center sticky top-0 z-10">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center">
          <svg className="w-5 h-5 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          Transcription Result
        </h2>
        <div className="flex gap-2 relative">
            <button 
              onClick={handleCopy}
              className="text-sm bg-white hover:bg-gray-50 text-gray-600 font-medium py-2 px-4 border border-gray-200 rounded-lg transition-colors shadow-sm flex items-center"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
              Copy
            </button>
            
            <div className="relative">
                <button 
                  onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                  className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors shadow-sm flex items-center"
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                  Download .docx
                  <svg className={`w-3 h-3 ml-2 transition-transform ${showDownloadMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </button>

                {showDownloadMenu && (
                    <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowDownloadMenu(false)}></div>
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl z-20 border border-gray-100 overflow-hidden">
                            <button onClick={() => handleDownload('english')} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors">
                                English Only
                            </button>
                            <button onClick={() => handleDownload('original')} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors">
                                Original Only
                            </button>
                            <button onClick={() => handleDownload('combined')} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors">
                                Combined
                            </button>
                            <div className="border-t border-gray-100 my-1"></div>
                            <button onClick={() => handleDownload('all')} className="w-full text-left px-4 py-2.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 transition-colors">
                                Download All (3 Files)
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
      </div>

      <div className="p-6 space-y-6 max-h-[600px] overflow-y-auto custom-scrollbar">
        {transcript.map((segment, index) => {
          // Check if original and english are different (ignoring minor whitespace/case)
          const isTranslated = segment.originalText.trim().toLowerCase() !== segment.englishText.trim().toLowerCase();
          
          return (
            <div key={index} className="flex flex-col sm:flex-row gap-2 sm:gap-4 group">
              {/* Timestamp Column */}
              <div className="flex-shrink-0 w-16 pt-1.5">
                <span className="text-xs font-mono text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                    {formatTime(segment.timestamp)}
                </span>
              </div>

              {/* Speaker Column */}
              <div className="flex-shrink-0 w-28 pt-1">
                <span className={`
                  inline-block px-2 py-1 rounded text-xs font-bold uppercase tracking-wider truncate max-w-full
                  ${segment.speaker.toLowerCase().includes('interviewer') ? 'bg-blue-100 text-blue-700' : 
                    segment.speaker.toLowerCase().includes('guest') ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}
                `}>
                  {segment.speaker}
                </span>
              </div>

              {/* Text Column */}
              <div className="flex-grow">
                {/* Primary English Text */}
                <p className="text-gray-800 leading-relaxed text-base font-medium">
                  {segment.englishText}
                </p>
                
                {/* Original Language Subtext (only if translated) */}
                {isTranslated && (
                  <div className="mt-2 pl-3 border-l-2 border-indigo-100">
                    <p className="text-gray-500 text-sm italic font-serif">
                      {segment.originalText}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 text-xs text-gray-400 text-center flex justify-between">
        <span>Generated by Gemini 3 Pro</span>
        <span>{transcript.length} segments detected</span>
      </div>
    </div>
  );
};

export default TranscriptView;