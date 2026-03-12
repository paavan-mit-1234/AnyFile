import { useCallback, useRef, useState } from 'react'
import { uploadFile } from '../api/client'
import type { FileInfo } from '../api/client'

interface Props {
  onUploaded: (file: FileInfo) => void
}

export default function UploadPanel({ onUploaded }: Props) {
  const [dragging, setDragging] = useState(false)
  const [uploads, setUploads] = useState<
    { name: string; progress: number; error?: string }[]
  >([])
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return
      const list = Array.from(files)

      setUploads((prev) => [
        ...prev,
        ...list.map((f) => ({ name: f.name, progress: 0 })),
      ])

      for (const file of list) {
        try {
          const info = await uploadFile(file, (pct) => {
            setUploads((prev) =>
              prev.map((u) => (u.name === file.name ? { ...u, progress: pct } : u)),
            )
          })
          setUploads((prev) =>
            prev.map((u) =>
              u.name === file.name ? { ...u, progress: 100 } : u,
            ),
          )
          onUploaded(info)
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Upload failed'
          setUploads((prev) =>
            prev.map((u) =>
              u.name === file.name ? { ...u, error: msg } : u,
            ),
          )
        }
      }
    },
    [onUploaded],
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      handleFiles(e.dataTransfer.files)
    },
    [handleFiles],
  )

  return (
    <div style={styles.panel}>
      <h2 style={styles.title}>
        <span style={styles.icon}>📁</span> Upload Files
      </h2>

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Drop files here or click to browse"
        style={{
          ...styles.dropZone,
          ...(dragging ? styles.dropZoneActive : {}),
        }}
        onDragEnter={(e) => { e.preventDefault(); setDragging(true) }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
      >
        <div style={styles.dropIcon}>{dragging ? '📂' : '☁️'}</div>
        <p style={styles.dropPrimary}>
          {dragging ? 'Release to upload' : 'Drag & drop files here'}
        </p>
        <p style={styles.dropSecondary}>or click to browse — multiple files supported</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Upload queue */}
      {uploads.length > 0 && (
        <div style={styles.queue}>
          {uploads.map((u, i) => (
            <div key={`${u.name}-${i}`} style={styles.queueItem}>
              <div style={styles.queueHeader}>
                <span style={styles.queueName} title={u.name}>{u.name}</span>
                {u.error ? (
                  <span style={styles.errorBadge}>✗</span>
                ) : u.progress === 100 ? (
                  <span style={styles.successBadge}>✓</span>
                ) : (
                  <span style={styles.pctBadge}>{u.progress}%</span>
                )}
              </div>
              {!u.error && (
                <div style={styles.progressTrack}>
                  <div
                    style={{
                      ...styles.progressFill,
                      width: `${u.progress}%`,
                      background: u.progress === 100 ? 'var(--success)' : 'var(--accent)',
                    }}
                  />
                </div>
              )}
              {u.error && <p style={styles.errorText}>{u.error}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius-lg)',
    padding: '24px',
    border: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  title: {
    fontSize: '18px',
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  icon: { fontSize: '20px' },
  dropZone: {
    border: '2px dashed var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '40px 24px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
    background: 'var(--bg-input)',
  },
  dropZoneActive: {
    border: '2px dashed var(--accent)',
    background: 'rgba(78,204,163,0.07)',
    boxShadow: 'var(--shadow-glow)',
  },
  dropIcon: { fontSize: '48px', marginBottom: '12px' },
  dropPrimary: { fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' },
  dropSecondary: { fontSize: '13px', color: 'var(--text-secondary)' },
  queue: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    maxHeight: '240px',
    overflowY: 'auto',
  },
  queueItem: {
    background: 'var(--bg-input)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 12px',
    border: '1px solid var(--border)',
  },
  queueHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
  },
  queueName: {
    fontSize: '13px',
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '80%',
  },
  pctBadge: { fontSize: '12px', color: 'var(--accent)', fontWeight: 600 },
  successBadge: { fontSize: '14px', color: 'var(--success)', fontWeight: 700 },
  errorBadge: { fontSize: '14px', color: 'var(--danger)', fontWeight: 700 },
  progressTrack: {
    height: '4px',
    background: 'var(--bg-surface)',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: '2px',
    transition: 'width 0.3s ease',
  },
  errorText: { fontSize: '12px', color: 'var(--danger)', marginTop: '4px' },
}
