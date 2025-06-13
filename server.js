const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./database'); // Assuming database.js is in the same directory

const app = express();
const port = 3000;

// Middleware to parse URL-encoded form data (for traditional HTML forms)
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files (HTML, CSS, images) from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// --- Routes for serving your HTML pages ---
// Route for the home page (handles 'http://localhost:3000/' directly)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'HomePage.html'));
});

// Route for the booking page
app.get('/booking', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'booking.html'));
});
// Route for the about us page
app.get('/aboutus.html', (req, res) => { // Ensure this route is correct if it was just /about
    res.sendFile(path.join(__dirname, 'public', 'aboutus.html'));
});
// Route for the contact us page
app.get('/contactus.html', (req, res) => { // Ensure this route is correct if it was just /contact
    res.sendFile(path.join(__dirname, 'public', 'contactus.html'));
});

// Route for the admin dashboard page
app.get('/admin-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin_dashboard.html'));
});

// --- API endpoint to get all bookings ---
app.get('/api/bookings', (req, res) => {
    // Select all columns, including the new dogs_data_json
    const sql = `SELECT * FROM bookings ORDER BY booking_date DESC`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Error fetching bookings:', err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json(rows); // Send the fetched rows as JSON
    });
});

// --- API endpoint to get all contact messages ---
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


// --- Route to handle booking submissions (MODIFIED) ---
app.post('/submit_booking', (req, res) => {
    const { name, email, start_datetime, end_datetime, location, notes } = req.body;

    // --- Process Multiple Dog Data from form fields ---
    const dogs = [];
    let i = 0;
    // Loop through the submitted form data to find dog_breed_X and dog_gender_X
    // The loop continues as long as a 'dog_breed_i' field exists
    while (req.body[`dog_breed_${i}`] !== undefined && req.body[`dog_gender_${i}`] !== undefined) {
        dogs.push({
            breed: req.body[`dog_breed_${i}`],
            gender: req.body[`dog_gender_${i}`]
        });
        i++;
    }

    const num_dogs = dogs.length; // The total number of dogs submitted
    const dogs_data_json = JSON.stringify(dogs); // Convert the array of dog objects to a JSON string

    // Insert data into the database
    // Ensure the order of columns matches the order of placeholders
    db.run(
        `INSERT INTO bookings (name, email, num_dogs, start_datetime, end_datetime, location, notes, dogs_data_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, email, num_dogs, start_datetime, end_datetime, location, notes, dogs_data_json],
        function (err) {
            if (err) {
                console.error('Error inserting booking:', err.message);
                res.status(500).send('Error submitting booking request. Please try again.');
                return;
            }
            console.log(`A booking has been inserted with rowid ${this.lastID}`);

            // --- NEW/MODIFIED: Send a detailed HTML confirmation response ---
            let dogsHtml = '';
            if (dogs.length > 0) {
                dogsHtml += '<p><strong>Dog(s) Details:</strong></p><ul>';
                dogs.forEach((dog, index) => {
                    dogsHtml += `<li>Dog ${index + 1}: ${dog.breed} (${dog.gender})</li>`;
                });
                dogsHtml += '</ul>';
            } else {
                dogsHtml += '<p>No specific dog details provided.</p>';
            }

            res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Booking Confirmed</title>
                    <link rel="stylesheet" href="style.css"> <!-- Link to your main CSS for consistency -->
                    <link rel="icon" href="logologo.jpeg" type="image/jpeg">
                    <style>
                        /* Minimal inline styles to ensure the confirmation looks good independently */
                        body {
                            background-image: linear-gradient(to right, #fffdd0 , rgb(255, 213, 128));
                            font-family: sans-serif;
                            margin: 0;
                            padding-top: 60px;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            text-align: center;
                        }
                        .confirmation-container {
                            width: 80%;
                            max-width: 600px;
                            padding: 30px;
                            background-color: white;
                            border-radius: 8px;
                            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                            margin-top: 50px;
                            text-align: left; /* Align text inside container to left */
                        }
                        .confirmation-container h2 {
                            color: #f19d30;
                            text-align: center;
                            margin-bottom: 20px;
                        }
                        .confirmation-container p {
                            color: #333;
                            line-height: 1.6;
                            margin-bottom: 10px;
                        }
                        .confirmation-container ul {
                            list-style-type: disc;
                            margin-left: 20px;
                            margin-bottom: 10px;
                        }
                        .confirmation-container ul li {
                            margin-bottom: 5px;
                            color: #555;
                        }
                        .confirmation-container strong {
                            color: #333;
                        }
                        .back-button {
                            display: inline-block;
                            padding: 10px 20px;
                            background-color: #f19d30; /* Use your primary button color */
                            color: white;
                            text-decoration: none;
                            border-radius: 5px;
                            margin-top: 20px;
                            transition: background-color 0.3s ease;
                        }
                        .back-button:hover {
                            background-color: #e08e2b;
                        }
                    </style>
                </head>
                <body>
                    <main class="confirmation-container">
                        <h2>Booking Request Received!</h2>
                        <p>Thank you, <strong>${name}</strong>, for your booking request. We will contact you soon at <strong>${email}</strong>.</p>
                        <p>Your dog sitting is scheduled from <strong>${new Date(start_datetime).toLocaleString()}</strong> to <strong>${new Date(end_datetime).toLocaleString()}</strong>.</p>
                        <p>Location: <strong>${location}</strong></p>
                        ${notes ? `<p>Special Instructions: <strong>${notes}</strong></p>` : ''}
                        <p>Total number of dogs: <strong>${num_dogs}</strong></p>
                        ${dogsHtml}
                        <a href="/" class="back-button">Back to Homepage</a>
                    </main>
                </body>
                </html>
            `);
        }
    );
});

// --- Route to handle contact form submissions (MODIFIED) ---
app.post('/submit_contact', (req, res) => {
    const { name, email, subject, message } = req.body;

    db.run(
        `INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)`,
        [name, email, subject, message],
        function (err) {
            if (err) {
                console.error('Error inserting contact:', err.message);
                res.status(500).send('Error submitting contact form. Please try again.');
                return;
            }
            console.log(`A contact message has been inserted with rowid ${this.lastID}`);

            // --- NEW: Detailed HTML confirmation for contact form ---
            res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Contact Message Sent</title>
                    <link rel="stylesheet" href="style.css"> <!-- Link to your main CSS for consistency -->
                    <link rel="icon" href="logologo.jpeg" type="image/jpeg">
                    <style>
                        /* Reuse confirmation container styles from booking for consistency */
                        body {
                            background-image: linear-gradient(to right, #fffdd0 , rgb(255, 213, 128));
                            font-family: sans-serif;
                            margin: 0;
                            padding-top: 60px;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            text-align: center;
                        }
                        .confirmation-container {
                            width: 80%;
                            max-width: 600px;
                            padding: 30px;
                            background-color: white;
                            border-radius: 8px;
                            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                            margin-top: 50px;
                            text-align: left;
                        }
                        .confirmation-container h2 {
                            color: #f19d30;
                            text-align: center;
                            margin-bottom: 20px;
                        }
                        .confirmation-container p {
                            color: #333;
                            line-height: 1.6;
                            margin-bottom: 10px;
                        }
                        .confirmation-container strong {
                            color: #333;
                        }
                        .back-button {
                            display: inline-block;
                            padding: 10px 20px;
                            background-color: #f19d30;
                            color: white;
                            text-decoration: none;
                            border-radius: 5px;
                            margin-top: 20px;
                            transition: background-color 0.3s ease;
                        }
                        .back-button:hover {
                            background-color: #e08e2b;
                        }
                    </style>
                </head>
                <body>
                    <main class="confirmation-container">
                        <h2>Thank You for Your Message!</h2>
                        <p>Dear <strong>${name}</strong>,</p>
                        <p>We have successfully received your message.</p>
                        <p><strong>Subject:</strong> ${subject || 'No Subject'}</p>
                        <p><strong>Your Message:</strong></p>
                        <p style="white-space: pre-wrap; background-color: #f9f9f9; padding: 15px; border-radius: 5px; border: 1px solid #eee;">${message}</p>
                        <p>We will get back to you shortly at <strong>${email}</strong>.</p>
                        <a href="/" class="back-button">Back to Homepage</a>
                    </main>
                </body>
                </html>
            `);
        }
    );
});

// Start the server
app.listen(port, () => {
    console.log(`Bark Buddies server listening at http://localhost:${port}`);
});
