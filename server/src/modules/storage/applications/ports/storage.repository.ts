export const storageRepositoryToken = Symbol("StorageRepository").toString();

export interface IStoreCoverInput {
  bookId: string;
  filename: string;
  body: Uint8Array;
  contentType: string;
}

export interface IStorageRepository {
  storeCover(input: IStoreCoverInput): Promise<string>;
  deleteCover(key: string): Promise<void>;
}
