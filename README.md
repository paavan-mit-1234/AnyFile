# 🔄 AnyFile — Universal File Converter

AnyFile is a self-hosted, Docker-powered web application that converts files between dozens of formats across images, video, audio, documents, spreadsheets, archives, and ebooks — all from a clean dark-themed browser UI.

---

## ✨ Features

| Category    | Input / Output formats |
|-------------|------------------------|
| 🖼 Image    | JPG, PNG, BMP, WebP, GIF, TIFF, ICO, SVG (in) |
| 🎬 Video    | MP4, MKV, AVI, MOV, WebM, FLV, MPEG, WMV, M4V, OGV |
| 🎵 Audio    | MP3, WAV, AAC, FLAC, OGG, M4A, WMA, Opus, AIFF |
| 📄 Document | PDF, DOCX, TXT, HTML, ODT, RTF, Markdown |
| 📊 Sheet    | CSV, XLSX, XLS, ODS, TSV |
| 📦 Archive  | ZIP, TAR, GZ, BZ2, 7Z |
| 📚 Ebook    | EPUB, MOBI, AZW3, PDF |

- **Drag & drop** multi-file upload with progress bars
- **Auto-detection** of file type via extension + magic bytes
- **Background jobs** — conversions run async, poll for status
- **UUID-based storage** — no original filenames in paths
- **Secure** — filename sanitisation, path-traversal prevention

---

## 🚀 Quick Start

```bash
git clone https://github.com/your-org/AnyFile.git
cd AnyFile
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API docs (Swagger): http://localhost:8000/docs

---

## 🛠 Architecture

```
Browser  →  Nginx (port 3000)  →  React SPA
                   ↓ /api/
             FastAPI (port 8000)
                   ↓
        ┌──────────────────────┐
        │  File detection      │  python-magic + mimetypes
        │  Converters          │  Pillow / ffmpeg / pandoc /
        │                      │  LibreOffice / pandas / 7z
        │  Background jobs     │  asyncio + thread pool
        └──────────────────────┘
                   ↓
          /tmp/anyfile/{uploads,converted}
```

---

## 📡 API Reference

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/upload` | Upload file → returns `file_id` + metadata |
| `GET`  | `/files` | List all uploaded files |
| `GET`  | `/files/{file_id}` | Get file metadata |
| `DELETE` | `/files/{file_id}` | Delete uploaded file |
| `GET`  | `/formats/{file_id}` | Get valid output formats |
| `POST` | `/convert` | Start conversion `{file_id, target_format}` |
| `GET`  | `/jobs/{job_id}` | Poll job status |
| `GET`  | `/download/{job_id}` | Download converted file |
| `GET`  | `/health` | Health check |

---

## 💻 Local Development

### Backend

```bash
cd backend
pip install -r requirements.txt
mkdir -p /tmp/anyfile/uploads /tmp/anyfile/converted
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
# point VITE_API_URL at local backend
VITE_API_URL=http://localhost:8000 npm run dev
```

---

## ⚙️ Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `UPLOAD_DIR` | `/tmp/anyfile/uploads` | Where uploads are stored |
| `CONVERTED_DIR` | `/tmp/anyfile/converted` | Where converted files are stored |
| `VITE_API_URL` | `/api` | Frontend API base URL |

---

## 🔒 Security Notes

- All stored files use UUID names — original filenames are never used in paths.
- Filenames are sanitised on upload (path separators and special chars stripped).
- Download endpoint verifies the file path is inside `CONVERTED_DIR` before serving.
- No authentication is included — intended for local / trusted-network use only.
- Maximum upload size: **2 GB** per file.
