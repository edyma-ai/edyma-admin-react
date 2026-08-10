import { useState } from 'react'

/**
 * Close-intent guard for dismissible overlays holding a form: route every
 * dismiss path (Escape, backdrop, Cancel, the X button) through `requestClose`
 * and render a ConfirmModal while `confirming` — closing only discards edits
 * after the user says so. Success paths call the raw close directly.
 */
export function useDirtyGuard(dirty: boolean, onClose: () => void) {
  const [confirming, setConfirming] = useState(false)

  function requestClose() {
    if (dirty) setConfirming(true)
    else onClose()
  }

  function keepEditing() {
    setConfirming(false)
  }

  return { confirming, requestClose, discard: onClose, keepEditing }
}
