require("dotenv").config();

const bcrypt = require("bcryptjs");
const pool = require("./db");

async function main() {
  const username = "admin";
  const password = "admin12345";
  const hash = await bcrypt.hash(password, 12);

  await pool.query(
    `INSERT INTO users (username, password_hash, role)
     VALUES ($1, $2, 'admin')
     ON CONFLICT (username)
     DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'admin'`,
    [username, hash]
  );

  console.log("Admin account ready.");
  console.log("Username:", username);
  console.log("Password:", password);

  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});
