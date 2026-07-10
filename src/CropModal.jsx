import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { CARD_ASPECT } from './constants';
import { getCroppedImage } from './cropImage';

export default function CropModal({ photo, onCancel, onSave }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_area, areaPixels) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    setSaving(true);
    const dataUrl = await getCroppedImage(photo.src, croppedAreaPixels);
    setSaving(false);
    onSave(photo.id, dataUrl, croppedAreaPixels);
  };

  return (
    <div className="crop-modal-overlay">
      <div className="crop-modal-content">
        <h3>Atur Crop</h3>
        
        <div className="cropper-container">
          <Cropper
            image={photo.src}
            crop={crop}
            zoom={zoom}
            aspect={CARD_ASPECT}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>
        
        <div className="crop-controls">
          <label>Zoom</label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
        </div>
        
        <div className="crop-actions">
          <button className="cancel-btn" onClick={onCancel} disabled={saving}>
            Batal
          </button>
          <button className="save-btn" onClick={handleSave} disabled={saving}>
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  );
}
