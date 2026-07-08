export const PET_HAPPY_EVENT = 'nexaeon:pet-happy';
export const PET_CURIOUS_EVENT = 'nexaeon:pet-curious';

export function dispatchPetHappy() {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(new CustomEvent(PET_HAPPY_EVENT));
}

export function dispatchPetCurious() {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(new CustomEvent(PET_CURIOUS_EVENT));
}
