import { Injectable } from '@angular/core';
import crypto from 'crypto';

@Injectable({
  providedIn: 'root'
})
export class EncryptService {
  private readonly algorithm = 'aes-256-cbc';
  private readonly encoding = 'hex';
  private readonly key: string;

  constructor() {
    this.key = process.env.ENCRYPTION_KEY!;
  }

  public encrypt(data: string): string {
    const iv = crypto.pseudoRandomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, Buffer.from(this.key), iv);
    const encryptedData = cipher.update(data, 'utf8', 'binary') + cipher.final('binary');
    return Buffer.from(`${encryptedData}${iv.toString('binary')}`, 'binary').toString(this.encoding);
  }

  public decrypt(data: string): string {
    const binaryData = Buffer.from(data, this.encoding);
    const iv = binaryData.slice(-16);
    const encryptedData = binaryData.slice(0, binaryData.length - 16);
    const decipher = crypto.createDecipheriv(this.algorithm, Buffer.from(this.key), iv);
    const decryptedData = Buffer.concat([decipher.update(encryptedData), decipher.final()]).toString('utf-8');
    return decryptedData;
  }
}