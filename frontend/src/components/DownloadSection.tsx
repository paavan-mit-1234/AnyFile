import { getDownloadUrl } from '../api/client'

interface CompletedJob {
  jobId: string
  outputFilename: string
  targetFormat: string
}

interface Props {
  completedJobs: CompletedJob[]
}

export default function DownloadSection({ completedJobs }: Props) {
  if (completedJobs.length === 0) return null

  return (
    <div style={styles.panel}>
      <h2 style={styles.title}>
        <span>⬇️</span> Completed Conversions
        <span style={styles.count}>{completedJobs.length}</span>
      </h2>
      <div style={styles.list}>
        {completedJobs.map((job) => (
          <div key={job.jobId} style={styles.item}>
            <div style={styles.itemInfo}>
              <span style={styles.itemIcon}>📄</span>
              <div>
                <p style={styles.itemName}>{job.outputFilename}</p>
                <p style={styles.itemMeta}>
                  Format: <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
                    {job.targetFormat.toUpperCase()}
                  </span>
                </p>
              </div>
            </div>
            <a
              href={getDownloadUrl(job.jobId)}
              download={job.outputFilename}
              style={styles.downloadBtn}
            >
              ⬇️ Download
            </a>
          </div>
        ))}
      </div>
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
    marginTop: '24px',
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
    color: 'var(--success)',
    borderRadius: '20px',
    padding: '2px 10px',
    fontSize: '12px',
    fontWeight: 700,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '300px',
    overflowY: 'auto',
  },
  item: {
    background: 'var(--bg-input)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 14px',
    border: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
  },
  itemInfo: { display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 },
  itemIcon: { fontSize: '20px', flexShrink: 0 },
  itemName: {
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '260px',
  },
  itemMeta: { fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' },
  downloadBtn: {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    background: 'rgba(78,204,163,0.12)',
    color: 'var(--accent)',
    border: '1px solid var(--accent-dim)',
    borderRadius: 'var(--radius-sm)',
    padding: '6px 12px',
    fontWeight: 600,
    fontSize: '12px',
    cursor: 'pointer',
    textDecoration: 'none',
    fontFamily: 'inherit',
    transition: 'background 0.2s',
  },
}
