const fs = require('fs'), bcrypt = require('bcryptjs'), pool = require('./db');
(async () => {
  await pool.query(fs.readFileSync(__dirname + '/schema.sql', 'utf8'));
  if (+(await pool.query('select count(*) from users')).rows[0].count === 0) {
    const h = await bcrypt.hash('Password123', 10);
    await pool.query("insert into users(name,email,password,role) values('Admin','admin@thanzilearn.mw',$1,'admin'),('Supervisor','supervisor@thanzilearn.mw',$1,'supervisor')", [h]);
  }
  // Courses are seeded by seed-courses.js so fresh setups get only the three
  // intended catalogue courses (medication, TB and AI).
  console.log('Database ready'); process.exit();
})();
