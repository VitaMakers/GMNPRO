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

export interface ProcessOptions {
  /** Redimensiona para as specs do GMB e recomprime em JPEG de qualidade. */
  optimize: boolean;
  /** Ajuste leve de brilho/contraste/saturação + nitidez. */
  enhance: boolean;
}

export interface ProcessedResult {
  blob: Blob;
  width: number;
  height: number;
}

// Specs recomendadas para fotos do Google Meu Negócio.
const MAX_DIM = 2048; // lado maior; evita arquivos gigantes do celular
const MIN_RECOMMENDED = 720; // abaixo disso o Google pode exibir mal
const JPEG_QUALITY = 0.92;

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

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Não foi possível abrir a imagem."));
    };
    img.src = objectUrl;
  });
}

/** Nitidez leve (unsharp) via convolução 3x3 — aplicada após o redimensionamento. */
function sharpen(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const src = ctx.getImageData(0, 0, w, h);
  const out = ctx.createImageData(w, h);
  const s = src.data;
  const d = out.data;
  // kernel central 1.8, vizinhos -0.2 (soma = 1.0): realce sutil, sem halo forte
  const k = [0, -0.2, 0, -0.2, 1.8, -0.2, 0, -0.2, 0];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        let ki = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = Math.min(w - 1, Math.max(0, x + dx));
            const ny = Math.min(h - 1, Math.max(0, y + dy));
            sum += s[(ny * w + nx) * 4 + c] * k[ki++];
          }
        }
        d[i + c] = sum < 0 ? 0 : sum > 255 ? 255 : sum;
      }
      d[i + 3] = s[i + 3];
    }
  }
  ctx.putImageData(out, 0, 0);
}

/**
 * Converte/otimiza a imagem em JPEG mantendo o enquadramento (sem corte).
 * - optimize: redimensiona para o lado maior = MAX_DIM quando a foto é grande.
 * - enhance: aplica brilho/contraste/saturação leves + nitidez.
 * Devolve o dataURL JPEG e as dimensões finais.
 */
async function toProcessedJpeg(
  file: File,
  opts: ProcessOptions,
): Promise<{ dataUrl: string; width: number; height: number }> {
  // Caminho sem reprocessar: JPEG original, insere EXIF sem perder qualidade.
  if (file.type === "image/jpeg" && !opts.optimize && !opts.enhance) {
    const dataUrl = await readAsDataURL(file);
    return { dataUrl, width: 0, height: 0 };
  }

  const img = await loadImage(file);
  let w = img.naturalWidth;
  let h = img.naturalHeight;

  if (opts.optimize) {
    const longest = Math.max(w, h);
    if (longest > MAX_DIM) {
      const scale = MAX_DIM / longest;
      w = Math.round(w * scale);
      h = Math.round(h * scale);
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível processar a imagem.");

  ctx.fillStyle = "#ffffff"; // fundo branco para PNGs com transparência
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingQuality = "high";
  if (opts.enhance) {
    ctx.filter = "brightness(1.04) contrast(1.08) saturate(1.06)";
  }
  ctx.drawImage(img, 0, 0, w, h);
  ctx.filter = "none";

  if (opts.enhance) sharpen(ctx, w, h);

  const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  return { dataUrl, width: w, height: h };
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
  opts: ProcessOptions = { optimize: true, enhance: true },
): Promise<ProcessedResult> {
  const { dataUrl: jpegDataURL, width, height } = await toProcessedJpeg(file, opts);

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

  return { blob: dataURLtoBlob(newDataURL), width, height };
}

/** Avisa se a foto está abaixo da resolução recomendada pelo Google. */
export function isLowResolution(width: number, height: number): boolean {
  return width > 0 && Math.max(width, height) < MIN_RECOMMENDED;
}

/** Troca a extensão do nome do arquivo por .jpg. */
export function toJpgName(name: string): string {
  return name.replace(/\.[^.]+$/, "") + ".jpg";
}

/** Transforma um texto em um nome de arquivo amigável (slug) + .jpg. */
export function slugJpgName(title: string, fallbackName: string): string {
  const slug = title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug ? `${slug}.jpg` : toJpgName(fallbackName);
}
