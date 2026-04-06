import type { TrustEnvelope } from '../types/envelope';
import { addLocalEnvelope } from '../services/envelope-store';

export function uploadZoneHTML(): string {
  return `<div class="upload-zone" id="dropzone">
    <span>Drop Trust Envelope JSON files here or click to upload</span>
  </div>`;
}

export function initUploadZone(onUpload: () => void): void {
  const dz = document.getElementById('dropzone');
  if (!dz) return;

  dz.addEventListener('dragover', (e) => {
    e.preventDefault();
    dz.classList.add('dragover');
  });
  dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
  dz.addEventListener('drop', (e) => {
    e.preventDefault();
    dz.classList.remove('dragover');
    handleFiles((e as DragEvent).dataTransfer?.files, onUpload);
  });
  dz.addEventListener('click', () => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.json';
    inp.multiple = true;
    inp.onchange = (e) => handleFiles((e.target as HTMLInputElement).files, onUpload);
    inp.click();
  });
}

function handleFiles(files: FileList | null | undefined, onUpload: () => void): void {
  if (!files) return;
  Array.from(files).forEach(f => {
    if (!f.name.endsWith('.json')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as TrustEnvelope;
        if (data.envelope_id) {
          addLocalEnvelope(data);
          onUpload();
        }
      } catch (err) {
        console.error('Invalid JSON', err);
      }
    };
    reader.readAsText(f);
  });
}
