export type ViewMode = "grid" | "list"

export interface FileItem {
  id: string
  name: string
  type: "folder" | "document" | "image" | "video" | "audio" | "code" | "spreadsheet" | "presentation" | "pdf"
  size: number
  modified: string
  starred: boolean
  shared: boolean
  itemCount?: number
}
