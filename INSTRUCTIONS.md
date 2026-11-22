# ThanziLearn v1 setup

Folders: `server/` (Node + Express + PostgreSQL) and `client/` (React + Vite + Tailwind).

## 1. Database (Neon)
Create a Neon project and copy the connection string.

## 2. Server (PowerShell)
```
cd server
copy .env.example .env      # then edit .env: paste DATABASE_URL, set JWT_SECRET
npm install
npm run seed                # creates tables and staff accounts
npm run seed:courses        # adds the medication, TB and AI courses with lessons and quizzes
npm start                   # http://localhost:5000
```

## 3. Client (new PowerShell window)
```
cd client
copy .env.example .env
npm install
npm run dev                 # http://localhost:5173
```

## 4. Logins (change these passwords before going live)
- Admin: admin@thanzilearn.mw / Password123
- Supervisor: supervisor@thanzilearn.mw / Password123
- Learners: register from the login page.

## 5. Adding courses
Log in as admin, open "New course", fill the form and edit the lessons and questions JSON. `answer` is the index of the correct option, starting at 0. A lesson's `video_url` must be an embed link (e.g. https://www.youtube.com/embed/VIDEO_ID).

## 6. Learner enrolment
Learners enroll from a course page before opening lessons. Enrolled courses appear in My Learning, and the admin progress page lists enrolled learners with their lesson and assessment status.

## 7. Deploy
- Render (web service): root `server`, build `npm install`, start `npm start`. Env vars: DATABASE_URL, JWT_SECRET, CLIENT_URL (your Vercel URL).
- Vercel: root `client`, env var VITE_API_URL = your Render URL.
- Run `npm run seed` once against the production database, then `npm run seed:courses` to add the medication, TB and AI courses. Both scripts are safe to re-run: they skip users and courses that already exist. The `enrollments` table is created automatically when the API starts.

## 8. Certificates
- When a learner passes a course assessment, the certificate page shows a **Download certificate (PDF)** button.
- The designed PDF lives at `server/assets/ThanziLearn-Certificate.pdf`. It is based on `client/ThanziLearn-Cerificate.pdf` with the baked-in `Full Name`, `Course Name` and date text removed, so the API can draw the real values on the same lines.
- Fonts are in `server/assets/fonts/` (Cormorant Infant Bold for the name, Roboto Bold for the course/date). Their licence files are included.
- `GET /api/certificates/:courseId/pdf` verifies the signed-in learner has a passing attempt, then fills and returns the PDF. The issue date comes from the first passing attempt.

## Notes
- The sample courses are placeholder content. Have a qualified clinician review any medical content before real learners use it.
- The public catalogue contains the medication, TB and AI courses only. If you add a course, give it one of the three original images or set an `image` path, and use the admin Hide/Show control to keep the public list tidy.
- Left for later versions: friendlier course editor, file uploads, user role management screen, password reset, learning paths.
