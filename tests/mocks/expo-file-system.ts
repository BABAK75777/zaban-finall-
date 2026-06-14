export const documentDirectory = '/mock/doc/';
export const EncodingType = { Base64: 'base64' };
export const deletedPaths: string[] = [];

export async function getInfoAsync(path?: string) {
  if (path && path.includes('tts_sentences/')) {
    return { exists: true };
  }
  return { exists: false };
}

export async function makeDirectoryAsync() {}

export async function writeAsStringAsync() {}

export async function deleteAsync(path: string) {
  deletedPaths.push(path);
}

export async function readDirectoryAsync() {
  return [];
}
