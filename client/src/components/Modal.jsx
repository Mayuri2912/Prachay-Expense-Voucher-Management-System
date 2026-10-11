// A pop-up window built on the browser's own <dialog> element.
// <dialog> gives us the important accessibility behaviour for free: the keyboard
// focus stays inside the pop-up, Escape closes it and the page behind is inactive.

import { useEffect, useRef } from 'react';
import Icon from './Icon.jsx';

export default function Modal({ open, title, onClose, children, footer, busy = false }) {
  const dialogRef = useRef(null);

  // Open or close the real <dialog> whenever the `open` prop changes.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  function handleCancel(event) {
    event.preventDefault(); // React decides when it closes, not the browser
    if (!busy) onClose();
  }

  // A click on the dark area outside the box closes the pop-up.
  function handleBackdropClick(event) {
    if (event.target === dialogRef.current && !busy) onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      onCancel={handleCancel}
      onClick={handleBackdropClick}
      aria-labelledby="modal-title"
    >
      {open && (
        <div className="modal-box">
          <div className="modal-header">
            <h2 id="modal-title">{title}</h2>
            <button type="button" className="icon-button" onClick={onClose} disabled={busy} aria-label="Close">
              <Icon name="x" />
            </button>
          </div>
          <div className="modal-content">{children}</div>
          {footer && <div className="modal-footer">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}
