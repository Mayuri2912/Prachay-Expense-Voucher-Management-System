// Shows a saved signature.
//
// Signature images are protected by the API (the login token is required), so a
// normal <img src="..."> cannot load them. Instead the image is downloaded with
// Axios as binary data and shown through a temporary "blob:" address.

import { useEffect, useState } from 'react';
import { getSignatureBlob } from '../api/voucherApi.js';

// type: 'employee' | 'director'
export default function SignatureImage({ voucherId, type, alt }) {
  const [imageUrl, setImageUrl] = useState('');
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'missing'

  useEffect(() => {
    let cancelled = false;
    let objectUrl = '';
    setStatus('loading');

    getSignatureBlob(voucherId, type)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setImageUrl(objectUrl);
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('missing');
      });

    // Free the memory when the component disappears.
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [voucherId, type]);

  if (status === 'loading') {
    return <div className="signature-box signature-placeholder">Loading signature...</div>;
  }
  if (status === 'missing') {
    return <div className="signature-box signature-placeholder">Signature image not available</div>;
  }
  return (
    <div className="signature-box">
      <img src={imageUrl} alt={alt} />
    </div>
  );
}
