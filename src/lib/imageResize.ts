import { File } from 'expo-file-system';

export interface PreparedImage {
  base64: string;
  uri: string;
  mimeType: string;
}

/**
 * Prepara uma imagem para análise pela IA: redimensiona para <=1280px e
 * comprime em JPEG quando o módulo nativo está disponível (requer rebuild do
 * dev client/APK após instalar expo-image-manipulator). Em builds antigas sem
 * o módulo, cai para leitura direta do ficheiro — a edge function rejeita
 * imagens demasiado grandes com mensagem clara.
 */
export async function prepareImageForAnalysis(
  uri: string,
  mimeType: string,
): Promise<PreparedImage> {
  try {
    const ImageManipulator = await import('expo-image-manipulator');
    const out = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1280 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true },
    );
    if (out.base64) {
      return { base64: out.base64, uri: out.uri, mimeType: 'image/jpeg' };
    }
  } catch {
    // Módulo nativo indisponível (build antiga) — usa o ficheiro original.
  }

  const file = new File(uri);
  const base64 = await file.base64();
  return { base64, uri, mimeType };
}
