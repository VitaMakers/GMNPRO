import piexif from "piexifjs";

export interface PhotoMeta {
  title: string;
  description: string;
  keywords: string;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

function readAsDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function dataURLtoBlob(dataUrl: string): Blob {
  const [head, body] = dataUrl.split(",");
  const mime = head.match(/:(.*?);/)?.[1] ?? "image/jpeg";
  const bytes = atob(body);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

/**
 * Converte qualquer imagem (ex.: PNG) em JPEG, mantendo o enquadramento
 * original (sem corte). O JPEG é necessário porque o EXIF padrão — incluindo
 * o GPS que o Google lê — só existe em JPEG/TIFF.
 */
function toJpegDataURL(file: File): Promise<string> {
  if (file.type === "image/jpeg") return readAsDataURL(file);

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Não foi possível processar a imagem."));
        return;
      }
      // Fundo branco para PNGs com transparência.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL("image/jpeg", 0.95));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Não foi possível abrir a imagem."));
    };
    img.src = objectUrl;
  });
}

/** Codifica texto em UCS-2 (LE) para os campos XP* do Windows/EXIF. */
function ucs2Bytes(text: string): number[] {
  const bytes: number[] = [];
  for (const char of text) {
    const code = char.charCodeAt(0);
    bytes.push(code & 0xff, (code >> 8) & 0xff);
  }
  bytes.push(0, 0);
  return bytes;
}

/**
 * Grava GPS + metadados (título, descrição, palavras-chave) no EXIF de uma
 * foto e devolve um Blob JPEG pronto para baixar. Para JPEG, só o segmento
 * EXIF é reescrito — os pixels permanecem intactos.
 */
export async function geotagPhoto(
  file: File,
  point: GeoPoint,
  meta: PhotoMeta,
): Promise<Blob> {
  const jpegDataURL = await toJpegDataURL(file);

  const latRef = point.lat >= 0 ? "N" : "S";
  const lngRef = point.lng >= 0 ? "E" : "W";

  const gps: Record<number, unknown> = {
    [piexif.GPSIFD.GPSLatitudeRef]: latRef,
    [piexif.GPSIFD.GPSLatitude]: piexif.GPSHelper.degToDmsRational(
      Math.abs(point.lat),
    ),
    [piexif.GPSIFD.GPSLongitudeRef]: lngRef,
    [piexif.GPSIFD.GPSLongitude]: piexif.GPSHelper.degToDmsRational(
      Math.abs(point.lng),
    ),
    [piexif.GPSIFD.GPSMapDatum]: "WGS-84",
  };

  const zeroth: Record<number, unknown> = {
    [piexif.ImageIFD.Software]: "GMN PRO",
  };

  if (meta.description.trim()) {
    zeroth[piexif.ImageIFD.ImageDescription] = meta.description.trim();
  }
  if (meta.title.trim()) {
    zeroth[piexif.ImageIFD.XPTitle] = ucs2Bytes(meta.title.trim());
  }
  if (meta.keywords.trim()) {
    zeroth[piexif.ImageIFD.XPKeywords] = ucs2Bytes(meta.keywords.trim());
  }

  const exifObj = { "0th": zeroth, Exif: {}, GPS: gps };
  const exifStr = piexif.dump(exifObj);
  const newDataURL = piexif.insert(exifStr, jpegDataURL);

  return dataURLtoBlob(newDataURL);
}

/** Troca a extensão do nome do arquivo por .jpg. */
export function toJpgName(name: string): string {
  return name.replace(/\.[^.]+$/, "") + ".jpg";
}
