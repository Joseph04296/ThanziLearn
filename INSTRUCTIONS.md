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

## 5. Course structure and the learning dashboard
All three catalogue courses use the same eight-block structure, so learners know what to expect: **Introduction, Module 1–5, Final assessment, Completion**. Each module has a short introduction, 2–4 content sections, a relevant image or infographic, a key takeaway and one knowledge-check question. Categories are fixed: Safe Medication Administration → `Patient Safety`, TB Basics for Frontline Staff → `Public Health`, AI in Healthcare: The Basics → `Digital Health`.

The structured source for all three courses is `server/course-content.js`. It exports each course with `modules` (the dashboard blocks) plus flattened `lessons` and `questions` for the database. The left sidebar of the course player lists the blocks with the logo and course name at the top; the centre pane shows the selected block's content. Progress is still tracked per lesson, so a module is complete when all of its section lessons are done. The final assessment unlocks after all modules are complete; passing unlocks the certificate.

When editing a course in admin, the **Dashboard modules** textarea accepts the block JSON. `type` must be one of `intro`, `module`, `assessment` or `completion`. Module sections must match the lessons below in order and number, because each section maps to one progress-tracked lesson. `answer` is the index of the correct option, starting at 0. A lesson's `video_url` must be an embed link (e.g. https://www.youtube.com/embed/VIDEO_ID).

## 6. Learner enrolment
Learners enroll from a course page before opening lessons. Enrolled courses appear in My Learning, and the admin progress page lists enrolled learners with their lesson and assessment status.

## 7. Deploy
- Render (web service): root `server`, build `npm install`, start `npm start`. Env vars: DATABASE_URL, JWT_SECRET, CLIENT_URL (your Vercel URL).
- Vercel: root `client`, env var VITE_API_URL = your Render URL.
- Run `npm run seed` once against the production database, then `npm run seed:courses` to add the medication, TB and AI courses. Both scripts are safe to re-run: they skip users and courses that already exist. The `enrollments`, `modules` and `duration_label` columns/tables are created automatically when the API starts.
- To replace the content of existing catalogue courses with the latest structured content from `server/course-content.js`, run `npm run seed:courses -- --update`. Lessons whose titles still exist keep their IDs, so learner progress and attempts survive; removed lessons and their progress are deleted. Run this on the production database after deploying the server changes.

## 8. Certificates
- When a learner passes a course assessment, the certificate page shows a **Download certificate (PDF)** button.
- The designed PDF lives at `server/assets/ThanziLearn-Certificate.pdf`. It is based on `client/ThanziLearn-Cerificate.pdf` with the baked-in `Full Name`, `Course Name` and date text removed, so the API can draw the real values on the same lines.
- Fonts are in `server/assets/fonts/` (Cormorant Infant Bold for the name, Roboto Bold for the course/date). Their licence files are included.
- `GET /api/certificates/:courseId/pdf` verifies the signed-in learner has a passing attempt, then fills and returns the PDF. The issue date comes from the first passing attempt.

## Notes
- The clinical courses are based on WHO guidance, Malawi's 2024 TB and Leprosy guidelines and WHO AI ethics guidance, but they have not been formally reviewed. Have a qualified clinician review the medication and TB content, and review the AI content for privacy and accuracy, before real learners use them. Record the author, reviewer, review date, reference guidelines, approval status and next review date alongside the course record.
- The public catalogue contains the medication, TB and AI courses only. If you add a course, give it one of the three original images or set an `image` path, and use the admin Hide/Show control to keep the public list tidy.
- Left for later versions: friendlier course editor, file uploads, user role management screen, password reset, learning paths.
