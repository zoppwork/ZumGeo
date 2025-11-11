import express from 'express';
import cors from 'cors';
import path from 'path';
import { countries } from './countries';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Get a random country flag
app.get('/api/flag', (req, res) => {
  const randomIndex = Math.floor(Math.random() * countries.length);
  const country = countries[randomIndex];

  res.json({
    name: country.name,
    flagUrl: country.flagUrl,
    colors: country.colors,
    capital: country.capital
  });
});

// Check guess
app.post('/api/guess', (req, res) => {
  const { countryName, guess } = req.body;
  const normalizedGuess = guess.trim().toLowerCase();
  const normalizedCountry = countryName.toLowerCase();

  const isCorrect = normalizedGuess === normalizedCountry;

  res.json({ correct: isCorrect });
});

// Serve index.html for all non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

