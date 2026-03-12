import { useCallback, useEffect, useState } from 'react'
import { getFiles } from './api/client'
import type { FileInfo } from './api/client'
import UploadPanel from './components/UploadPanel'
import FileList from './components/FileList'
import ConversionPanel from './components/ConversionPanel'
import type { CompletedJob } from './components/ConversionPanel'
import DownloadSection from './components/DownloadSection'

export default function App() {
  const [files, setFiles] = useState<FileInfo[]>([])
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null)
  const [completedJobs, setCompletedJobs] = useState<CompletedJob[]>([])

  // Load existing files on mount
  useEffect(() => {
    getFiles()
      .then(setFiles)
      .catch(console.error)
  }, [])

  const handleUploaded = useCallback((file: FileInfo) => {
    setFiles((prev) => {
      if (prev.some((f) => f.file_id === file.file_id)) return prev
      return [file, ...prev]
    })
    setSelectedFile(file)
  }, [])

  const handleDeleted = useCallback(
    (fileId: string) => {
      setFiles((prev) => prev.filter((f) => f.file_id !== fileId))
      if (selectedFile?.file_id === fileId) setSelectedFile(null)
    },
    [selectedFile],
  )

  const handleJobCompleted = useCallback((job: CompletedJob) => {
    setCompletedJobs((prev) => {
      if (prev.some((j) => j.jobId === job.jobId)) return prev
      return [job, ...prev]
    })
  }, [])

  return (
    <div style={appStyles.root}>
      {/* Header */}
      <header style={appStyles.header}>
        <div style={appStyles.headerInner}>
          <div style={appStyles.logo}>
            <span style={appStyles.logoIcon}>🔄</span>
            <div>
              <h1 style={appStyles.logoTitle}>AnyFile</h1>
              <p style={appStyles.logoSubtitle}>Universal File Converter</p>
            </div>
          </div>
          <div style={appStyles.headerRight}>
            <span style={appStyles.pill}>Images</span>
            <span style={appStyles.pill}>Video</span>
            <span style={appStyles.pill}>Audio</span>
            <span style={appStyles.pill}>Docs</span>
            <span style={appStyles.pill}>Ebooks</span>
            <span style={appStyles.pill}>Archives</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main style={appStyles.main}>
        <div style={appStyles.grid}>
          <UploadPanel onUploaded={handleUploaded} />
          <FileList
            files={files}
            selectedId={selectedFile?.file_id ?? null}
            onSelect={setSelectedFile}
            onDeleted={handleDeleted}
          />
          <ConversionPanel
            file={selectedFile}
            onJobCompleted={handleJobCompleted}
          />
        </div>

        {completedJobs.length > 0 && (
          <DownloadSection completedJobs={completedJobs} />
        )}
      </main>

      {/* Footer */}
      <footer style={appStyles.footer}>
        <p>AnyFile — Open source universal file converter · Docker-powered</p>
      </footer>

      {/* Global keyframe styles injected via a style tag */}
      <style>{`
        @keyframes indeterminate {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

const appStyles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-base)',
  },
  header: {
    background: 'var(--bg-surface)',
    borderBottom: '1px solid var(--border)',
    boxShadow: '0 2px 20px rgba(0,0,0,0.3)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  headerInner: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '16px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
  },
  logo: { display: 'flex', alignItems: 'center', gap: '14px' },
  logoIcon: { fontSize: '36px', filter: 'drop-shadow(0 0 8px rgba(78,204,163,0.5))' },
  logoTitle: {
    fontSize: '24px',
    fontWeight: 800,
    background: 'linear-gradient(135deg, var(--accent), #45aaf2)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    margin: 0,
  },
  logoSubtitle: { fontSize: '12px', color: 'var(--text-secondary)', margin: 0 },
  headerRight: { display: 'flex', gap: '6px', flexWrap: 'wrap' },
  pill: {
    background: 'rgba(78,204,163,0.1)',
    color: 'var(--accent)',
    border: '1px solid rgba(78,204,163,0.2)',
    borderRadius: '20px',
    padding: '4px 10px',
    fontSize: '11px',
    fontWeight: 600,
  },
  main: {
    flex: 1,
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '32px 24px',
    width: '100%',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
    gap: '24px',
    alignItems: 'start',
  },
  footer: {
    textAlign: 'center',
    padding: '20px',
    color: 'var(--text-muted)',
    fontSize: '12px',
    borderTop: '1px solid var(--border)',
  },
}
