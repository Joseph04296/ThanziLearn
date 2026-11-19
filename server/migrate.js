const pool = require('./db');
const skills = {
  'Infection prevention basics': ['Clean your hands at the right moments', 'Choose and remove protective equipment safely', 'Handle sharps safely'],
  'Safe medication administration': ['Apply the five rights', 'Check allergies and spot high-risk medicines', 'Record and report errors'],
  'TB basics for frontline staff': ['Explain how TB spreads', 'Recognise possible TB symptoms', 'Reduce TB risk in your workplace'],
  'AI in healthcare: the basics': ['Explain what AI tools can and cannot do', 'Question AI results before acting on them', 'Protect patient data when using AI']
};
(async () => {
  await pool.query("alter table courses add column if not exists skills jsonb not null default '[]'");
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
  for (const [t, s] of Object.entries(skills)) await pool.query("update courses set skills=$1 where title=$2 and skills='[]'::jsonb", [JSON.stringify(s), t]);
  console.log('Migration done'); process.exit();
})();
