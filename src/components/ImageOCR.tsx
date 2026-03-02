/**
 * ImageOCR – Tesseract.js-powered OCR component
 * Extracts text from uploaded images (book covers, notes, etc.)
 */
import React, { useState, useRef } from "react";
import { Upload, Loader2 } from "lucide-react";

interface Props {
  onResult: (text: string) => void;
}

const ImageOCR: React.FC<Props> = ({ onResult }) => {
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [working, setWorking] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = (file?: File) => {
    (async () => {
      const f = file || inputRef.current?.files?.[0];
      if (!f) return;

      // Validate file type and size
      if (!f.type.startsWith("image/")) return;
      if (f.size > 10 * 1024 * 1024) return; // 10MB max for OCR

      const url = URL.createObjectURL(f);
      setFilePreview(url);
      setProgress(0);
      setWorking(true);

      try {
        const mod = await import("tesseract.js");
        const { createWorker } = mod;
        const worker = await createWorker({
          logger: (m: any) => {
            if (m.status === "recognizing text" && typeof m.progress === "number") {
              setProgress(Math.round(m.progress * 100));
            }
          },
        });

        await worker.load();
        await worker.loadLanguage("eng");
        await worker.initialize("eng");
        const { data } = await worker.recognize(f);
        const text = data?.text?.trim() || "";
        onResult(text);
        await worker.terminate();
      } catch (err) {
        console.error("OCR error:", err);
        onResult("");
      } finally {
        setWorking(false);
        setProgress(0);
        if (url) URL.revokeObjectURL(url);
      }
    })();
  };

  return (
    <div className="space-y-2 mb-2">
      <div className="flex items-center gap-2">
        <button
          onClick={() => inputRef.current?.click()}
          disabled={working}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors disabled:opacity-50"
        >
          {working ? (
            <><Loader2 className="w-3 h-3 animate-spin" /> Scanning...</>
          ) : (
            <><Upload className="w-3 h-3" /> Upload Image for OCR</>
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={() => handleFile()}
          className="hidden"
        />
      </div>

      {filePreview && working && (
        <div className="flex items-center gap-2">
          <img src={filePreview} alt="preview" className="w-16 h-12 object-contain rounded-md border border-border/50" />
          <div className="flex-1">
            <div className="w-full bg-muted/40 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-primary to-secondary h-full rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{progress}% recognized</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageOCR;
