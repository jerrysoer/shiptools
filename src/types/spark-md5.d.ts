declare module "spark-md5" {
  class SparkMD5 {
    append(str: string): SparkMD5;
    end(raw?: boolean): string;
    reset(): SparkMD5;
    destroy(): void;

    static hash(str: string, raw?: boolean): string;
  }

  namespace SparkMD5 {
    class ArrayBuffer {
      append(buf: globalThis.ArrayBuffer): ArrayBuffer;
      end(raw?: boolean): string;
      reset(): ArrayBuffer;
      destroy(): void;
    }
  }

  export default SparkMD5;
}
