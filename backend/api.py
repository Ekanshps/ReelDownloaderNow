from __future__ import annotations

import asyncio
import logging
import os
import re
import shutil
import tempfile
import time
import urllib.request
import zipfile
from pathlib import Path
from urllib.parse import urlparse

import yt_dlp
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, HttpUrl
from starlette.background import BackgroundTask

app = FastAPI(title="ReelDownloaderNow API", version="1.0.0")
logger = logging.getLogger("reeldownloadernow")
allowed_origins = [origin.strip() for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

INSTAGRAM_HOSTS = {"instagram.com", "www.instagram.com"}
INSTAGRAM_PATH = re.compile(r"^/(reel|p|tv|stories)/", re.IGNORECASE)
MAX_DOWNLOAD_BYTES = 100 * 1024 * 1024
RATE_LIMIT_WINDOW = 60
RATE_LIMIT_COUNT = 5
request_log: dict[str, list[float]] = {}


class DownloadRequest(BaseModel):
    url: HttpUrl
    format: str = "1080p"


def enforce_rate_limit(client_ip: str) -> None:
    now = time.monotonic()
    recent = [timestamp for timestamp in request_log.get(client_ip, []) if now - timestamp < RATE_LIMIT_WINDOW]
    if len(recent) >= RATE_LIMIT_COUNT:
        raise HTTPException(status_code=429, detail="Too many requests. Please wait a minute and try again.")
    recent.append(now)
    request_log[client_ip] = recent


def validate_instagram_url(url: str) -> None:
    parsed = urlparse(url)
    if parsed.hostname not in INSTAGRAM_HOSTS or not INSTAGRAM_PATH.match(parsed.path):
        raise HTTPException(status_code=400, detail="Only public Instagram post, reel, video, or story URLs are supported.")


def extraction_options(output_dir: str | None = None) -> dict:
    options: dict = {
        "noplaylist": True,
        "quiet": True,
        "no_warnings": True,
        "retries": 3,
        "fragment_retries": 3,
        "socket_timeout": 20,
        "http_headers": {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36", "Accept-Language": "en-US,en;q=0.9"},
    }
    if output_dir:
        options["outtmpl"] = os.path.join(output_dir, "%(id)s.%(ext)s")
    cookies_file = os.getenv("INSTAGRAM_COOKIES_FILE")
    if cookies_file and Path(cookies_file).is_file():
        options["cookiefile"] = cookies_file
    return options


def preview_public_media(url: str) -> dict:
    options = extraction_options()
    options["skip_download"] = True
    options["ignore_no_formats_error"] = True
    with yt_dlp.YoutubeDL(options) as downloader:
        info = downloader.extract_info(url, download=False)
    formats = info.get("formats") or []
    selected = next((item for item in reversed(formats) if item.get("vcodec") not in {None, "none"}), {})
    entries = [entry for entry in (info.get("entries") or []) if entry]
    media_kind = "carousel" if len(entries) > 1 else "video" if selected or info.get("vcodec") not in {None, "none"} else "image"
    size = selected.get("filesize") or selected.get("filesize_approx")
    return {"id": info.get("id"), "title": info.get("title") or "Instagram media", "creator": info.get("uploader") or info.get("channel") or "Instagram creator", "thumbnail": info.get("thumbnail"), "media_type": media_kind, "duration": info.get("duration"), "filesize": size, "items": len(entries) or 1}


def download_image_post(url: str, output_dir: str) -> tuple[Path, str, str]:
    options = extraction_options(output_dir)
    options.update({
        "noplaylist": True,
        "skip_download": True,
        "ignore_no_formats_error": True,
    })
    with yt_dlp.YoutubeDL(options) as downloader:
        info = downloader.extract_info(url, download=False)
    entries = [entry for entry in (info.get("entries") or [info]) if entry and (entry.get("url") or entry.get("thumbnail"))]
    if not entries:
        raise RuntimeError("Instagram did not return an image URL.")
    paths: list[Path] = []
    for index, entry in enumerate(entries, start=1):
        extension = entry.get("ext") or "jpg"
        path = Path(output_dir) / f"{info.get('id', 'instagram')}-{index}.{extension}"
        media_url = entry.get("url") or entry["thumbnail"]
        request = urllib.request.Request(media_url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(request, timeout=30) as response, path.open("wb") as file:
            file.write(response.read())
        paths.append(path)
    if len(paths) == 1:
        return paths[0], "image/jpeg", f"reeldownloadernow-{paths[0].stem}.jpg"
    archive = Path(output_dir) / f"reeldownloadernow-{info.get('id', 'instagram')}.zip"
    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as bundle:
        for path in paths:
            bundle.write(path, path.name)
    return archive, "application/zip", archive.name


def download_public_media(url: str, quality: str, output_dir: str) -> tuple[Path, str, str]:
    height = {"360p": 360, "720p": 720, "1080p": 1080}.get(quality, 1080)
    options = extraction_options(output_dir)
    options.update({"format": f"best[height<={height}]/best", "restrictfilenames": True})
    try:
        with yt_dlp.YoutubeDL(options) as downloader:
            info = downloader.extract_info(url, download=True)
            downloaded = Path(downloader.prepare_filename(info))
            candidates = list(Path(output_dir).glob(f"{downloaded.stem}.*"))
            if not candidates:
                raise RuntimeError("The media file was not created.")
            path = next((candidate for candidate in candidates if candidate.suffix == ".mp4"), candidates[0])
            if path.stat().st_size > MAX_DOWNLOAD_BYTES:
                raise HTTPException(status_code=413, detail="This file is larger than the 100 MB download limit.")
            return path, "video/mp4", f"reeldownloadernow-{path.stem}.mp4"
    except yt_dlp.utils.DownloadError as error:
        if "no video in this post" in str(error).lower():
            try:
                return download_image_post(url, output_dir)
            except Exception as image_error:
                logger.warning("Instagram image download failed for %s: %s", url, image_error)
        logger.warning("Instagram download failed for %s: %s", url, error)
        raise HTTPException(status_code=422, detail="Instagram blocked or could not provide this media. It may be private, unavailable, or rate-limited. Try a public reel/post URL copied directly from Instagram.") from error


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/download")
async def download_media(request: DownloadRequest, http_request: Request) -> FileResponse:
    enforce_rate_limit(http_request.client.host if http_request.client else "unknown")
    url = str(request.url)
    validate_instagram_url(url)
    quality = request.format.lower()
    if quality == "original image":
        quality = "original"
    if quality not in {"360p", "720p", "1080p", "original", "zip"}:
        raise HTTPException(status_code=400, detail="Format must be 360p, 720p, 1080p, original image, or ZIP.")

    temp_dir = tempfile.mkdtemp(prefix="reeldownloadernow-")
    try:
        downloader = download_image_post if quality in {"original", "zip"} else download_public_media
        media_path, media_type, filename = await asyncio.wait_for(asyncio.to_thread(downloader, url, quality, temp_dir) if downloader is download_public_media else asyncio.to_thread(downloader, url, temp_dir), timeout=90)
    except asyncio.TimeoutError as error:
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise HTTPException(status_code=504, detail="Instagram took too long to respond. Please try again.") from error
    except Exception:
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise
    return FileResponse(media_path, media_type=media_type, filename=filename, background=BackgroundTask(shutil.rmtree, temp_dir, ignore_errors=True))


@app.post("/api/preview")
async def preview_media(request: DownloadRequest, http_request: Request) -> dict:
    enforce_rate_limit(http_request.client.host if http_request.client else "unknown")
    url = str(request.url)
    validate_instagram_url(url)
    try:
        return await asyncio.wait_for(asyncio.to_thread(preview_public_media, url), timeout=30)
    except asyncio.TimeoutError as error:
        raise HTTPException(status_code=504, detail="Preview timed out. Please try again.") from error
    except yt_dlp.utils.DownloadError as error:
        raise HTTPException(status_code=422, detail="Instagram did not expose this public media. It may be private, deleted, or rate-limited.") from error
