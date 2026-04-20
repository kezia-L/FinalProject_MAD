// lib/imageAnalyzer.ts
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system";

export async function prepareImageForAI(imageUri: string): Promise<string> {
  // Compress and resize image for Gemini API
  const manipulated = await ImageManipulator.manipulateAsync(
    imageUri,
    [{ resize: { width: 768, height: 768 } }],
    {
      compress: 0.7,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    }
  );

  if (manipulated.base64) {
    return manipulated.base64;
  }

  // Fallback: read file and convert to base64
  const base64 = await FileSystem.readAsStringAsync(manipulated.uri, {
    encoding: "base64",
  });

  return base64;
}
