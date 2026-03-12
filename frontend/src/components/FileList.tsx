import type { FileInfo } from '../api/client'
import { deleteFile } from '../api/client'

interface Props {
  files: FileInfo[]
  selectedId: string | null
  onSelect: (file: FileInfo) => void
  onDeleted: (fileId: string) => void
}

const CATEGORY_COLORS: Record<string, string> = {
  image:       '#4ecca3',
  video:       '#45aaf2',
  audio:       '#f7b731',
  document:    '#e94560',
  spreadsheet: '#26de81',
  archive:     '#a55eea',
  ebook:       '#fd9644',
  unknown:     '#778ca3',
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`
}

const CATEGORY_ICONS: Record<string, string> = {
  image: '🖼️', video: '🎬', audio: '🎵', document: '📄',
  spreadsheet: '📊', archive: '📦', ebook: '📚', unknown: '📎',
}

export default function FileList({ files, selectedId, onSelect, onDeleted }: Props) {
  async function handleDelete(e: React.MouseEvent, fileId: string) {
    e.stopPropagation()
    try {
      await deleteFile(fileId)
      onDeleted(fileId)
    } catch {
      alert('Failed to delete file.')
    }
  }

  return (
    <div style={styles.panel}>
      <h2 style={styles.title}>
        <span>📋</span> Uploaded Files
        <span style={styles.count}>{files.length}</span>
      </h2>

      {files.length === 0 ? (
        <div style={styles.empty}>
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>📭</div>
          <p>No files uploaded yet.</p>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Upload a file to get started.
          </p>
        </div>
      ) : (
        <div style={styles.list}>
          {files.map((f) => {
            const selected = f.file_id === selectedId
            const color = CATEGORY_COLORS[f.category] ?? '#778ca3'
            return (
              <div
                key={f.file_id}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(f)}
                onKeyDown={(e) => e.key === 'Enter' && onSelect(f)}
                style={{
                  ...styles.item,
                  ...(selected ? styles.itemSelected : {}),
                  borderLeft: `3px solid ${color}`,
                }}
              >
                <div style={styles.itemLeft}>
                  <span style={styles.itemIcon}>{CATEGORY_ICONS[f.category] ?? '📎'}</span>
                  <div>
                    <p style={styles.itemName} title={f.filename}>{f.filename}</p>
                    <p style={styles.itemMeta}>
                      {humanSize(f.size)}&nbsp;·&nbsp;
                      <span style={{ color }}>{f.format.toUpperCase()}</span>
                    </p>
                  </div>
                </div>
                <div style={styles.itemRight}>
                  <span
                    style={{ ...styles.badge, background: `${color}22`, color }}
                  >
                    {f.category}
                  </span>
                  <button
                    style={styles.deleteBtn}
                    onClick={(e) => handleDelete(e, f.file_id)}
                    title="Delete file"
                    aria-label={`Delete ${f.filename}`}
                  >
                    🗑
                  </button>
                </div>
              </div>
            )
          })}
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
    gap: '16px',
    minHeight: '300px',
  },
  title: {
    fontSize: '18px',
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  count: {
    marginLeft: 'auto',
    background: 'var(--bg-input)',
    border: '1px solid var(--border)',
    color: 'var(--accent)',
    borderRadius: '20px',
    padding: '2px 10px',
    fontSize: '12px',
    fontWeight: 700,
  },
  empty: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-secondary)',
    padding: '40px 0',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    overflowY: 'auto',
    maxHeight: '480px',
  },
  item: {
    background: 'var(--bg-input)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    transition: 'background 0.15s',
    border: '1px solid var(--border)',
  },
  itemSelected: {
    background: 'rgba(78,204,163,0.08)',
    border: '1px solid var(--border-focus)',
  },
  itemLeft: { display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 },
  itemIcon: { fontSize: '22px', flexShrink: 0 },
  itemName: {
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '160px',
  },
  itemMeta: { fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' },
  itemRight: { display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 },
  badge: {
    fontSize: '10px',
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  deleteBtn: {
    background: 'transparent',
    fontSize: '14px',
    padding: '4px',
    borderRadius: 'var(--radius-sm)',
    opacity: 0.6,
    transition: 'opacity 0.2s',
  },
}
