const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./database'); // Assuming database.js is in the same directory
const multer = require('multer'); // NEW: Import multer
const fs = require('fs'); // NEW: Import file system module for creating directories

const app = express();
const port = 3000;

// --- Multer Configuration for File Uploads (NEW) ---
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads'); // Directory to store uploaded images

// Create the uploads directory if it doesn't exist
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    console.log(`Created uploads directory at: ${UPLOADS_DIR}`);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOADS_DIR); // Files will be saved in the 'public/uploads' directory
    },
    filename: function (req, file, cb) {
        // Create a unique filename: fieldname-timestamp.ext
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Configure multer to accept multiple files for the 'dog_photos' field
// Max 5 files, each up to 5MB
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit per file
    fileFilter: (req, file, cb) => {
        // Accept only image files
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// Middleware
// bodyParser.urlencoded is still needed for other forms (like contact form)
app.use(bodyParser.urlencoded({ extended: true }));
// Serve static files (HTML, CSS, images, and now uploaded images) from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// --- Routes for serving your HTML pages ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'HomePage.html'));
});

app.get('/booking', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'booking.html'));
});

app.get('/aboutus.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'aboutus.html'));
});

app.get('/contactus.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'contactus.html'));
});

app.get('/admin-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin_dashboard.html'));
});

// --- API endpoint to get all bookings ---
app.get('/api/bookings', (req, res) => {
    const sql = `SELECT * FROM bookings ORDER BY booking_date DESC`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Error fetching bookings:', err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
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
        res.json(rows);
    });
});


// --- Route to handle booking submissions (MODIFIED for Multer) ---
// Use upload.array('dog_photos', 5) middleware to handle file uploads
app.post('/submit_booking', upload.array('dog_photos', 5), (req, res) => {
    // req.body will now contain text fields, and req.files will contain file info
    const { name, email, start_datetime, end_datetime, location, notes, total_cost } = req.body;
    const uploadedFiles = req.files; // Array of uploaded file objects

    // Extract paths of uploaded files
    const photoPaths = uploadedFiles ? uploadedFiles.map(file => `/uploads/${file.filename}`) : [];
    const photos_json = JSON.stringify(photoPaths); // Store as JSON string in DB

    // --- Process Multiple Dog Data from form fields ---
    const dogs = [];
    let i = 0;
    while (req.body[`dog_breed_${i}`] !== undefined && req.body[`dog_gender_${i}`] !== undefined) {
        dogs.push({
            breed: req.body[`dog_breed_${i}`],
            gender: req.body[`dog_gender_${i}`]
        });
        i++;
    }

    const num_dogs = dogs.length;
    const dogs_data_json = JSON.stringify(dogs);

    // Insert data into the database
    db.run(
        `INSERT INTO bookings (name, email, num_dogs, start_datetime, end_datetime, location, notes, dogs_data_json, total_cost, photos_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, // Added one more '?' for photos_json
        [name, email, num_dogs, start_datetime, end_datetime, location, notes, dogs_data_json, total_cost, photos_json], // Added photos_json here
        function (err) {
            if (err) {
                console.error('Error inserting booking:', err.message);
                // If there's a DB error, try to clean up uploaded files
                if (uploadedFiles) {
                    uploadedFiles.forEach(file => {
                        fs.unlink(file.path, (unlinkErr) => {
                            if (unlinkErr) console.error('Error deleting uploaded file:', unlinkErr);
                        });
                    });
                }
                res.status(500).send('Error submitting booking request. Please try again.');
                return;
            }
            console.log(`A booking has been inserted with rowid ${this.lastID}`);

            // --- Detailed HTML confirmation response ---
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

            let photosConfirmationHtml = '';
            if (photoPaths.length > 0) {
                photosConfirmationHtml += '<p><strong>Uploaded Photos:</strong></p><div style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;">';
                photoPaths.forEach(path => {
                    photosConfirmationHtml += `<img src="${path}" alt="Dog Photo" style="width: 80px; height: 80px; object-fit: cover; border-radius: 5px;">`;
                });
                photosConfirmationHtml += '</div>';
            } else {
                photosConfirmationHtml += '<p>No photos uploaded.</p>';
            }

            res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Booking Confirmed</title>
                    <link rel="stylesheet" href="style.css">
                    <link rel="icon" href="logologo.jpeg" type="image/jpeg">
                    <style>
                        /* Inline styles for confirmation page (can be moved to style.css) */
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
                        <h2>Booking Request Received!</h2>
                        <p>Thank you, <strong>${name}</strong>, for your booking request. We will contact you soon at <strong>${email}</strong>.</p>
                        <p>Your dog sitting is scheduled from <strong>${new Date(start_datetime).toLocaleString()}</strong> to <strong>${new Date(end_datetime).toLocaleString()}</strong>.</p>
                        <p>Location: <strong>${location}</strong></p>
                        ${notes ? `<p>Special Instructions: <strong>${notes}</strong></p>` : ''}
                        <p>Total number of dogs: <strong>${num_dogs}</strong></p>
                        ${dogsHtml}
                        <p><strong>Estimated Total Cost: Rs. ${total_cost}</strong></p>
                        ${photosConfirmationHtml} <!-- NEW: Display uploaded photos -->
                        <a href="/" class="back-button">Back to Homepage</a>
                    </main>
                </body>
                </html>
            `);
        }
    );
});

// --- Route to handle contact form submissions ---
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
            res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Contact Message Sent</title>
                    <link rel="stylesheet" href="style.css">
                    <link rel="icon" href="logologo.jpeg" type="image/jpeg">
                    <style>
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
