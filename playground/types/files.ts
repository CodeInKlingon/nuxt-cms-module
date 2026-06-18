export interface FileSystemItem {
  name: string
  type: 'file' | 'directory'
  path: string
  size: number
  updatedAt: number
  url?: string
}

export interface PaginatedFileSystemItems {
  items: FileSystemItem[]
  total: number
}
