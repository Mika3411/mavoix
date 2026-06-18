function isEditableElement(element: Element | null): boolean {
  if (!element) return false;

  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  ) {
    return true;
  }

  const editableParent = element.closest("[contenteditable]");
  return Boolean(editableParent && editableParent.getAttribute("contenteditable") !== "false");
}

function getActiveEditableElement(): HTMLElement | null {
  const activeElement = document.activeElement;
  return activeElement instanceof HTMLElement && isEditableElement(activeElement)
    ? activeElement
    : null;
}

export function installDismissKeyboardOnOutsideTap(): void {
  const dismissKeyboard = (event: MouseEvent | PointerEvent | TouchEvent) => {
    const activeElement = getActiveEditableElement();
    if (!activeElement) return;

    const target = event.target instanceof Element ? event.target : null;
    if (!target || activeElement.contains(target) || isEditableElement(target)) {
      return;
    }

    activeElement.blur();
  };

  if ("PointerEvent" in window) {
    window.addEventListener("pointerdown", dismissKeyboard, {
      capture: true,
      passive: true,
    });
    return;
  }

  window.addEventListener("mousedown", dismissKeyboard, {
    capture: true,
    passive: true,
  });
  window.addEventListener("touchstart", dismissKeyboard, {
    capture: true,
    passive: true,
  });
}
