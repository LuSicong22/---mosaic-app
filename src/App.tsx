import React, { useState, useRef, useEffect } from "react";
import "./App.css";

interface HistoryState {
  canvas: string;
  timestamp: number;
}

function App() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [blurAmount, setBlurAmount] = useState<number>(50);
  const blurAmountRef = useRef<number>(50);
  useEffect(() => {
    blurAmountRef.current = blurAmount;
  }, [blurAmount]);
  // Mirror history and index in refs to avoid stale closures when rapidly saving states
  const historyRef = useRef<HistoryState[]>([]);
  const historyIndexRef = useRef<number>(-1);
  useEffect(() => {
    historyRef.current = history;
  }, [history]);
  useEffect(() => {
    historyIndexRef.current = historyIndex;
  }, [historyIndex]);
  // Install prompt disabled

  const isSelectingRef = useRef(false);
  const [selectionRect, setSelectionRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Selection tracking refs
  const selectionStartClientRef = useRef<{ x: number; y: number } | null>(null);
  const selectionStartCanvasRef = useRef<{ x: number; y: number } | null>(null);
  const selectionCurrentCanvasRef = useRef<{ x: number; y: number } | null>(
    null
  );

  // PWA install prompt intentionally disabled

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctxRef.current = ctx;

        // Set canvas size
        const containerWidth = canvas.parentElement?.clientWidth || 800;
        const containerHeight = 600;

        canvas.width = containerWidth - 40; // Account for padding
        canvas.height = containerHeight;

        // Set canvas style
        canvas.style.width = "100%";
        canvas.style.height = "auto";

        // Set up selection event listeners
        setupSelectionEvents(canvas, ctx);
      }
    }
  }, []);

  const setupSelectionEvents = (
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D
  ) => {
    const getClientPosition = (e: MouseEvent | TouchEvent) => {
      if (e instanceof MouseEvent) {
        return { clientX: e.clientX, clientY: e.clientY };
      }
      return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
    };

    const startSelecting = (e: MouseEvent | TouchEvent) => {
      const { clientX, clientY } = getClientPosition(e);
      const rect = canvas.getBoundingClientRect();
      const containerRect = canvas.parentElement?.getBoundingClientRect();
      const xClient = clientX - rect.left;
      const yClient = clientY - rect.top;
      const xDisplay = clientX - (containerRect?.left || 0);
      const yDisplay = clientY - (containerRect?.top || 0);

      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const xCanvas = xClient * scaleX;
      const yCanvas = yClient * scaleY;

      selectionStartClientRef.current = { x: xDisplay, y: yDisplay };
      selectionStartCanvasRef.current = { x: xCanvas, y: yCanvas };
      selectionCurrentCanvasRef.current = { x: xCanvas, y: yCanvas };
      setSelectionRect({ x: xDisplay, y: yDisplay, width: 0, height: 0 });
      isSelectingRef.current = true;

      // Track moves globally to keep selection even if cursor leaves canvas
      window.addEventListener("mousemove", updateSelection as any);
      window.addEventListener("mouseup", finishSelecting);
    };

    let moveRafId: number | null = null;
    const updateSelection = (e: MouseEvent | TouchEvent) => {
      if (!isSelectingRef.current || !selectionStartClientRef.current) return;
      if (moveRafId) cancelAnimationFrame(moveRafId);
      moveRafId = requestAnimationFrame(() => {
        const { clientX, clientY } = getClientPosition(e);
        const rect = canvas.getBoundingClientRect();
        const containerRect = canvas.parentElement?.getBoundingClientRect();
        const xClient = clientX - rect.left;
        const yClient = clientY - rect.top;
        const xDisplay = clientX - (containerRect?.left || 0);
        const yDisplay = clientY - (containerRect?.top || 0);

        const startClient = selectionStartClientRef.current!;
        const left = Math.min(startClient.x, xDisplay);
        const top = Math.min(startClient.y, yDisplay);
        const width = Math.abs(xDisplay - startClient.x);
        const height = Math.abs(yDisplay - startClient.y);
        setSelectionRect({ x: left, y: top, width, height });

        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        selectionCurrentCanvasRef.current = {
          x: xClient * scaleX,
          y: yClient * scaleY,
        };
      });
    };

    const finishSelecting = () => {
      // Stop global tracking
      window.removeEventListener("mousemove", updateSelection as any);
      window.removeEventListener("mouseup", finishSelecting);
      if (
        !isSelectingRef.current ||
        !selectionStartCanvasRef.current ||
        !selectionCurrentCanvasRef.current
      ) {
        isSelectingRef.current = false;
        setSelectionRect(null);
        return;
      }

      const start = selectionStartCanvasRef.current;
      const end = selectionCurrentCanvasRef.current;

      const left = Math.floor(Math.min(start.x, end.x));
      const top = Math.floor(Math.min(start.y, end.y));
      const width = Math.floor(Math.abs(end.x - start.x));
      const height = Math.floor(Math.abs(end.y - start.y));

      isSelectingRef.current = false;
      setSelectionRect(null);
      selectionStartClientRef.current = null;
      selectionStartCanvasRef.current = null;
      selectionCurrentCanvasRef.current = null;

      if (width < 2 || height < 2) return;

      // Clamp to canvas bounds
      const clampedLeft = Math.max(0, Math.min(left, canvas.width - 1));
      const clampedTop = Math.max(0, Math.min(top, canvas.height - 1));
      const clampedWidth = Math.max(
        1,
        Math.min(width, canvas.width - clampedLeft)
      );
      const clampedHeight = Math.max(
        1,
        Math.min(height, canvas.height - clampedTop)
      );

      applyBlurToRect(
        ctx,
        clampedLeft,
        clampedTop,
        clampedWidth,
        clampedHeight
      );
      saveToHistory();
    };

    // Mouse events
    canvas.addEventListener("mousedown", startSelecting as any);
    canvas.addEventListener("mousemove", updateSelection as any);
    canvas.addEventListener("mouseup", finishSelecting);
    canvas.addEventListener("mouseleave", finishSelecting);

    // Touch events
    canvas.addEventListener(
      "touchstart",
      startSelecting as any,
      { passive: true } as any
    );
    canvas.addEventListener(
      "touchmove",
      updateSelection as any,
      { passive: true } as any
    );
    canvas.addEventListener("touchend", finishSelecting);
  };

  // Install flow removed

  const saveToHistory = () => {
    if (canvasRef.current) {
      const dataURL = canvasRef.current.toDataURL();
      const currentHistory = historyRef.current;
      const currentIndex = historyIndexRef.current;
      const sliced = currentHistory.slice(0, currentIndex + 1);
      sliced.push({ canvas: dataURL, timestamp: Date.now() });

      // Keep only last 20 states
      if (sliced.length > 20) {
        sliced.shift();
      }

      setHistory(sliced);
      setHistoryIndex(sliced.length - 1);
    }
  };

  const undo = () => {
    console.log(
      "Undo called, historyIndex:",
      historyIndex,
      "history length:",
      history.length
    );
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      console.log("Undoing to index:", newIndex);
      setHistoryIndex(newIndex);
      loadCanvasFromHistory(newIndex);
    } else {
      console.log("Cannot undo - already at beginning");
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      loadCanvasFromHistory(newIndex);
    }
  };

  const loadCanvasFromHistory = (index: number) => {
    console.log("Loading canvas from history index:", index);
    if (canvasRef.current && history[index]) {
      const img = new Image();
      img.onload = () => {
        if (ctxRef.current && canvasRef.current) {
          const canvas = canvasRef.current;
          const ctx = ctxRef.current;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          console.log("Canvas restored from history");
        }
      };
      img.src = history[index].canvas;
    } else {
      console.log("Cannot load canvas - missing ref or history item");
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && canvasRef.current && ctxRef.current) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target?.result as string;
        setImageUrl(url);

        const img = new Image();
        img.onload = () => {
          if (ctxRef.current && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = ctxRef.current;

            // Reset history so undo doesn't jump to a previous image
            historyRef.current = [];
            historyIndexRef.current = -1;
            setHistory([]);
            setHistoryIndex(-1);

            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Calculate scaling to fit image in canvas
            const scaleX = canvas.width / img.width;
            const scaleY = canvas.height / img.height;
            const scale = Math.min(scaleX, scaleY);

            // Calculate position to center image
            const x = (canvas.width - img.width * scale) / 2;
            const y = (canvas.height - img.height * scale) / 2;

            // Draw image
            ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

            // Store reference to image for later use
            imageRef.current = img;

            saveToHistory();
          }
        };
        img.src = url;
      };
      reader.readAsDataURL(file);
    }
  };

  const applyBlurToRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ) => {
    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d");
    if (!tempCtx) return;

    tempCanvas.width = width;
    tempCanvas.height = height;

    const imageData = ctx.getImageData(x, y, width, height);
    tempCtx.putImageData(imageData, 0, 0);

    const effectiveRadius = mapStrengthToRadius(blurAmountRef.current);
    if (effectiveRadius > 0) {
      applyBlur(tempCtx, effectiveRadius);
    }

    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(tempCanvas, x, y);
    ctx.globalCompositeOperation = "source-over";
  };
  const mapStrengthToRadius = (strength: number): number => {
    const clamped = Math.max(0, Math.min(100, Math.floor(strength)));
    return Math.round(5 + ((40 - 5) * clamped) / 100);
  };

  const applyBlur = (ctx: CanvasRenderingContext2D, radius: number) => {
    // Simple box blur implementation
    const imageData = ctx.getImageData(
      0,
      0,
      ctx.canvas.width,
      ctx.canvas.height
    );
    const data = imageData.data;
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;

    // Horizontal blur
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0,
          g = 0,
          b = 0,
          a = 0,
          count = 0;

        for (let i = -radius; i <= radius; i++) {
          const px = Math.max(0, Math.min(width - 1, x + i));
          const idx = (y * width + px) * 4;
          r += data[idx];
          g += data[idx + 1];
          b += data[idx + 2];
          a += data[idx + 3];
          count++;
        }

        const idx = (y * width + x) * 4;
        data[idx] = r / count;
        data[idx + 1] = g / count;
        data[idx + 2] = b / count;
        data[idx + 3] = a / count;
      }
    }

    // Vertical blur
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        let r = 0,
          g = 0,
          b = 0,
          a = 0,
          count = 0;

        for (let i = -radius; i <= radius; i++) {
          const py = Math.max(0, Math.min(height - 1, y + i));
          const idx = (py * width + x) * 4;
          r += data[idx];
          g += data[idx + 1];
          b += data[idx + 2];
          a += data[idx + 3];
          count++;
        }

        const idx = (y * width + x) * 4;
        data[idx] = r / count;
        data[idx + 1] = g / count;
        data[idx + 2] = b / count;
        data[idx + 3] = a / count;
      }
    }

    ctx.putImageData(imageData, 0, 0);
  };

  const clearCanvas = () => {
    if (canvasRef.current && ctxRef.current && imageRef.current) {
      const canvas = canvasRef.current;
      const ctx = ctxRef.current;
      const img = imageRef.current;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Redraw original image
      const scaleX = canvas.width / img.width;
      const scaleY = canvas.height / img.height;
      const scale = Math.min(scaleX, scaleY);

      const x = (canvas.width - img.width * scale) / 2;
      const y = (canvas.height - img.height * scale) / 2;

      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

      saveToHistory();
    }
  };

  const saveImage = () => {
    if (canvasRef.current) {
      const dataURL = canvasRef.current.toDataURL("image/png");

      const link = document.createElement("a");
      link.download = "mosaic-image.png";
      link.href = dataURL;
      link.click();
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>Mosaic Image Editor</h1>
        <p>Add blur effects to your images</p>
        {/* Install button hidden */}
      </header>

      <div className="controls">
        <div className="upload-section">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            style={{ display: "none" }}
          />
          <button
            className="btn btn-primary"
            onClick={() => fileInputRef.current?.click()}
          >
            Upload Image
          </button>
          {!imageUrl && (
            <p className="upload-hint">Upload an image to get started</p>
          )}
        </div>
        {imageUrl && (
          <>
            <div className="effect-controls">
              <div className="brush-size">
                <label htmlFor="blur-strength">
                  Blur strength: {blurAmount}
                </label>
                <input
                  id="blur-strength"
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={blurAmount}
                  onChange={(e) => setBlurAmount(parseInt(e.target.value, 10))}
                />
              </div>
            </div>
            <div className="action-controls">
              <div className="action-group left">
                <button
                  className="btn btn-secondary"
                  onClick={undo}
                  disabled={historyIndex <= 0}
                  title="Undo last action"
                >
                  ↩️ Undo
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={redo}
                  disabled={historyIndex >= history.length - 1}
                  title="Redo last undone action"
                >
                  ↪️ Redo
                </button>
              </div>
              <div className="action-spacer" />
              <div className="action-group right">
                <button
                  className="btn btn-warning"
                  onClick={clearCanvas}
                  title="Clear all effects and return to original image"
                >
                  🗑️ Clear Effects
                </button>
                <button
                  className="btn btn-success"
                  onClick={saveImage}
                  title="Save edited image"
                >
                  💾 Save Image
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="canvas-container">
        <canvas
          ref={canvasRef}
          style={{
            border: "2px solid #e1e5e9",
            borderRadius: "10px",
            cursor: "crosshair",
          }}
        />
        {selectionRect && (
          <div
            className="selection-rect"
            style={{
              left: selectionRect.x,
              top: selectionRect.y,
              width: selectionRect.width,
              height: selectionRect.height,
            }}
          />
        )}
        {!imageUrl && null}
      </div>

      <div className="instructions">
        <h3>How to use:</h3>
        <ol>
          <li>Upload an image using the button above</li>
          <li>Adjust blur strength (0–100) to control the effect intensity</li>
          <li>Click and drag on the image to select a rectangle to blur</li>
          <li>Use Undo/Redo to adjust your work</li>
          <li>Save your edited image when finished</li>
        </ol>
      </div>
    </div>
  );
}

export default App;
