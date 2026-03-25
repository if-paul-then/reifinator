/**
 * Output abstractions for creating directories and files.
 */

import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";

export interface Content {
  content: string;
  encoding?: BufferEncoding;
}

export class OutputDirectory {
  constructor(public readonly path: string) {}

  createDir(name: string): OutputDirectory {
    const dirPath = join(this.path, name);
    mkdirSync(dirPath, { recursive: true });
    return new OutputDirectory(dirPath);
  }

  writeFile(name: string, content: Content): string {
    const filePath = join(this.path, name);
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, content.content, {
      encoding: content.encoding ?? "utf-8",
    });
    return filePath;
  }

  copyFile(name: string, source: string): string {
    const filePath = join(this.path, name);
    mkdirSync(dirname(filePath), { recursive: true });
    copyFileSync(source, filePath);
    return filePath;
  }
}
