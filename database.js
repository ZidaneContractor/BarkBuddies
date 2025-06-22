const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Define the path to your database file
const dbPath = path.resolve(__dirname, 'bark_buddies.db');

// Create a new database connection
// If the file doesn't exist, it will be created.
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        // Create the bookings table if it doesn't exist
        db.run(`
            CREATE TABLE IF NOT EXISTS bookings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                num_dogs INTEGER,
                start_datetime TEXT,
                end_datetime TEXT,
                location TEXT,
                notes TEXT,
                booking_date TEXT DEFAULT CURRENT_TIMESTAMP,
                dogs_data_json TEXT,      -- Holds all dog details as JSON
                total_cost REAL           -- NEW COLUMN: To store the calculated total cost
            )
        `, (createErr) => {
            if (createErr) {
                console.error('Error creating bookings table:', createErr.message);
            } else {
                console.log('Bookings table created or already exists.');
            }
        });

        // Create the contact_messages table if it doesn't exist
        db.run(`
            CREATE TABLE IF NOT EXISTS contact_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                subject TEXT,
                message TEXT NOT NULL,
                submission_date TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `, (createErr) => {
            if (createErr) {
                console.error('Error creating contact_messages table:', createErr.message);
            } else {
                console.log('Contact messages table created or already exists.');
            }
        });
    }
});

module.exports = db; // Export the database object for use in other files
