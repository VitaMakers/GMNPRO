declare module "piexifjs" {
  type ExifDict = Record<string, Record<number, unknown>>;

  const piexif: {
    dump: (exifObj: ExifDict) => string;
    insert: (exifStr: string, dataUrl: string) => string;
    load: (dataUrl: string) => ExifDict;
    ImageIFD: Record<string, number>;
    ExifIFD: Record<string, number>;
    GPSIFD: Record<string, number>;
    GPSHelper: {
      degToDmsRational: (deg: number) => [number, number][];
    };
  };

  export default piexif;
}
