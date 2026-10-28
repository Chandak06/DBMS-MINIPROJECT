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

async function main() {
  const connection = await pool.getConnection();
  try {
    await connection.query("SET time_zone = '+00:00'");
    await connection.beginTransaction();

    await connection.execute(
      `INSERT INTO CAMPUS (campus_id, campus_name, street, city, state, postal_code)
       VALUES (1, 'Main Campus', '100 College Road', 'Bengaluru', 'Karnataka', '560001')
       ON DUPLICATE KEY UPDATE campus_id = campus_id`
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
         ON DUPLICATE KEY UPDATE department_id = department_id`,
        row
      );
    }

    // Basic reference data.
    const categories = [[1, "Electronics"], [2, "Wallet / Purse"], [3, "ID / Cards"], [4, "Books / Notes"], [5, "Other"]];
    for (const [id, name] of categories) {
      await connection.execute(
        `INSERT INTO CATEGORY (category_id, category_name, description)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE category_id = category_id`,
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
         ON DUPLICATE KEY UPDATE location_id = location_id`,
        row
      );
    }

    await connection.commit();
    console.log("Reference seed complete. No login accounts or Admins were created.");

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


