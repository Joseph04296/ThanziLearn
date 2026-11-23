const pool = require('./db');
const { courses } = require('./course-content');

// `node seed-courses.js` inserts courses that are missing.
// `node seed-courses.js --update` also replaces the content of existing
// catalogue courses (matched by title) with the structured content below.
// Lesson IDs are preserved where titles match so existing learner progress
// and attempts keep working; removed lessons are dropped.
const update = process.argv.includes('--update');

(async () => {
  for (const c of courses) {
    const existing = await pool.query('select id from courses where title=$1', [c.title]);
    let cid;

    if (existing.rowCount) {
      cid = existing.rows[0].id;
      if (!update) continue;
      await pool.query(
        'update courses set description=$1,category=$2,questions=$3,skills=$4,modules=$5,duration_label=$6 where id=$7',
        [c.description, c.category, JSON.stringify(c.questions), JSON.stringify(c.skills), JSON.stringify(c.modules), c.durationLabel, cid]
      );
      // Update lessons in place where titles match so progress (which
      // references lesson IDs) survives. New titles get new rows; titles that
      // no longer exist are removed, along with their progress.
      const old = await pool.query('select id,title from lessons where course_id=$1', [cid]);
      const byTitle = new Map(old.rows.map(l => [l.title, l.id]));
      const used = new Set();
      for (const [i, l] of c.lessons.entries()) {
        const oldId = byTitle.get(l.title);
        if (oldId) {
          used.add(oldId);
          await pool.query('update lessons set position=$1,body=$2,duration_min=$3 where id=$4', [i + 1, l.body, l.duration_min, oldId]);
        } else {
          await pool.query(
            'insert into lessons(course_id,position,title,body,duration_min) values($1,$2,$3,$4,$5)',
            [cid, i + 1, l.title, l.body, l.duration_min]
          );
        }
      }
      for (const row of old.rows) {
        if (!used.has(row.id)) await pool.query('delete from lessons where id=$1', [row.id]);
      }
      console.log('Updated:', c.title);
    } else {
      const { rows: [r] } = await pool.query(
        'insert into courses(title,description,category,questions,skills,modules,duration_label) values($1,$2,$3,$4,$5,$6,$7) returning id',
        [c.title, c.description, c.category, JSON.stringify(c.questions), JSON.stringify(c.skills), JSON.stringify(c.modules), c.durationLabel]
      );
      cid = r.id;
      for (const [i, l] of c.lessons.entries()) {
        await pool.query(
          'insert into lessons(course_id,position,title,body,duration_min) values($1,$2,$3,$4,$5)',
          [cid, i + 1, l.title, l.body, l.duration_min]
        );
      }
      console.log('Added:', c.title);
    }
  }
  console.log('Done.');
  await pool.end();
})().catch(e => { console.error(e); process.exit(1); });
