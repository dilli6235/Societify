import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { API_URL } from '../config';
import { tokens } from './tokens';

/**
 * Download an authenticated PDF (bill / receipt) to the cache and open the
 * native share sheet so the resident can view/save/forward it. The Bearer
 * token is attached so the same server-side PDF routes the web app uses work
 * on mobile too.
 */
export async function downloadAndSharePdf(path: string, filename: string): Promise<void> {
  const target = `${FileSystem.cacheDirectory}${filename}`;
  const result = await FileSystem.downloadAsync(`${API_URL}${path}`, target, {
    headers: {
      Authorization: tokens.access ? `Bearer ${tokens.access}` : '',
      'X-Client-Type': 'mobile',
    },
  });
  if (result.status >= 400) {
    throw new Error('Could not download the document');
  }
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(result.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
  }
}
