const express = require('express');
const path = require('path');
const bodyParser = require('body-parser'); // For parsing form data
const db = require('./database'); // This will be created in the next step

const app = express();
const port = 3000;

// Middleware to parse URL-encoded form data (for traditional HTML forms)
app.use(bodyParser.urlencoded({ extended: true }));

// Middleware to parse JSON data (useful if you ever send data via JavaScript fetch/axios)
app.use(bodyParser.json());

// Serve static files (HTML, CSS, images) from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// --- Routes for serving your HTML pages ---
// Route for the home page (handles 'http://localhost:3000/' directly)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'homepage.html'));
});

// Route for the booking page
app.get('/booking', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'booking.html'));
});
// Route for the about us page
app.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'aboutus.html'));
});
// Route for the contact us page
app.get('/contact', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'contactus.html'));
});
// --- NEW: Route for the admin dashboard page ---
app.get('/admin-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin_dashboard.html'));
});
// --- NEW: API endpoint to get all bookings ---
app.get('/api/bookings', (req, res) => {
    const sql = `SELECT * FROM bookings ORDER BY booking_date DESC`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Error fetching bookings:', err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json(rows); // Send the fetched rows as JSON
    });
});

// --- NEW: API endpoint to get all contact messages ---
app.get('/api/contact-messages', (req, res) => {
    const sql = `SELECT * FROM contact_messages ORDER BY submission_date DESC`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Error fetching contact messages:', err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json(rows); // Send the fetched rows as JSON
    });
});



// --- Route for handling booking form submission ---
app.post('/submit_booking', (req, res) => {
    // Access the form data from req.body
    const { name, email, dog_breed, num_dogs, start_datetime, end_datetime, location, notes, dog_gender } = req.body;

    // --- Validate data (Optional but recommended) ---
    if (!name || !email || !start_datetime || !end_datetime) {
        return res.status(400).send('Missing required booking information. Please fill in all necessary fields.');
    }

    // Prepare SQL INSERT statement
    const sql = `INSERT INTO bookings (name, email, dog_breed, num_dogs, start_datetime, end_datetime, location, notes, dog_gender) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    // Run the SQL statement to insert data into the database
    db.run(sql, [name, email, dog_breed, num_dogs, start_datetime, end_datetime, location, notes, dog_gender], function(err) {
        if (err) {
            console.error('Error inserting booking data:', err.message);
            return res.status(500).send('There was an error processing your booking. Please try again later.');
        }
        console.log(`A row has been inserted with rowid ${this.lastID}`);

  // --- Send a success response back to the client ---
res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Booking Confirmed</title>
    <style>
        body { font-family: sans-serif; background-color: #f0f0f0; padding: 20px; text-align: center; }
        .container { background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); display: inline-block; margin-top: 50px;}
        h2 { color: #f19d30; }
        p { color: #333; }
        .back-button {
            display: inline-block;
            padding: 10px 20px;
            background-color: #333;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin-top: 20px;
        }
        .back-button:hover {
            background-color: #555;
        }
    </style>
</head>
<body>
    <div class="container">
        <h2>Booking Request Received!</h2>
        <p>Thank you, <strong>${name}</strong>, for your booking request. We will contact you soon at <strong>${email}</strong>.</p>
        <p>Your dog sitting is scheduled from <strong>${start_datetime}</strong> to <strong>${end_datetime}</strong>.</p>
        <p>Details have been recorded. You can view them in the backend database.</p>
        <a href="/" class="back-button">Back to Homepage</a>
    </div>
</body>
</html>
`);
    });
});

// ... existing code for /submit_booking route ...

// --- Route for handling contact form submission ---
app.post('/submit_contact', (req, res) => {
    // Access the form data from req.body
    const { name, email, subject, message } = req.body;

    // --- Validate data (Optional but recommended) ---
    if (!name || !email || !message) {
        return res.status(400).send('Missing required contact information. Please fill in all necessary fields.');
    }

    // Prepare SQL INSERT statement
    const sql = `INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)`;

    // Run the SQL statement to insert data into the database
    db.run(sql, [name, email, subject, message], function(err) {
        if (err) {
            console.error('Error inserting contact message:', err.message);
            return res.status(500).send('There was an error processing your message. Please try again later.');
        }
        console.log(`A new contact message has been inserted with rowid ${this.lastID}`);

        // Send a success response back to the client
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Message Sent!</title>
                <style>
                    body { font-family: sans-serif; background-color: #f0f0f0; padding: 20px; text-align: center; }
                    .container { background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); display: inline-block; margin-top: 50px;}
                    h2 { color: #f19d30; }
                    p { color: #333; }
                    .back-button {
                        display: inline-block;
                        padding: 10px 20px;
                        background-color: #333;
                        color: white;
                        text-decoration: none;
                        border-radius: 5px;
                        margin-top: 20px;
                    }
                    .back-button:hover {
                        background-color: #555;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h2>Message Sent Successfully!</h2>
                    <p>Thank you, <strong>${name}</strong>, for reaching out. We have received your message and will get back to you at <strong>${email}</strong> soon.</p>
                    <a href="/" class="back-button">Back to Homepage</a>
                </div>
            </body>
            </html>
        `);
    });
});

// ... existing code for server.listen ...

// Start the server
app.listen(port, () => {
    console.log(`Server listening on port ${port}`); // CORRECTED LINE
});