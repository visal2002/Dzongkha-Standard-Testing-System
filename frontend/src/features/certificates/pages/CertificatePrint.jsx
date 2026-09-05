/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

/**
 * Print-ready certificate: the official template image is shown full-bleed on an A4
 * page and only the test taker's (English) name is overlaid on the Name field.
 * Nothing else is drawn - the artwork, Dzongkha text and all other labels come
 * straight from the template image itself.
 *
 * The template file must exist at one of:
 *   frontend/public/images/certificate-template.png   (preferred)
 *   frontend/public/images/certificate-template.jpg
 * Portrait A4 proportions. Adjust NAME_BOX below if the name sits slightly off the
 * printed field.
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { certificateService } from '@/features/certificates/api';

const TEMPLATE_SOURCES = [
  '/images/certificate-template.png',
  '/images/certificate-template.jpg',
  '/images/certificate-template.jpeg',
];

// The supplied template already has a sample name ("Sonam Rinchen") printed in the
// English Name field, so we paint a white patch over it and draw the real name on
// top. All values are shares of the A4 sheet - nudge them if the patch/name are off.
const NAME_COVER = {
  top: '29.4%',
  left: '18%',
  width: '49%',
  height: '3.9%',
};
const NAME_TEXT = {
  top: '31.3%',   // vertical centre of the field
  left: '19%',
  width: '47%',
  fontSize: '17px',
};

export default function CertificatePrint() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cert, setCert] = useState(undefined);
  const [srcIndex, setSrcIndex] = useState(0);
  const imgError = srcIndex >= TEMPLATE_SOURCES.length;

  useEffect(() => { document.title = 'DSTS Certificate'; }, []);

  useEffect(() => {
    let active = true;
    certificateService.getById(id)
      .then((res) => { if (active) setCert(res?.data ?? res ?? null); })
      .catch(() => { if (active) setCert(null); });
    return () => { active = false; };
  }, [id]);

  if (cert === undefined) {
    return <div className="cp-msg">Loading certificate…<style>{styles}</style></div>;
  }
  if (cert === null) {
    return (
      <div className="cp-msg">
        <p>This certificate could not be found.</p>
        <button type="button" onClick={() => navigate(-1)}>Go back</button>
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className="cp-root">
      <div className="cp-toolbar">
        <button type="button" className="cp-btn ghost" onClick={() => navigate(-1)}>
          <ArrowLeft size={15} /> Back
        </button>
        <span className="cp-hint">Choose <strong>Save as PDF</strong> as the destination in the print dialog.</span>
        <button type="button" className="cp-btn" onClick={() => window.print()}>
          <Printer size={15} /> Save / Print
        </button>
      </div>

      <div className="sheet">
        {imgError ? (
          <div className="cp-missing">
            <p><strong>Certificate template image not found.</strong></p>
            <p>Add the template artwork at <code>frontend/public/images/certificate-template.png</code> (portrait A4). The name below is still positioned correctly.</p>
          </div>
        ) : (
          <img
            className="template"
            src={TEMPLATE_SOURCES[srcIndex]}
            alt="DSTS certificate"
            onError={() => setSrcIndex((i) => i + 1)}
          />
        )}

        {!imgError && (
          <div
            className="name-cover"
            style={{ top: NAME_COVER.top, left: NAME_COVER.left, width: NAME_COVER.width, height: NAME_COVER.height }}
          />
        )}
        <div
          className="holder-name"
          style={{ top: NAME_TEXT.top, left: NAME_TEXT.left, width: NAME_TEXT.width, fontSize: NAME_TEXT.fontSize }}
        >
          {cert.holderName}
        </div>
      </div>

      <style>{styles}</style>
    </div>
  );
}

const styles = `
  :root { color-scheme: light; }

  .cp-msg {
    min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 1rem; font-family: system-ui, sans-serif; color: #334155; background: #eef0ee;
  }
  .cp-msg button { padding: 0.5rem 1rem; border-radius: 8px; border: 1px solid #cbd5e1; background: #fff; cursor: pointer; }

  .cp-root { min-height: 100vh; background: #e9ebe8; padding: 1.5rem 1rem 3rem; }

  .cp-toolbar {
    width: 210mm; max-width: 100%; margin: 0 auto 1.25rem; display: flex; align-items: center; gap: 1rem;
    flex-wrap: wrap; font-family: "Segoe UI", system-ui, sans-serif;
  }
  .cp-hint { font-size: 0.82rem; color: #5b6660; flex: 1; min-width: 180px; }
  .cp-btn {
    display: inline-flex; align-items: center; gap: 0.45rem; padding: 0.5rem 1rem; border-radius: 999px;
    border: 1px solid #124143; background: #124143; color: #fff; font-size: 0.85rem; font-weight: 600;
    cursor: pointer; font-family: inherit;
  }
  .cp-btn.ghost { background: transparent; color: #124143; }
  .cp-btn:hover { opacity: 0.92; }

  /* ---- A4 sheet ---- */
  .sheet {
    position: relative; width: 210mm; min-height: 297mm; margin: 0 auto; background: #fff;
    box-shadow: 0 20px 55px -20px rgba(20, 55, 40, 0.4); overflow: hidden;
  }
  .template { display: block; width: 100%; height: auto; }

  .name-cover { position: absolute; background: #ffffff; }

  .holder-name {
    position: absolute; transform: translateY(-50%);
    font-family: "Georgia", "Times New Roman", serif;
    color: #1c2b36; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    line-height: 1;
  }

  .cp-missing {
    padding: 40mm 24mm; font-family: system-ui, sans-serif; color: #475569; font-size: 0.9rem; line-height: 1.6;
  }
  .cp-missing code { background: #f1f5f9; padding: 1px 5px; border-radius: 4px; font-size: 0.85em; }

  /* ---- Print ---- */
  @page { size: A4; margin: 0; }
  @media print {
    .cp-root { background: #fff; padding: 0; }
    .cp-toolbar { display: none; }
    .sheet { box-shadow: none; margin: 0; width: 210mm; min-height: 297mm; }
  }
`;
