'use strict'
const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs'); // Import the fs module
const session = require('express-session');

// Middleware to parse url-encoded requests and manage sessions
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: false
}));

// Set the view engine to EJS
app.set('view engine', 'ejs');

// Set the views directory
app.set('views', path.join(__dirname));


// Define file paths for user and pet data
const usersFilePath = path.join(__dirname,  'data', 'users.txt');
const petsFilePath = path.join(__dirname,  'data', 'pets.txt');

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Middleware to parse JSON bodies
app.use(express.json());

// Function to search for pets based on criteria
function searchPets(criteria) {
  const { type, breed, age, gender, otherdogs, othercats, smallchildren } = criteria;

  const petsData = fs.readFileSync(petsFilePath, 'utf8');
  const pets = petsData.trim().split('\n').map(line => {
    const parts = line.split(':');
    return {
      id: parts[0],
      username: parts[1],
      type: parts[2],
      breed: parts[3],
      age: parts[4],
      gender: parts[5],
      getsAlongWithOtherDogs: parts[6] === "yes",
      getsAlongWithCats: parts[7] === "yes",
      getsAlongWithChildren: parts[8] === "yes",
      description: parts[9],
      ownerFirstName: parts[10],
      ownerLastName: parts[11],
      ownerEmail: parts[12]
    };
  });

  return pets.filter(pet => {
    const breedMatch = breed === "Doesn't matter" || pet.breed.toLowerCase().includes(breed.toLowerCase());
    const ageMatch = age === "Doesn't matter" || pet.age === age;
    const genderMatch = gender === "Doesn't matter" || pet.gender === gender.toLowerCase();
    const dogsMatch = !otherdogs || pet.getsAlongWithOtherDogs;
    const catsMatch = !othercats || pet.getsAlongWithCats;
    const childrenMatch = !smallchildren || pet.getsAlongWithChildren;

    return pet.type.toLowerCase() === type.toLowerCase() && breedMatch && ageMatch && genderMatch && dogsMatch && catsMatch && childrenMatch;
  });
}

// Function to verify user credentials
function verifyUser(username, password) {
  const usersData = fs.readFileSync(usersFilePath, 'utf8');
  const users = usersData.trim().split('\n');
  return users.some(user => {
    const [storedUsername, storedPassword] = user.split(':');
    return storedUsername === username && storedPassword === password;
  });
}

// Function to register a new user
function registerUser(username, password) {
  const newUser = `${username}:${password}\n`;
  fs.appendFileSync(usersFilePath, newUser, 'utf8');
}

// Route to render the form
app.get('/form', (req, res) => {
  res.render('form', { pets: undefined });
});

//route to render theprivacy page 
app.get('/privacy',(req,res)=>{
  res.render('privacy');
})

// Route to handle form submission
app.post('/form', (req, res) => {
  const results = searchPets(req.body);
  res.render('form', { pets: results });
  res.send('No matching pets .Please try with diffeent crieteria so as to be able to find you one that correspond your searching!');
  
});

// Route to render other pages
app.get('/', (req, res) => {
  res.render('index');
});

app.get('/CreateAccount', (req, res) => {
  res.render('CreateAccount');
});

// Route to handle account creation
app.post('/CreateAccount', (req, res) => {
  const { username, password } = req.body;

  if (verifyUser(username)) {
    res.json({ message: "Username already exists, please choose another one." });
  } else {
    registerUser(username, password);
    res.json({ message: "Account created successfully. You can now login." });
  }
});

app.get('/DogCare', (req, res) => {
  res.render('DogCare');
});

app.get('/CatCare', (req, res) => {
  res.render('CatCare');
});

// Login endpoint
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (verifyUser(username, password)) {
    req.session.username = username;  // Store the username in the session
    res.redirect('/GiveAway');  // Redirect to the give-away form
  } else {
    res.send('Login failed. Please try again.');
  }
});

// Pet registration endpoint
app.post('/GiveAway', (req, res) => {
  if (req.session.username) {
    const petData = req.body;
    const petId = getNextPetId();
    const petRecord = `${petId}:${req.session.username}:${Object.values(petData).join(':')}\n`;

    // Append the pet record to the pets.txt file
    fs.appendFileSync(petsFilePath,petRecord, 'utf8');

    res.send('Pet registered successfully.');
  } else {
    res.redirect('/login'); // Redirect to the login page if user is not logged in
  }
});

// Function to get the next pet ID
function getNextPetId() {
  const petsData = fs.readFileSync(petsFilePath, 'utf8');
  const lastId = petsData.trim().split('\n').reduce((maxId, line) => {
    const id = parseInt(line.split(':')[0]);
    return id > maxId ? id : maxId;
  }, 0);
  return lastId + 1;
}


app.get('/GiveAway', (req, res) => {
  if (req.session.username) {
    res.render('GiveAway');
  } else {
    res.redirect('/login'); // Redirect to the login page if the user is not logged in
  }
});

app.get('/login', (req, res) => {
  res.render('login'); // Render the login template
});

app.get('/ContactUs', (req, res) => {
  res.render('ContactUs');
});

app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Error destroying session:', err);
      res.send("Error logging out");
      return;
    }
    res.render('logout', { message: "You have been successfully logged out." });
  });
});

// Start the server
const port = 5443;
app.listen(port, () => {
  console.log("Server is running at port " + port);
});
