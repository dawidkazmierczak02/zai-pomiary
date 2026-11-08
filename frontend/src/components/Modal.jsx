import { useEffect, useId, useRef } from 'react'

export default function Modal({ title, open, onClose, children }) {
  const dialogRef = useRef(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog ref={dialogRef} className="modal" aria-labelledby={titleId} onClose={onClose}>
      <div className="modal-header">
        <h2 id={titleId}>{title}</h2>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Zamknij">
          ×
        </button>
      </div>
      {children}
    </dialog>
  )
}