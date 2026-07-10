import { useState, useRef, useCallback } from 'react';
import './App.css';
import Cropper from 'react-easy-crop'; 
import { getCroppedImage } from './cropImage';
import { generatePdf } from './pdfGenerator';
import { PER_PAGE, COLS, ROWS, FIXED_CODE } from './constants';

// Rasio presisi Photocard 6x9 cm (2:3 atau 0.6666)
const PC_ASPECT = 6 / 9;

let nextId = 1;

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function LiveCropItem({ photo, onRemove, onCropChange }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  const handleCropComplete = useCallback((_croppedArea, croppedAreaPixels) => {
    onCropChange(photo.id, croppedAreaPixels);
  }, [photo.id, onCropChange]);

  return (
    <div className="card-thumb live-crop-card">
      <div className="cropper-inline-wrap">
        <Cropper
          image={photo.src}
          crop={crop}
          zoom={zoom}
          onZoomChange={setZoom}
          aspect={6 / 9} /* Rasio presisi standar photocard */
          onCropChange={setCrop}
          onCropComplete={handleCropComplete}
          showGrid={false}
          
          /* KUNCI UTAMA AMAN DARI PUTIH-PUTIH */
          objectFit="cover"       // Memaksa gambar otomatis penuh menutup kotak sejak awal upload
          restrictPosition={true} // Mengunci agar geseran tidak bisa bablas keluar dari tepi gambar
          
          style={{
            shadingStyle: { display: 'none' }, // Menghilangkan bayangan abu-abu gelap bawaan
          }}
          classes={{
            containerClassName: 'custom-cropper-container',
            cropAreaClassName: 'custom-crop-area'
          }}
        />
        
        {/* Tombol Hapus Silang */}
        <button 
          className="inline-delete-btn" 
          onClick={(e) => {
            e.stopPropagation();
            onRemove(photo.id);
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}

function PhotoGrid({ photos, setPhotos, onCropChange }) {
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
                    onDragStart={() => handleDragStart(globalIndex)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(globalIndex)}
                  >
                    <LiveCropItem 
                      photo={photo} 
                      onRemove={removePhoto} 
                      onCropChange={onCropChange}
                    />
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
      const id = nextId++;
      setPhotos((prev) => [...prev, { id, src, areaPixels: null }]);
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

  const handleCropChange = useCallback((id, side, croppedAreaPixels) => {
    const setPhotos = side === 'front' ? setFrontPhotos : setBackPhotos;
    setPhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, areaPixels: croppedAreaPixels } : p))
    );
  }, []);

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
      const processImages = async (photos) => {
        return Promise.all(
          photos.map(async (p) => {
            if (p.areaPixels) {
              return await getCroppedImage(p.src, p.areaPixels);
            }
            return p.src;
          })
        );
      };

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
        <p>Upload foto, langsung geser posisi di lembar grid, lalu download PDF.</p>
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
              {generating ? 'Memproses Gambar & PDF...' : 'Download PDF'}
            </button>
          </div>

          <h3>Sisi Depan</h3>
          <PhotoGrid 
            photos={frontPhotos} 
            setPhotos={setFrontPhotos} 
            onCropChange={(id, pixels) => handleCropChange(id, 'front', pixels)} 
          />

          {sides === '2' && backPhotos.length > 0 && (
            <>
              <h3>Sisi Belakang</h3>
              <PhotoGrid 
                photos={backPhotos} 
                setPhotos={setBackPhotos} 
                onCropChange={(id, pixels) => handleCropChange(id, 'back', pixels)} 
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
