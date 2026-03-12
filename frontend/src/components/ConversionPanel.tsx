import { useEffect, useRef, useState } from 'react'
import { convertFile, getDownloadUrl, getFormats, getJobStatus } from '../api/client'
import type { FileInfo, JobStatus } from '../api/client'

export interface CompletedJob {
  jobId: string
  outputFilename: string
  targetFormat: string
}

interface Props {
  file: FileInfo | null
  onJobCompleted?: (job: CompletedJob) => void
}

const STATUS_COLORS: Record<string, string> = {
  queued:     'var(--warning)',
  processing: 'var(--info)',
  completed:  'var(--success)',
  failed:     'var(--danger)',
}

const STATUS_ICONS: Record<string, string> = {
  queued:     '⏳',
  processing: '⚙️',
  completed:  '✅',
  failed:     '❌',
}

export default function ConversionPanel({ file, onJobCompleted }: Props) {
  const [formats, setFormats] = useState<string[]>([])
  const [selectedFormat, setSelectedFormat] = useState('')
  const [job, setJob] = useState<JobStatus | null>(null)
  const [converting, setConverting] = useState(false)
  const [loadingFormats, setLoadingFormats] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Load formats when file changes
  useEffect(() => {
    setJob(null)
    setSelectedFormat('')
    setFormats([])
    if (!file) return

    setLoadingFormats(true)
    getFormats(file.file_id)
      .then((fmts) => {
        setFormats(fmts)
        if (fmts.length > 0) setSelectedFormat(fmts[0])
      })
      .catch(console.error)
      .finally(() => setLoadingFormats(false))
  }, [file])

  // Poll job status
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    if (!job || job.status === 'completed' || job.status === 'failed') return

    pollRef.current = setInterval(async () => {
      try {
        const updated = await getJobStatus(job.job_id)
        setJob(updated)
        if (updated.status === 'completed' || updated.status === 'failed') {
          clearInterval(pollRef.current!)
          setConverting(false)
          if (updated.status === 'completed' && onJobCompleted) {
            onJobCompleted({
              jobId: updated.job_id,
              outputFilename: updated.output_filename ?? `converted.${selectedFormat}`,
              targetFormat: selectedFormat,
            })
          }
        }
      } catch {
        clearInterval(pollRef.current!)
        setConverting(false)
      }
    }, 2000)

    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [job?.job_id, job?.status])

  async function handleConvert() {
    if (!file || !selectedFormat) return
    setConverting(true)
    setJob(null)
    try {
      const res = await convertFile(file.file_id, selectedFormat)
      const status = await getJobStatus(res.job_id)
      setJob(status)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Conversion request failed'
      setJob({ job_id: '', status: 'failed', error: msg })
      setConverting(false)
    }
  }

  if (!file) {
    return (
      <div style={styles.panel}>
        <h2 style={styles.title}><span>🔄</span> Convert</h2>
        <div style={styles.empty}>
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>🎯</div>
          <p>Select a file from the list to convert it.</p>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.panel}>
      <h2 style={styles.title}><span>🔄</span> Convert</h2>

      {/* Source file info */}
      <div style={styles.fileCard}>
        <div style={styles.fileRow}>
          <span style={styles.fileLabel}>File</span>
          <span style={styles.fileValue} title={file.filename}>{file.filename}</span>
        </div>
        <div style={styles.fileRow}>
          <span style={styles.fileLabel}>Format</span>
          <span style={{ ...styles.fileValue, color: 'var(--accent)', fontWeight: 700 }}>
            {file.format.toUpperCase()}
          </span>
        </div>
        <div style={styles.fileRow}>
          <span style={styles.fileLabel}>Category</span>
          <span style={styles.fileValue}>{file.category}</span>
        </div>
      </div>

      {/* Format selector */}
      <div style={styles.selectorRow}>
        <label htmlFor="format-select" style={styles.label}>Convert to</label>
        {loadingFormats ? (
          <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Loading…</span>
        ) : formats.length === 0 ? (
          <span style={{ color: 'var(--danger)', fontSize: '13px' }}>
            No supported output formats.
          </span>
        ) : (
          <select
            id="format-select"
            value={selectedFormat}
            onChange={(e) => setSelectedFormat(e.target.value)}
            style={styles.select}
          >
            {formats.map((f) => (
              <option key={f} value={f}>{f.toUpperCase()}</option>
            ))}
          </select>
        )}
      </div>

      {/* Convert button */}
      <button
        style={{
          ...styles.convertBtn,
          ...(converting || formats.length === 0 ? styles.convertBtnDisabled : {}),
        }}
        onClick={handleConvert}
        disabled={converting || formats.length === 0}
      >
        {converting ? (
          <><span style={styles.spinner} /> Converting…</>
        ) : (
          '⚡ Convert Now'
        )}
      </button>

      {/* Job status */}
      {job && (
        <div
          style={{
            ...styles.statusCard,
            borderColor: STATUS_COLORS[job.status] ?? 'var(--border)',
          }}
        >
          <div style={styles.statusHeader}>
            <span style={{ fontSize: '18px' }}>{STATUS_ICONS[job.status] ?? '❓'}</span>
            <span style={{ color: STATUS_COLORS[job.status], fontWeight: 700, fontSize: '14px' }}>
              {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
            </span>
          </div>

          {(job.status === 'queued' || job.status === 'processing') && (
            <div style={styles.progressTrack}>
              <div style={styles.progressIndeterminate} />
            </div>
          )}

          {job.status === 'failed' && job.error && (
            <p style={styles.errorText}>{job.error}</p>
          )}

          {job.status === 'completed' && (
            <a
              href={getDownloadUrl(job.job_id)}
              download={job.output_filename}
              style={styles.downloadBtn}
            >
              ⬇️ Download {job.output_filename ?? 'converted file'}
            </a>
          )}
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
  empty: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-secondary)',
    padding: '40px 0',
    textAlign: 'center',
  },
  fileCard: {
    background: 'var(--bg-input)',
    borderRadius: 'var(--radius-md)',
    padding: '14px 16px',
    border: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  fileRow: { display: 'flex', justifyContent: 'space-between', gap: '8px' },
  fileLabel: { fontSize: '12px', color: 'var(--text-secondary)', flexShrink: 0 },
  fileValue: {
    fontSize: '13px',
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '200px',
    textAlign: 'right',
  },
  selectorRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
  },
  label: { fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' },
  select: {
    flex: 1,
    maxWidth: '160px',
    fontSize: '13px',
    fontWeight: 600,
    letterSpacing: '0.5px',
    cursor: 'pointer',
  },
  convertBtn: {
    background: 'linear-gradient(135deg, var(--accent), var(--accent-dim))',
    color: '#0d0d1a',
    fontWeight: 700,
    fontSize: '15px',
    padding: '12px',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    boxShadow: '0 4px 16px rgba(78,204,163,0.3)',
    transition: 'all 0.2s',
  },
  convertBtnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
    boxShadow: 'none',
  },
  spinner: {
    display: 'inline-block',
    width: '14px',
    height: '14px',
    border: '2px solid #0d0d1a',
    borderTopColor: 'transparent',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  statusCard: {
    background: 'var(--bg-input)',
    borderRadius: 'var(--radius-md)',
    padding: '14px 16px',
    border: '1px solid',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  statusHeader: { display: 'flex', alignItems: 'center', gap: '8px' },
  progressTrack: {
    height: '3px',
    background: 'var(--bg-surface)',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  progressIndeterminate: {
    height: '100%',
    width: '40%',
    background: 'var(--accent)',
    borderRadius: '2px',
    animation: 'indeterminate 1.5s ease infinite',
  },
  errorText: { fontSize: '12px', color: 'var(--danger)', lineHeight: 1.4 },
  downloadBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    background: 'rgba(38,222,129,0.12)',
    color: 'var(--success)',
    border: '1px solid var(--success)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px',
    fontWeight: 600,
    fontSize: '13px',
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'background 0.2s',
  },
}
