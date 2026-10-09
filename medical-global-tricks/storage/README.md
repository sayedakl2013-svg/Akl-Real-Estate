Private file storage (summary PDFs, uploaded lesson videos, teaser video).
Nothing in this folder is committed: the repository is public and course
material is paid content. Files are served only through `/api/files/*`
and `/api/videos/*`, which check the student's access first.
In production, point `STORAGE_DIR` at a persistent volume (or replace
`lib/storage.ts` with an S3/R2 driver that issues short-lived signed URLs).
