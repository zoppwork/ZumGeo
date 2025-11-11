# ZumGeo - Flag Guessing Game

A fun web-based game where you guess countries by their flag colors and progressively revealed flag images.

## Features

- Random country flag selection on each game
- Color-based hints showing a percentage of flag colors
- Progressive flag reveal after 3 guesses
- Beautiful UI built with Tailwind CSS

## Setup

1. Install dependencies:
```bash
npm install
```

2. Build the project:
```bash
npm run build
```

3. Start the server:
```bash
npm start
```

Or run both build and start in one command:
```bash
npm run
```

The game will be available at `http://localhost:3000`

## Development

For development with auto-reload:
```bash
npm run dev
```

This will watch for TypeScript and CSS changes and rebuild automatically.

## How to Play

1. A random country flag is selected when you start a new game
2. You'll see a percentage of the flag's colors as hints
3. Enter your guess for the country name
4. After 3 guesses, the flag will start revealing (blurred)
5. Every 2nd wrong guess reveals the flag more clearly
6. Guess correctly to win!

