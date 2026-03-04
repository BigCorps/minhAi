import { useState } from 'react'; export function useWakeWordState() { return { wakeWordState: {}, onWakeWordDetected: () => {}, resetWakeWordState: () => {} }; }
