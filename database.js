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
               -- dog_breed TEXT,          -- Existing, but will be less used for multi-dog
                num_dogs INTEGER,
                start_datetime TEXT,
                end_datetime TEXT,
                location TEXT,
                notes TEXT,
               -- dog_gender TEXT,         -- Existing, but will be less used for multi-dog
                booking_date TEXT DEFAULT CURRENT_TIMESTAMP,
                -- NEW COLUMN: To store an array of dog objects as a JSON string
                dogs_data_json TEXT
            )
        `, (createErr) => {
            if (createErr) {
                console.error('Error creating bookings table:', createErr.message);
            } else {
                console.log('Bookings table created or already exists.');
            }
        });

        // --- Add this block for the contact_messages table ---
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
        // --- End of new block --
    }
});

module.exports = db; // Export the database object for use in other files