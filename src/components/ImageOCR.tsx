import React, { useState, useRef } from "react";

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

        // Demo: we can store OCR result to localStorage if desired (disabled by default)

        await worker.terminate();
      } catch (err) {
        onResult("");
      } finally {
        setWorking(false);
        setProgress(0);
      }
    })();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={() => handleFile()}
          className="text-xs sm:text-sm"
        />
        <button
          onClick={() => handleFile()}
          disabled={working}
          className="px-2 py-1 rounded bg-primary/10 text-primary text-xs"
        >
          {working ? "Scanning..." : "Scan Image"}
        </button>
      </div>

      {filePreview && (
        <div className="flex items-center gap-2">
          <img src={filePreview} alt="preview" className="w-28 h-20 object-contain rounded-md border" />
          <div className="flex-1 text-xs">
            {working ? (
              <div>
                <div className="w-full bg-muted/40 h-2 rounded mb-1">
                  <div className="bg-primary h-2 rounded" style={{ width: `${progress}%` }} />
                </div>
                <div className="text-muted-foreground">Progress: {progress}%</div>
              </div>
            ) : (
              <div className="text-muted-foreground">Ready. Click "Scan Image" to run OCR.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageOCR;
