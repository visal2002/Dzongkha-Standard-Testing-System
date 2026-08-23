import '@testing-library/jest-dom/vitest';

if (typeof Blob !== 'undefined' && !Blob.prototype.arrayBuffer) {
  Blob.prototype.arrayBuffer = function arrayBuffer() {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error('Failed to read Blob as ArrayBuffer'));
      reader.readAsArrayBuffer(this);
    });
  };
}

beforeEach(() => {
  sessionStorage.clear?.();
  localStorage.clear?.();
});