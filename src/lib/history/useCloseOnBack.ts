import { useEffect, useRef } from 'react'
import { pushBackHandler } from './backStack'

/** While `isOpen`, the browser/Android back button calls `onClose` instead of leaving the page. */
export function useCloseOnBack(isOpen: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!isOpen) return
    return pushBackHandler(() => onCloseRef.current())
  }, [isOpen])
}
