/**
 * Converts a File (or Blob) to a Base64 data-URL string.
 * The result is used only for immediate in-browser preview — never stored in Firestore.
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read the selected file.'));
    reader.readAsDataURL(file);
  });
}
