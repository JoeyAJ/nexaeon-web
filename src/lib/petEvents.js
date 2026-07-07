export const PET_HAPPY_EVENT = 'nexaeon:pet-happy';

export function dispatchPetHappy() {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(new CustomEvent(PET_HAPPY_EVENT));
}
