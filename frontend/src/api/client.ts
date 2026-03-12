/// <reference types="vite/client" />
import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

const http = axios.create({ baseURL: BASE_URL })

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

export interface FileInfo {
  file_id: string
  filename: string
  size: number
  mime_type: string
  category: string
  format: string
}

export interface JobStatus {
  job_id: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  error?: string
  output_filename?: string
  target_format?: string
  created_at?: string
  updated_at?: string
}

// --------------------------------------------------------------------------
// API functions
// --------------------------------------------------------------------------

export async function uploadFile(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<FileInfo> {
  const form = new FormData()
  form.append('file', file)

  const { data } = await http.post<FileInfo>('/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress(evt) {
      if (onProgress && evt.total) {
        onProgress(Math.round((evt.loaded * 100) / evt.total))
      }
    },
  })
  return data
}

export async function getFiles(): Promise<FileInfo[]> {
  const { data } = await http.get<FileInfo[]>('/files')
  return data
}

export async function deleteFile(fileId: string): Promise<void> {
  await http.delete(`/files/${fileId}`)
}

export async function getFormats(fileId: string): Promise<string[]> {
  const { data } = await http.get<{ file_id: string; formats: string[] }>(`/formats/${fileId}`)
  return data.formats
}

export async function convertFile(
  fileId: string,
  targetFormat: string,
): Promise<{ job_id: string; status: string }> {
  const { data } = await http.post<{ job_id: string; status: string }>('/convert', {
    file_id: fileId,
    target_format: targetFormat,
  })
  return data
}

export async function getJobStatus(jobId: string): Promise<JobStatus> {
  const { data } = await http.get<JobStatus>(`/jobs/${jobId}`)
  return data
}

export function getDownloadUrl(jobId: string): string {
  return `${BASE_URL}/download/${jobId}`
}
