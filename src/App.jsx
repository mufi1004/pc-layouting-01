import { useState, useRef } from 'react';
import './App.css';
import CropModal from './CropModal';
import { getCroppedImage, getDefaultCropPixels } from './cropImage';
import { generatePdf } from './pdfGenerator';
import { CARD_ASPECT, PER_PAGE, COLS, ROWS, FIXED_CODE } from './constants';

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

function PhotoGrid({ photos, setPhotos, onEdit }) {
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
                    className="card-thumb"
                    draggable
                    onDragStart={() => handleDragStart(globalIndex)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(globalIndex)}
                  >
                    <img src={photo.croppedSrc} alt="" />
                    <div className="card-actions">
                      <button onClick={() => onEdit(photo)}>Adjust</button>
                      <button onClick={() => removePhoto(photo.id)}>Hapus</button>
                    </div>
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
  const [editingPhoto, setEditingPhoto] = useState(null);
  const [editingSide, setEditingSide] = useState('front');
  const [generating, setGenerating] = useState(false);

  const frontInputRef = useRef(null);
  const backInputRef = useRef(null);

  const addPhotos = async (fileList, setPhotos) => {
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

  const onFrontInputChange = (e) => {
    addPhotos(e.target.files, setFrontPhotos);
    e.target.value = '';
  };

  const onBackInputChange = (e) => {
    addPhotos(e.target.files, setBackPhotos);
    e.target.value = '';
  };

  const savedCrop = (id, dataUrl) => {
    const setPhotos = editingSide === 'front' ? setFrontPhotos : setBackPhotos;
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, croppedSrc: dataUrl } : p)));
    setEditingPhoto(null);
  };

  const openEdit = (side, photo) => {
    setEditingSide(side);
    setEditingPhoto(photo);
  };

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
      await generatePdf({
        frontImages: frontPhotos.map((p) => p.croppedSrc),
        backImages: backPhotos.map((p) => p.croppedSrc),
        twoSided: sides === '2',
        filename: buildFilename(),
      });
    } finally {
      setGenerating(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(frontPhotos.length / PER_PAGE));

  return (
    <div className="app">
      <header>
        <h1>Photocard Layouting</h1>
        <p>Upload foto, atur crop, dan download PDF siap cetak (5x5 per halaman, 6x9cm).</p>
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
          <p className="hint">Urutan otomatis di-mirror (kanan ke kiri) saat di-PDF supaya sejajar dengan sisi depan.</p>
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
              {generating ? 'Membuat PDF...' : 'Download PDF'}
            </button>
          </div>

          <h3>Sisi Depan</h3>
          <PhotoGrid photos={frontPhotos} setPhotos={setFrontPhotos} onEdit={(p) => openEdit('front', p)} />

          {sides === '2' && backPhotos.length > 0 && (
            <>
              <h3>Sisi Belakang</h3>
              <PhotoGrid photos={backPhotos} setPhotos={setBackPhotos} onEdit={(p) => openEdit('back', p)} />
            </>
          )}
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
