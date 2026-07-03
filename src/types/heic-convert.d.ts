declare module "heic-convert" {
  type ConvertOptions = {
    buffer: Buffer;
    format: "JPEG" | "PNG";
    quality: number;
  };

  function convert(options: ConvertOptions): Promise<ArrayBuffer>;

  export default convert;
}
