import { useState, useRef } from 'react';
import './App.css';
import CropModal from './CropModal';
import { getCroppedImage, getDefaultCropPixels } from './cropImage';
import { generatePdf } from './pdfGenerator';
import { CARD_ASPECT, PER_PAGE, COLS, ROWS } from './constants';

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

export default function App() {
  const [photos, setPhotos] = useState([]); // {id, src, croppedSrc}
  const [editingPhoto, setEditingPhoto] = useState(null);
  const [generating, setGenerating] = useState(false);
  const fileInputRef = useRef(null);

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    for (const file of files) {
      const src = await readFileAsDataUrl(file);
      const img = await loadImage(src);
      const defaultPixels = getDefaultCropPixels(img.naturalWidth, img.naturalHeight, CARD_ASPECT);
      const croppedSrc = await getCroppedImage(src, defaultPixels);
      const id = nextId++;
      setPhotos((prev) => [...prev, { id, src, croppedSrc }]);
    }
  };

  const onFileInputChange = (e) => {
    handleFiles(e.target.files);
    e.target.value = '';
  };

  const removePhoto = (id) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const savedCrop = (id, dataUrl) => {
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, croppedSrc: dataUrl } : p)));
    setEditingPhoto(null);
  };

  const handleGenerate = async () => {
    if (photos.length === 0) return;
    setGenerating(true);
    try {
      await generatePdf(photos.map((p) => p.croppedSrc));
    } finally {
      setGenerating(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(photos.length / PER_PAGE));

  return (
    <div className="app">
      <header>
        <h1>Photocard Layouting</h1>
        <p>Upload foto, atur crop, dan download PDF siap cetak (5x5 per halaman, 6x9cm).</p>
      </header>

      <div className="upload-zone" onClick={() => fileInputRef.current.click()}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={onFileInputChange}
          style={{ display: 'none' }}
        />
        <p>Klik untuk upload foto (bisa pilih banyak sekaligus)</p>
      </div>

      {photos.length > 0 && (
        <>
          <div className="summary-bar">
            <span>{photos.length} foto — {totalPages} halaman PDF</span>
            <button className="primary" onClick={handleGenerate} disabled={generating}>
              {generating ? 'Membuat PDF...' : 'Download PDF'}
            </button>
          </div>

          {Array.from({ length: totalPages }).map((_, pageIdx) => {
            const pagePhotos = photos.slice(pageIdx * PER_PAGE, (pageIdx + 1) * PER_PAGE);
            return (
              <div key={pageIdx} className="page-section">
                <h3>Halaman {pageIdx + 1}</h3>
                <div
                  className="preview-grid"
                  style={{
                    gridTemplateColumns: `repeat(${COLS}, 1fr)`,
                    gridTemplateRows: `repeat(${ROWS}, 1fr)`,
                  }}
                >
                  {pagePhotos.map((photo) => (
                    <div key={photo.id} className="card-thumb">
                      <img src={photo.croppedSrc} alt="" />
                      <div className="card-actions">
                        <button onClick={() => setEditingPhoto(photo)}>Adjust</button>
                        <button onClick={() => removePhoto(photo.id)}>Hapus</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}

      {editingPhoto && (
        <CropModal
          photo={editingPhoto}
          onCancel={() => setEditingPhoto(null)}
          onSave={savedCrop}
        />
      )}
    </div>
  );
}
