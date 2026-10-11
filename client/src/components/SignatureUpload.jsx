// File picker for a signature image, with a preview and instant validation.
//
//   <SignatureUpload id="employee-signature" label="Your signature" file={file} onChange={setFile} />
//
// `file` is the newly chosen File (or null). `existing` is optional content to show
// when a signature is already saved and no new file has been chosen.

import { useEffect, useRef, useState } from 'react';
import { SIGNATURE_MAX_MB } from '../utils/constants.js';
import { validateSignatureFile } from '../utils/validators.js';
import Icon from './Icon.jsx';

export default function SignatureUpload({ id, label, file, onChange, error, required = false, existing = null, hint }) {
  const inputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [fileError, setFileError] = useState('');

  // Build a temporary address for the preview and release it afterwards.
  useEffect(() => {
    if (!file) {
      setPreviewUrl('');
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function handleFileChosen(event) {
    const chosen = event.target.files[0] || null;
    const problem = validateSignatureFile(chosen);

    setFileError(problem);
    onChange(problem ? null : chosen);
    if (problem) event.target.value = ''; // let the user pick the same file again after fixing it
  }

  function removeFile() {
    setFileError('');
    onChange(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  const message = fileError || error;

  return (
    <div className="form-field">
      <label htmlFor={id} className="form-label">
        {label}
        {required && <span className="required-mark"> *</span>}
      </label>

      <div className={message ? 'signature-upload signature-upload-error' : 'signature-upload'}>
        <div className="signature-preview">
          {previewUrl ? (
            <img src={previewUrl} alt="Preview of the selected signature" />
          ) : (
            existing || (
              <span className="signature-empty">
                <Icon name="upload" size={22} />
                No signature selected
              </span>
            )
          )}
        </div>

        <div className="signature-controls">
          <input
            ref={inputRef}
            id={id}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileChosen}
            aria-describedby={`${id}-hint`}
            aria-invalid={message ? 'true' : undefined}
          />
          {file && (
            <button type="button" className="btn btn-ghost btn-small" onClick={removeFile}>
              Remove selected file
            </button>
          )}
          <p id={`${id}-hint`} className="form-hint">
            {hint || `PNG, JPEG or WebP image, up to ${SIGNATURE_MAX_MB} MB.`}
          </p>
        </div>
      </div>

      {message && (
        <p className="form-error" role="alert">
          {message}
        </p>
      )}
    </div>
  );
}
