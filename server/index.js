require('dotenv').config();
const express = require('express'), cors = require('cors'), bcrypt = require('bcryptjs'), jwt = require('jsonwebtoken'), pool = require('./db');
const { generateCertificatePdf } = require('./certificate');
const q = (s, p) => pool.query(s, p).then(r => r.rows);
const app = express();

// CLIENT_URL may be a comma-separated list and may accidentally include a
// trailing slash. Browsers never send the slash, so normalise both sides or
// every request from the deployed site gets blocked by CORS.
const allowedOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map(s => s.trim().replace(/\/+$/, ''))
  .filter(Boolean);
app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    const clean = origin.replace(/\/+$/, '');
    const localDev = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(clean);
    if (!allowedOrigins.length || allowedOrigins.includes(clean) || localDev) return cb(null, true);
    return cb(null, false);
  },
}));
app.use(express.json());
const sign = u => jwt.sign({ id: u.id, role: u.role, name: u.name }, process.env.JWT_SECRET, { expiresIn: '7d' });
const auth = roles => (req, res, next) => {
  try { req.user = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), process.env.JWT_SECRET); }
  catch { return res.status(401).json({ error: 'Please log in again' }); }
  if (roles && !roles.includes(req.user.role)) return res.status(403).json({ error: 'You do not have access to this' });
  next();
};
const wrap = f => (req, res) => f(req, res).catch(e => { console.error(e); res.status(500).json({ error: 'Server error' }); });

app.post('/api/auth/register', wrap(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password || password.length < 6) return res.status(400).json({ error: 'Enter your name, email and a password of 6+ characters' });
  if ((await q('select 1 from users where email=$1', [email.toLowerCase()])).length) return res.status(400).json({ error: 'That email is already registered' });
  const [u] = await q('insert into users(name,email,password) values($1,$2,$3) returning id,name,role', [name, email.toLowerCase(), await bcrypt.hash(password, 10)]);
  res.json({ token: sign(u), user: u });
}));
app.post('/api/auth/login', wrap(async (req, res) => {
  const [u] = await q('select * from users where email=$1', [(req.body.email || '').toLowerCase()]);
  if (!u || !(await bcrypt.compare(req.body.password || '', u.password))) return res.status(401).json({ error: 'Wrong email or password' });
  res.json({ token: sign(u), user: { id: u.id, name: u.name, role: u.role } });
}));

// Account settings: read and update the signed-in user's own details.
app.get('/api/me', auth(), wrap(async (req, res) => {
  const [u] = await q('select id,name,email,role from users where id=$1', [req.user.id]);
  if (!u) return res.status(404).json({ error: 'Account not found' });
  res.json(u);
}));
app.patch('/api/me', auth(), wrap(async (req, res) => {
  const name = (req.body.name || '').trim();
  const email = (req.body.email || '').trim().toLowerCase();
  if (name.length < 2) return res.status(400).json({ error: 'Enter your full name' });
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address' });
  if ((await q('select 1 from users where email=$1 and id<>$2', [email, req.user.id])).length) {
    return res.status(400).json({ error: 'That email is already in use' });
  }
  const [u] = await q('update users set name=$1,email=$2 where id=$3 returning id,name,email,role', [name, email, req.user.id]);
  res.json({ token: sign(u), user: u });
}));
app.post('/api/me/password', auth(), wrap(async (req, res) => {
  const { current, password } = req.body;
  if (!password || password.length < 6) return res.status(400).json({ error: 'Your new password must be at least 6 characters' });
  const [u] = await q('select password from users where id=$1', [req.user.id]);
  if (!u || !(await bcrypt.compare(current || '', u.password))) return res.status(400).json({ error: 'Your current password is incorrect' });
  await q('update users set password=$1 where id=$2', [await bcrypt.hash(password, 10), req.user.id]);
  res.json({ ok: true });
}));

const optAuth = (req, res, next) => { try { req.user = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), process.env.JWT_SECRET); } catch {} next(); };
app.get('/api/courses', optAuth, wrap(async (req, res) => {
  res.json(await q(`select c.id,c.title,c.description,c.category,c.skills,
    (select count(*) from lessons where course_id=c.id)::int as lessons,
    (select coalesce(sum(duration_min),0) from lessons where course_id=c.id)::int as minutes,
    (select count(*) from progress p join lessons l on l.id=p.lesson_id where l.course_id=c.id and p.user_id=$1)::int as done,
    coalesce((select bool_or(passed) from attempts a where a.course_id=c.id and a.user_id=$1),false) as passed,
    exists(select 1 from enrollments e where e.course_id=c.id and e.user_id=$1) as enrolled
    from courses c where not c.hidden order by c.id`, [req.user ? req.user.id : 0]));
}));
app.get('/api/courses/:id/preview', optAuth, wrap(async (req, res) => {
  const isAdmin = req.user?.role === 'admin';
  const [c] = await q(`select c.id,c.title,c.description,c.category,c.pass_mark,c.skills,
    jsonb_array_length(c.questions) as questions,c.hidden,
    exists(select 1 from enrollments e where e.course_id=c.id and e.user_id=$3) as enrolled
    from courses c where c.id=$1 and (not c.hidden or $2)`, [req.params.id, isAdmin, req.user ? req.user.id : null]);
  if (!c) return res.status(404).json({ error: 'Course not found' });
  res.json({ course: c, lessons: await q('select id,title,duration_min from lessons where course_id=$1 order by position', [c.id]) });
}));
app.post('/api/courses/:id/enroll', auth(), wrap(async (req, res) => {
  const [c] = await q('select id from courses where id=$1 and (not hidden or $2)', [req.params.id, req.user.role === 'admin']);
  if (!c) return res.status(404).json({ error: 'Course not found' });
  await q('insert into enrollments(user_id,course_id) values($1,$2) on conflict(user_id,course_id) do nothing', [req.user.id, c.id]);
  const [enrollment] = await q('select enrolled_at from enrollments where user_id=$1 and course_id=$2', [req.user.id, c.id]);
  res.json({ course_id: c.id, enrolled_at: enrollment.enrolled_at });
}));
app.get('/api/me/enrollments', auth(), wrap(async (req, res) => {
  res.json(await q(`select c.id,c.title,c.description,c.category,c.skills,e.enrolled_at,
    (select count(*) from lessons where course_id=c.id)::int as lessons,
    (select coalesce(sum(duration_min),0) from lessons where course_id=c.id)::int as minutes,
    (select count(*) from progress p join lessons l on l.id=p.lesson_id where l.course_id=c.id and p.user_id=e.user_id)::int as done,
    coalesce((select bool_or(passed) from attempts a where a.course_id=c.id and a.user_id=e.user_id),false) as passed,
    true as enrolled
    from enrollments e join courses c on c.id=e.course_id
    where e.user_id=$1 and not c.hidden order by e.enrolled_at desc,c.id`, [req.user.id]));
}));
app.get('/api/courses/:id', auth(), wrap(async (req, res) => {
  const [c] = await q('select * from courses where id=$1 and (not hidden or $2)', [req.params.id, req.user.role === 'admin']);
  if (!c) return res.status(404).json({ error: 'Course not found' });
  const [enrollment] = await q('select 1 from enrollments where user_id=$1 and course_id=$2', [req.user.id, c.id]);
  if (!enrollment) return res.status(403).json({ error: 'Enroll in this course before starting lessons' });
  const lessons = await q('select id,title,body,video_url,duration_min from lessons where course_id=$1 order by position', [c.id]);
  const done = (await q('select p.lesson_id from progress p join lessons l on l.id=p.lesson_id where p.user_id=$1 and l.course_id=$2', [req.user.id, c.id])).map(r => r.lesson_id);
  const [a] = await q('select coalesce(bool_or(passed),false) as passed from attempts where user_id=$1 and course_id=$2', [req.user.id, c.id]);
  res.json({ course: { id: c.id, title: c.title, description: c.description, pass_mark: c.pass_mark, questions: c.questions.map(x => ({ q: x.q, options: x.options })) }, lessons, done, passed: a.passed });
}));
app.post('/api/lessons/:id/complete', auth(), wrap(async (req, res) => {
  const [lesson] = await q('select course_id from lessons where id=$1', [req.params.id]);
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
  const [enrollment] = await q('select 1 from enrollments where user_id=$1 and course_id=$2', [req.user.id, lesson.course_id]);
  if (!enrollment) return res.status(403).json({ error: 'Enroll in this course before recording progress' });
  await q('insert into progress(user_id,lesson_id) values($1,$2) on conflict do nothing', [req.user.id, req.params.id]);
  res.json({ ok: true });
}));
app.post('/api/courses/:id/quiz', auth(), wrap(async (req, res) => {
  const [c] = await q('select questions,pass_mark from courses where id=$1', [req.params.id]);
  if (!c) return res.status(404).json({ error: 'Course not found' });
  const [enrollment] = await q('select 1 from enrollments where user_id=$1 and course_id=$2', [req.user.id, req.params.id]);
  if (!enrollment) return res.status(403).json({ error: 'Enroll in this course before taking the assessment' });
  const a = req.body.answers || [];
  const right = c.questions.filter((x, i) => a[i] === x.answer).length;
  const score = Math.round(100 * right / (c.questions.length || 1)), passed = score >= c.pass_mark;
  await q('insert into attempts(user_id,course_id,score,passed) values($1,$2,$3,$4)', [req.user.id, req.params.id, score, passed]);
  res.json({ score, passed, correct: right, total: c.questions.length, pass_mark: c.pass_mark });
}));
app.get('/api/certificates/:id/pdf', auth(), wrap(async (req, res) => {
  const [row] = await q(`select u.name as learner_name,c.title as course_title,
    (select min(a.created_at) from attempts a where a.user_id=u.id and a.course_id=c.id and a.passed) as issued_at
    from users u join courses c on c.id=$2
    where u.id=$1 and exists (select 1 from attempts a where a.user_id=u.id and a.course_id=c.id and a.passed)`,
  [req.user.id, req.params.id]);
  if (!row) return res.status(403).json({ error: 'Pass the assessment for this course to unlock your certificate' });

  const pdf = await generateCertificatePdf(row);
  const slug = String(row.course_title || 'course').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="ThanziLearn-Certificate-${slug}.pdf"`,
    'Cache-Control': 'no-store',
  });
  res.send(pdf);
}));

app.get('/api/admin/overview', auth(['admin', 'supervisor']), wrap(async (req, res) => {
  res.json(await q(`select u.id,u.name,u.email,c.id as course_id,c.title,e.enrolled_at,
    (select count(*) from lessons l where l.course_id=c.id)::int as total,
    (select count(*) from progress p join lessons l on l.id=p.lesson_id where p.user_id=u.id and l.course_id=c.id)::int as done,
    coalesce((select bool_or(passed) from attempts a where a.user_id=u.id and a.course_id=c.id),false) as passed
    from enrollments e join users u on u.id=e.user_id join courses c on c.id=e.course_id
    where u.role='learner' order by u.name,c.id`));
}));
const clean = b => {
  const lessons = (b.lessons || []).filter(l => (l.title || '').trim());
  const questions = (b.questions || []).filter(x => (x.q || '').trim()).map(x => ({ q: x.q.trim(), options: (x.options || []).map(o => (o || '').trim()), answer: x.answer }));
  if (!(b.title || '').trim() || !lessons.length) return { error: 'Add a title and at least one lesson' };
  if (!questions.length || questions.some(x => x.options.length < 2 || x.options.some(o => !o) || !(x.answer >= 0 && x.answer < x.options.length))) return { error: 'Add at least one quiz question, fill in every option, and pick the correct answer' };
  return { lessons, questions };
};
const sk = b => JSON.stringify((b.skills || []).map(x => (x || '').trim()).filter(Boolean));
const pm = b => Math.min(100, Math.max(1, +b.pass_mark || 70));
const putLesson = (cid, i, l) => l.id
  ? q('update lessons set position=$1,title=$2,body=$3,video_url=$4,duration_min=$7 where id=$5 and course_id=$6', [i + 1, l.title, l.body, l.video_url || null, l.id, cid, +l.duration_min || 5])
  : q('insert into lessons(course_id,position,title,body,video_url,duration_min) values($1,$2,$3,$4,$5,$6)', [cid, i + 1, l.title, l.body, l.video_url || null, +l.duration_min || 5]);
app.post('/api/admin/courses', auth(['admin']), wrap(async (req, res) => {
  const v = clean(req.body); if (v.error) return res.status(400).json(v);
  const b = req.body;
  const [c] = await q('insert into courses(title,description,category,pass_mark,questions,skills) values($1,$2,$3,$4,$5,$6) returning id', [b.title, b.description, b.category, pm(b), JSON.stringify(v.questions), sk(b)]);
  for (const [i, l] of v.lessons.entries()) await putLesson(c.id, i, { ...l, id: null });
  res.json({ id: c.id });
}));
// The admin list intentionally includes hidden courses so they can be previewed
// and restored. The public catalogue at /api/courses filters them out.
app.get('/api/admin/courses', auth(['admin']), wrap(async (req, res) => {
  res.json(await q(`select c.id,c.title,c.description,c.category,c.pass_mark,c.skills,c.hidden,
    (select count(*) from lessons l where l.course_id=c.id)::int as lessons,
    (select coalesce(sum(duration_min),0) from lessons l where l.course_id=c.id)::int as minutes,
    (select count(*) from attempts a where a.course_id=c.id and a.passed)::int as certificates
    from courses c order by c.id`));
}));
app.patch('/api/admin/courses/:id/visibility', auth(['admin']), wrap(async (req, res) => {
  if (typeof req.body.hidden !== 'boolean') return res.status(400).json({ error: 'hidden must be true or false' });
  const [c] = await q('update courses set hidden=$1 where id=$2 returning id,title,hidden', [req.body.hidden, req.params.id]);
  if (!c) return res.status(404).json({ error: 'Course not found' });
  res.json(c);
}));
app.get('/api/admin/courses/:id', auth(['admin']), wrap(async (req, res) => {
  const [c] = await q('select * from courses where id=$1', [req.params.id]);
  if (!c) return res.status(404).json({ error: 'Course not found' });
  res.json({ ...c, lessons: await q('select id,title,body,duration_min,coalesce(video_url,\'\') as video_url from lessons where course_id=$1 order by position', [c.id]) });
}));
app.put('/api/admin/courses/:id', auth(['admin']), wrap(async (req, res) => {
  const v = clean(req.body); if (v.error) return res.status(400).json(v);
  const b = req.body, id = req.params.id;
  await q('update courses set title=$1,description=$2,category=$3,pass_mark=$4,questions=$5,skills=$7 where id=$6', [b.title, b.description, b.category, pm(b), JSON.stringify(v.questions), id, sk(b)]);
  await q('delete from lessons where course_id=$1 and not (id = any($2::int[]))', [id, v.lessons.filter(l => l.id).map(l => l.id)]);
  for (const [i, l] of v.lessons.entries()) await putLesson(id, i, l);
  res.json({ id });
}));
app.delete('/api/admin/courses/:id', auth(['admin']), wrap(async (req, res) => { await q('delete from courses where id=$1', [req.params.id]); res.json({ ok: true }); }));
app.get('/api/admin/users', auth(['admin']), wrap(async (req, res) => res.json(await q('select id,name,email,role from users order by id'))));
app.patch('/api/admin/users/:id/role', auth(['admin']), wrap(async (req, res) => {
  if (!['learner', 'supervisor', 'admin'].includes(req.body.role)) return res.status(400).json({ error: 'Invalid role' });
  if (+req.params.id === req.user.id) return res.status(400).json({ error: 'You cannot change your own role' });
  await q('update users set role=$1 where id=$2', [req.body.role, req.params.id]); res.json({ ok: true });
}));

app.get('/api/admin/stats', auth(['admin']), wrap(async (req, res) => {
  const [r] = await q(`select (select count(*) from users where role<>'admin')::int as learners,
    (select count(*) from courses)::int as courses,
    (select count(*) from enrollments)::int as enrollments,
    (select count(*) from progress)::int as lessons_done,
    (select count(distinct (user_id,course_id)) from attempts where passed)::int as certificates`);
  res.json(r);
}));
app.get('/', (req, res) => res.send('ThanziLearn API is running'));

// Keep older databases in step with the columns the API queries. Running this
// on boot means a deploy never fails just because a migration was forgotten.
(async () => {
  try {
    await pool.query("alter table courses add column if not exists skills jsonb not null default '[]'");
    await pool.query('alter table courses add column if not exists hidden boolean not null default false');
    await pool.query('alter table lessons add column if not exists duration_min int not null default 5');
    await pool.query(`create table if not exists enrollments(
      user_id int references users(id) on delete cascade,
      course_id int references courses(id) on delete cascade,
      enrolled_at timestamptz not null default now(),
      primary key(user_id,course_id)
    )`);
    await pool.query(`insert into enrollments(user_id,course_id)
      select distinct p.user_id,l.course_id from progress p join lessons l on l.id=p.lesson_id
      where true on conflict(user_id,course_id) do nothing`);
    await pool.query(`insert into enrollments(user_id,course_id)
      select distinct user_id,course_id from attempts where true
      on conflict(user_id,course_id) do nothing`);
  } catch (e) {
    console.error('Schema check failed:', e.message);
  }
  app.listen(process.env.PORT || 5000, () => console.log('API running'));
})();
