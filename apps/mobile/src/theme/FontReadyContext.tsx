import { createContext, useContext } from 'react';

export const FontReadyContext = createContext(false);

export function useFontsReady(): boolean {
  return useContext(FontReadyContext);
}
