# Tureko — Sustainability & Tourism Consultancy Website

A full-stack, production-ready sustainability agency website built with Node.js, Express.js, EJS, and Firebase.

---

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and fill in all values:
```bash
cp .env.example .env
```

### 3. Add Your Logo
Place your logo image at:
```
public/images/logo.jpg
```

### 4. Start the Server
```bash
# Production
npm start

# Development (with auto-restart)
npm run dev
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `PORT` | Server port (default: 3000) |
| `NODE_ENV` | `production` or `development` |
| `FIREBASE_PROJECT_ID` | Firebase project ID |
| `FIREBASE_PRIVATE_KEY_ID` | Service account private key ID |
| `FIREBASE_PRIVATE_KEY` | Service account private key (with `\n`) |
| `FIREBASE_CLIENT_EMAIL` | Service account email |
| `FIREBASE_CLIENT_ID` | Service account client ID |
| `FIREBASE_STORAGE_BUCKET` | Firebase Storage bucket name |
| `EMAIL_USER` | Gmail address for sending notifications |
| `EMAIL_PASS` | Gmail App Password (not your login password) |
| `EMAIL_TO` | Email address to receive notifications |

---

## Firebase Setup

### 1. Create Firebase Project
- Go to [console.firebase.google.com](https://console.firebase.google.com)
- Create a new project
- Enable **Firestore Database** (production mode)
- Enable **Firebase Storage**

### 2. Service Account
- Go to Project Settings → Service Accounts
- Click "Generate new private key"
- Copy values into your `.env` file

### 3. Deploy Firestore Rules
```bash
firebase deploy --only firestore:rules
```

### 4. Deploy Storage Rules
```bash
firebase deploy --only storage
```

### Firestore Collections
- `quotes` — Quote form submissions
- `applications` — Career applications

---

## Gmail Setup

1. Enable 2-Factor Authentication on your Gmail account
2. Go to Google Account → Security → App Passwords
3. Generate an App Password for "Mail"
4. Use that App Password as `EMAIL_PASS` in `.env`

---

## Project Structure

```
tureko/
├── config/
│   ├── firebase.js       # Firebase Admin SDK initialization
│   └── mailer.js         # Nodemailer email utility
├── controllers/
│   ├── homeController.js
│   ├── servicesController.js
│   ├── quoteController.js
│   └── careersController.js
├── data/
│   └── services.js       # All services data
├── routes/
│   └── index.js          # All route definitions
├── views/
│   ├── partials/
│   │   ├── header.ejs
│   │   └── footer.ejs
│   ├── home.ejs
│   ├── services.ejs
│   ├── quote.ejs
│   ├── careers.ejs
│   └── error.ejs
├── public/
│   ├── css/style.css
│   ├── js/main.js
│   └── images/logo.jpg   ← Add your logo here
├── firestore.rules
├── storage.rules
├── server.js
├── .env.example
└── package.json
```

---

## Security Features

- **Helmet.js** — Secure HTTP headers
- **express-rate-limit** — Rate limiting on form routes (10 req / 15 min)
- **Input validation** — express-validator on all form fields
- **Sanitization** — sanitize-html on all user inputs
- **Body size limits** — 10KB max for JSON/URL-encoded bodies
- **File validation** — PDF only, 2MB max for resume uploads
- **No hardcoded credentials** — All secrets via environment variables
- **No stack traces in production** — Generic error messages
- **Firestore rules** — Allow create, deny public read/update/delete

---

## Deploying to Render

1. Push your code to GitHub (ensure `.env` is in `.gitignore`)
2. Create a new **Web Service** on [render.com](https://render.com)
3. Set **Build Command**: `npm install`
4. Set **Start Command**: `npm start`
5. Add all environment variables in Render's dashboard
6. Deploy!

---

## Pages

| Route | Description |
|---|---|
| `/` | Home page |
| `/services` | Full services listing (5 categories, 45 services) |
| `/quote` | Request a quote form |
| `/careers` | Career application form with resume upload |

---

## Design System

- **Primary Color**: `#1a5c2e` (Deep Green)
- **Accent**: `#4caf50` (Light Green)
- **Background**: `#ffffff` (White)
- **Font**: Inter (sans-serif) + Playfair Display (headings)
- **Opening Animation**: Fade-in small-caps "tureko" in green on first load

---


