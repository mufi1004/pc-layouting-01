import { useState, useRef, useCallback, useEffect } from 'react';
import './App.css';
import { computeCropFromZoomPan, computeBackgroundSize, getCroppedImage } from './cropImage';
import { generatePdf } from './pdfGenerator';
import { PER_PAGE, COLS, ROWS, FIXED_CODE } from './constants';

let nextId = 1;

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = src;
  });
}

// A single photocard thumbnail with live pan (drag) + zoom (wheel/slider) adjust.
// The preview box has the exact 6:9 card aspect ratio, so what's shown here
// is exactly what ends up in the PDF.
function LiveCropCard({ photo, onRemove, onAdjustChange }) {
  const [zoom, setZoom] = useState(photo.zoom ?? 1);
  const [pan, setPan] = useState(photo.pan ?? { x: 50, y: 50 });
  const boxRef = useRef(null);
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 50, y: 50 });
  const rectCache = useRef(null);
  const naturalSize = useRef({ w: photo.naturalWidth, h: photo.naturalHeight });
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  zoomRef.current = zoom;
  panRef.current = pan;

  const emitChange = useCallback((nextZoom, nextPan) => {
    const box = boxRef.current;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    const areaPixels = computeCropFromZoomPan(
      naturalSize.current.w,
      naturalSize.current.h,
      rect.width,
      rect.height,
      nextZoom,
      nextPan.x,
      nextPan.y
    );
    onAdjustChange(photo.id, areaPixels, nextZoom, nextPan);
  }, [onAdjustChange, photo.id]);

  // send an initial crop as soon as the card mounts / has real dimensions
  useEffect(() => {
    emitChange(zoom, pan);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePointerDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    panStart.current = { ...panRef.current };
    rectCache.current = boxRef.current.getBoundingClientRect();
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const handlePointerMove = (e) => {
    if (!dragging.current || !rectCache.current) return;
    const rect = rectCache.current;
    const deltaXPercent = ((e.clientX - dragStart.current.x) / rect.width) * 100;
    const deltaYPercent = ((e.clientY - dragStart.current.y) / rect.height) * 100;
    const nextPan = {
      x: Math.max(0, Math.min(100, panStart.current.x - deltaXPercent)),
      y: Math.max(0, Math.min(100, panStart.current.y - deltaYPercent)),
    };
    setPan(nextPan);
  };

  const handlePointerUp = () => {
    dragging.current = false;
    rectCache.current = null;
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
    emitChange(zoomRef.current, panRef.current);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const nextZoom = Math.max(1, Math.min(4, zoomRef.current - e.deltaY * 0.001));
    setZoom(nextZoom);
    // wheel ticks are infrequent enough to emit directly
    emitChange(nextZoom, panRef.current);
  };

  // Slider updates zoom locally on every tick (cheap, local state only).
  // The expensive parent-level update (which re-renders the whole grid)
  // is only committed once the user releases the slider.
  const handleZoomSliderChange = (e) => {
    setZoom(Number(e.target.value));
  };

  const commitZoom = () => {
    emitChange(zoomRef.current, panRef.current);
  };

  const bgSize = boxRef.current
    ? computeBackgroundSize(
        naturalSize.current.w,
        naturalSize.current.h,
        boxRef.current.getBoundingClientRect().width,
        boxRef.current.getBoundingClientRect().height,
        zoom
      )
    : null;

  return (
    <div className="card-thumb">
      <div
        ref={boxRef}
        className="live-crop-box"
        onPointerDown={handlePointerDown}
        onWheel={handleWheel}
        style={{
          backgroundImage: `url(${photo.src})`,
          backgroundSize: bgSize ? `${bgSize.width}px ${bgSize.height}px` : 'cover',
          backgroundPosition: `${pan.x}% ${pan.y}%`,
          backgroundRepeat: 'no-repeat',
        }}
      >
        <button className="inline-delete-btn" onClick={(e) => { e.stopPropagation(); onRemove(photo.id); }}>
          ×
        </button>
      </div>
      <input
        type="range"
        className="inline-zoom-slider"
        min={1}
        max={4}
        step={0.01}
        value={zoom}
        draggable={false}
        onPointerDown={(e) => e.stopPropagation()}
        onChange={handleZoomSliderChange}
        onMouseUp={commitZoom}
        onTouchEnd={commitZoom}
        onKeyUp={commitZoom}
      />
    </div>
  );
}

function PhotoGrid({ photos, setPhotos, onAdjustChange }) {
  const dragIndex = useRef(null);

  const removePhoto = (id) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const handleDragStart = (index) => {
    dragIndex.current = index;
  };

  const handleDrop = (index) => {
    const from = dragIndex.current;
    if (from === null || from === index) return;
    setPhotos((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(index, 0, moved);
      return next;
    });
    dragIndex.current = null;
  };

  const totalPages = Math.max(1, Math.ceil(photos.length / PER_PAGE));

  return (
    <>
      {Array.from({ length: totalPages }).map((_, pageIdx) => {
        const pagePhotos = photos.slice(pageIdx * PER_PAGE, (pageIdx + 1) * PER_PAGE);
        return (
          <div key={pageIdx} className="page-section">
            <h4>Halaman {pageIdx + 1}</h4>
            <div
              className="preview-grid"
              style={{
                gridTemplateColumns: `repeat(${COLS}, 1fr)`,
                gridTemplateRows: `repeat(${ROWS}, 1fr)`,
              }}
            >
              {pagePhotos.map((photo, i) => {
                const globalIndex = pageIdx * PER_PAGE + i;
                return (
                  <div
                    key={photo.id}
                    className="grid-item-wrapper"
                    draggable
                    onDragStart={(e) => {
                      if (e.target.tagName === 'INPUT' || e.target.closest('.live-crop-box')) {
                        e.preventDefault();
                        return;
                      }
                      handleDragStart(globalIndex);
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(globalIndex)}
                  >
                    <LiveCropCard photo={photo} onRemove={removePhoto} onAdjustChange={onAdjustChange} />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </>
  );
}

export default function App() {
  const [spk, setSpk] = useState('');
  const [initial, setInitial] = useState('');
  const [sides, setSides] = useState('1');
  const [finish, setFinish] = useState('GLOSSY');

  const [frontPhotos, setFrontPhotos] = useState([]);
  const [backPhotos, setBackPhotos] = useState([]);
  const [generating, setGenerating] = useState(false);

  const frontInputRef = useRef(null);
  const backInputRef = useRef(null);

  const addPhotos = async (fileList, setPhotos) => {
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    for (const file of files) {
      const src = await readFileAsDataUrl(file);
      const img = await loadImage(src);
      const id = nextId++;
      setPhotos((prev) => [
        ...prev,
        {
          id,
          src,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          areaPixels: null,
          zoom: 1,
          pan: { x: 50, y: 50 },
        },
      ]);
    }
  };

  const onFrontInputChange = (e) => {
    addPhotos(e.target.files, setFrontPhotos);
    e.target.value = '';
  };

  const onBackInputChange = (e) => {
    addPhotos(e.target.files, setBackPhotos);
    e.target.value = '';
  };

  const makeAdjustHandler = (setPhotos) =>
    useCallback((id, areaPixels, zoom, pan) => {
      setPhotos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, areaPixels, zoom, pan } : p))
      );
    }, [setPhotos]);

  const handleFrontAdjust = makeAdjustHandler(setFrontPhotos);
  const handleBackAdjust = makeAdjustHandler(setBackPhotos);

  const buildFilename = () => {
    const spkPart = spk ? `#${spk.replace(/^#/, '')}` : '#-';
    const initialPart = initial ? initial.toUpperCase() : '-';
    const sidesPart = sides === '2' ? '2 SISI' : '1 SISI';
    const finishPart = finish;
    return `${spkPart} ${initialPart} ${FIXED_CODE} ${sidesPart} ${finishPart}.pdf`;
  };

  const handleGenerate = async () => {
    if (frontPhotos.length === 0) return;
    setGenerating(true);
    try {
      const processImages = async (photos) =>
        Promise.all(
          photos.map(async (p) => {
            if (p.areaPixels) {
              return await getCroppedImage(p.src, p.areaPixels);
            }
            return p.src;
          })
        );

      const finalFront = await processImages(frontPhotos);
      const finalBack = await processImages(backPhotos);

      await generatePdf({
        frontImages: finalFront,
        backImages: finalBack,
        twoSided: sides === '2',
        filename: buildFilename(),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(frontPhotos.length / PER_PAGE));

  return (
    <div className="app">
      <header>
        <h1>Photocard Layouting</h1>
        <p>Upload foto, geser & zoom langsung di kartu, lalu download PDF.</p>
      </header>

      <div className="form-card">
        <div className="form-row">
          <label>Nomor SPK</label>
          <div className="spk-input">
            <span>#</span>
            <input
              type="text"
              value={spk}
              onChange={(e) => setSpk(e.target.value.replace(/^#/, ''))}
              placeholder="123456"
            />
          </div>
        </div>

        <div className="form-row">
          <label>Inisial Admin</label>
          <input
            type="text"
            value={initial}
            onChange={(e) => setInitial(e.target.value)}
            placeholder="AB"
          />
        </div>

        <div className="form-row">
          <label>Sisi</label>
          <select value={sides} onChange={(e) => setSides(e.target.value)}>
            <option value="1">1 Sisi</option>
            <option value="2">2 Sisi</option>
          </select>
        </div>
        <div className="form-row">
          <label>Finishing</label>
          <select value={finish} onChange={(e) => setFinish(e.target.value)}>
            <option value="GLOSSY">Glossy</option>
            <option value="DOFF">Doff</option>
          </select>
        </div>
        <div className="filename-preview">Nama file: {buildFilename()}</div>
      </div>

      <div className="upload-zone" onClick={() => frontInputRef.current.click()}>
        <input
          ref={frontInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={onFrontInputChange}
          style={{ display: 'none' }}
        />
        <p>Klik untuk upload foto sisi depan (bisa pilih banyak sekaligus)</p>
      </div>

      {sides === '2' && (
        <div className="upload-zone back" onClick={() => backInputRef.current.click()}>
          <input
            ref={backInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={onBackInputChange}
            style={{ display: 'none' }}
          />
          <p>Klik untuk upload foto sisi belakang</p>
          <p className="hint">Urutan otomatis di-mirror saat di-PDF supaya sejajar dengan sisi depan.</p>
        </div>
      )}

      {frontPhotos.length > 0 && (
        <>
          <div className="summary-bar">
            <span>
              {frontPhotos.length} foto depan
              {sides === '2' ? ` · ${backPhotos.length} foto belakang` : ''} — {totalPages} halaman
            </span>
            <button className="primary" onClick={handleGenerate} disabled={generating}>
              {generating ? 'Memproses...' : 'Download PDF'}
            </button>
          </div>

          <h3>Sisi Depan</h3>
          <PhotoGrid photos={frontPhotos} setPhotos={setFrontPhotos} onAdjustChange={handleFrontAdjust} />

          {sides === '2' && backPhotos.length > 0 && (
            <>
              <h3>Sisi Belakang</h3>
              <PhotoGrid photos={backPhotos} setPhotos={setBackPhotos} onAdjustChange={handleBackAdjust} />
            </>
          )}
        </>
      )}
    </div>
  );
}
