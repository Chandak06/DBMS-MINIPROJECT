import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT ?? 3306),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE ?? "campus_lost_found",
  waitForConnections: true,
  connectionLimit: 2,
  timezone: "+00:00"
});

function normalizedEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

async function main() {
  const studentEmail = normalizedEmail(process.env.DEMO_STUDENT_EMAIL);
  if (!studentEmail || studentEmail === "your_google_email@gmail.com") {
    throw new Error("Set DEMO_STUDENT_EMAIL in .env.local to the real Google email you will use to sign in.");
  }

  const optionalStaffEmail = normalizedEmail(process.env.DEMO_STAFF_EMAIL);
  const optionalAdminEmail = normalizedEmail(process.env.DEMO_ADMIN_EMAIL);
  const emails = [studentEmail, optionalStaffEmail, optionalAdminEmail].filter(Boolean);
  if (new Set(emails).size !== emails.length) {
    throw new Error("DEMO_STUDENT_EMAIL, DEMO_STAFF_EMAIL and DEMO_ADMIN_EMAIL must be different accounts.");
  }

  const connection = await pool.getConnection();
  try {
    await connection.query("SET time_zone = '+00:00'");
    await connection.beginTransaction();

    await connection.execute(
      `INSERT INTO CAMPUS (campus_id, campus_name, street, city, state, postal_code)
       VALUES (1, 'Main Campus', '100 College Road', 'Bengaluru', 'Karnataka', '560001')
       ON DUPLICATE KEY UPDATE campus_name = VALUES(campus_name), city = VALUES(city), state = VALUES(state)`
    );

    const departments = [
      [1, "Computer Science and Engineering", 1],
      [2, "Electronics and Communication", 1],
      [3, "Business Studies", 1]
    ];
    for (const row of departments) {
      await connection.execute(
        `INSERT INTO DEPARTMENT (department_id, department_name, campus_id)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE department_name = VALUES(department_name), campus_id = VALUES(campus_id)`,
        row
      );
    }

    // Basic reference data.
    const categories = [[1, "Electronics"], [2, "Wallet / Purse"], [3, "ID / Cards"], [4, "Books / Notes"], [5, "Other"]];
    for (const [id, name] of categories) {
      await connection.execute(
        `INSERT INTO CATEGORY (category_id, category_name, description)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE category_name = VALUES(category_name)`,
        [id, name, `${name} category`]
      );
    }

    const locations = [
      [1, "Library", "Central Library", "Ground", "Entrance", "Academic", 1],
      [2, "Cafeteria", "Food Court", "Ground", "Dining Area", "Common", 1],
      [3, "CSE Lab", "Engineering Block", "2", "Lab Corridor", "Academic", 1],
      [4, "Auditorium", "Main Block", "1", "Lobby", "Event", 1]
    ];
    for (const row of locations) {
      await connection.execute(
        `INSERT INTO LOCATION (location_id, location_name, building, floor, area, type, campus_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE location_name = VALUES(location_name), building = VALUES(building), campus_id = VALUES(campus_id)`,
        row
      );
    }

    const demoUsers = [
      { first: "Demo", last: "Student", email: studentEmail, role: "STUDENT" },
      optionalStaffEmail ? { first: "Demo", last: "Staff", email: optionalStaffEmail, role: "STAFF" } : null,
      optionalAdminEmail ? { first: "Demo", last: "Admin", email: optionalAdminEmail, role: "ADMIN" } : null
    ].filter(Boolean);

    for (const u of demoUsers) {
      await connection.execute(
        `INSERT INTO \`USER\` (first_name, last_name, email, role, department_id)
         VALUES (?, ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE email = VALUES(email)`,
        [u.first, u.last, u.email, u.role]
      );
    }

    const [[student]] = await connection.execute("SELECT user_id FROM `USER` WHERE email = ?", [studentEmail]);
    await connection.execute(
      `INSERT INTO NOTIFICATION (title, message, type, user_id)
       SELECT 'Welcome', 'Your notification inbox is working.', 'GENERAL', ?
       WHERE NOT EXISTS (
         SELECT 1 FROM NOTIFICATION WHERE user_id = ? AND title = 'Welcome'
       )`,
      [student.user_id, student.user_id]
    );

    await connection.commit();
    console.log("Seed complete.");
    console.log(`Google STUDENT account: ${studentEmail}`);
    if (optionalStaffEmail) console.log(`Google STAFF account:   ${optionalStaffEmail}`);
    if (optionalAdminEmail) console.log(`Google ADMIN account:   ${optionalAdminEmail}`);
    
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


