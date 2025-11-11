import express from 'express';
import cors from 'cors';
import path from 'path';
import { allCountries, getCountriesByContinent, Continent } from './countries';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Get a random country flag
app.get('/api/flag', (req, res) => {
  const continentParam = req.query.continent as string | undefined;
  const validContinents: Continent[] = ['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania'];

  // Filter by continent if provided and valid
  const countriesToUse = continentParam && validContinents.includes(continentParam as Continent)
    ? getCountriesByContinent(continentParam as Continent)
    : allCountries;

  if (countriesToUse.length === 0) {
    return res.status(404).json({ error: 'No countries found for the selected continent' });
  }

  const randomIndex = Math.floor(Math.random() * countriesToUse.length);
  const country = countriesToUse[randomIndex];

  res.json({
    name: country.name,
    flagUrl: country.flagUrl,
    colors: country.colors,
    capital: country.capital
  });
});

// Get list of country names (filtered by continent if provided)
app.get('/api/countries', (req, res) => {
  const continentParam = req.query.continent as string | undefined;
  const validContinents: Continent[] = ['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania'];

  // Filter by continent if provided and valid
  const countriesToUse = continentParam && validContinents.includes(continentParam as Continent)
    ? getCountriesByContinent(continentParam as Continent)
    : allCountries;

  // Return just the country names
  const countryNames = countriesToUse.map(country => country.name);
  res.json({ countries: countryNames });
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

