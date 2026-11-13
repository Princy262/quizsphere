<div align="center">

<img src="client/src/assets/logo/logo.png" alt="QuizSphere" width="280" />

# QuizSphere

**Online Quiz Management and Assessment System**

Quiz · Learn · Grow

</div>

---

## Overview

QuizSphere is a full-stack web application built with the **MERN stack** (MongoDB, Express.js, React, Node.js). Two kinds of users share the platform:

- **Examiners** create and manage timed quizzes and see how students perform.
- **Students** browse all quizzes, attempt them within the time limit, and track their own progress.

Access is role-based, so each user only sees what their role allows. Examiners use a warm brown theme and students a purple and teal theme.

## Features

### Examiner
- Register and log in as an examiner
- Create, edit and delete **only their own** quizzes
- Set a **separate time limit for every quiz**
- Add questions with single or multiple correct answers (MSQ)
- Add an **image to any question** by pasting (Ctrl+V) or uploading, for example a circuit diagram
- Dynamic categories: a new category is available to everyone as soon as a quiz uses it
- Filter their quizzes with a category dropdown
- Quiz leaderboard ranked by best score, then by time

### Student
- Register and log in as a student
- See **all quizzes** from every examiner
- Category dropdown with **All Categories** selected by default
- Live countdown timer, with a bigger red warning in the last 10 seconds
- **Up to 3 attempts per quiz**, best score kept
- Mark questions for review (yellow), answered questions are green
- Quiz is submitted automatically when time runs out
- Private **bar graph** of marks across Attempt 1, 2 and 3
- Per-attempt response review: correct answers in green, wrong ones in red
- **Answer key unlocked only after all 3 attempts** are used
- My Results page listing every attempted quiz

## Key rules

| Rule | Behavior |
|---|---|
| One email, one role | The same email cannot be both a student and an examiner |
| Timer | Controlled by the server. Only the quiz owner can change the time limit |
| One sitting | Closing, refreshing or leaving the quiz tab submits it and counts as an attempt |
| Timeout | An automatic submit at 00:00 counts as an attempt |
| Attempts | Maximum 3 per quiz, counted separately for each quiz |
| Correct answers | Hidden until all 3 attempts on that quiz are finished |
| Scoring | A question is correct only if the selected set exactly matches the correct set |
| Ranking | Best score first, then less time. Equal score and time share a rank (1, 1, 3) and are listed A to Z |
| Privacy | Students never see other students' results or graphs |
| Ownership | An examiner can only access quizzes they created |

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite), React Router, Axios, Lucide icons, plain CSS |
| Backend | Node.js, Express.js (ES modules), REST APIs |
| Database | MongoDB Atlas, Mongoose |
| Auth and security | JWT, bcrypt |
| Uploads | Multer (images stored in MongoDB) |
| API testing | Postman |

## Project structure

```text
quizsphere/
├── server/
│   ├── config/          db.js
│   ├── models/          User, Quiz, Attempt, Image
│   ├── controllers/     auth, quiz, studentQuiz, attempt, leaderboard, image
│   ├── middleware/      auth, role, upload, errorHandler
│   ├── routes/          auth, examiner, student, image
│   ├── utils/           scoring, ranking, finalizeAttempt, attemptStats, attemptSweeper
│   ├── tests/           ranking.test.js
│   └── server.js
└── client/
    └── src/
        ├── api/         axios.js
        ├── context/     AuthContext.jsx
        ├── components/  Sidebar, AppLayout, QuizForm, AttemptChart, ...
        ├── pages/       Login, Register, examiner/, student/
        ├── utils/       chartScale, formatTime, imageUrl, useTheme
        └── App.jsx
```

## Getting started

### Prerequisites
- Node.js 18 or newer
- A MongoDB Atlas cluster (the free tier works)

### 1. Clone

```bash
git clone https://github.com/Princy262/quizsphere.git
cd quizsphere
```

### 2. Backend

```bash
cd server
npm install
```

Create `server/.env` (see `.env.example`):

```env
PORT=5000
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_long_random_secret
HEARTBEAT_TIMEOUT_SECONDS=90
```

```bash
npm run dev
```

### 3. Frontend

```bash
cd client
npm install
```

Create `client/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

```bash
npm run dev
```

Open `http://localhost:5173`.

> Never commit your real `.env` files. They are listed in `.gitignore`.

## API overview

| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` |
| Examiner | `/api/examiner/quizzes` (CRUD), `/quizzes/:id/leaderboard`, `/categories`, `POST /images` |
| Student | `/api/student/categories`, `/quizzes`, `/quizzes/:id`, `/quizzes/:id/start`, `/quizzes/:id/attempts`, `/quizzes/:id/review` |
| Attempts | `PATCH /attempts/:id/answers`, `POST /attempts/:id/heartbeat`, `/submit`, `/leave` |
| Images | `GET /api/images/:id` |

## How the timer stays fair

- The countdown on screen is only for display. The **server stores the start time** and decides when time is up.
- The page sends a heartbeat every 5 seconds. If it stops for 90 seconds (crash, lost internet), a background sweeper ends the attempt and counts it.
- Each answer is saved to the server when selected, so an interrupted attempt is scored on what was answered.

## Security notes

- Passwords hashed with bcrypt
- JWT-protected routes with role checks on the server
- Correct answers are never sent to students while they can still attempt the quiz
- Every examiner query is filtered by owner
- Uploads limited to PNG, JPG, WEBP and GIF up to 2 MB (SVG is blocked)

## Future scope

- **Create a quiz from a photo.** An examiner uploads a photo or scan of handwritten or printed questions, and the app reads the questions, options and marked correct answers and fills in the Create Quiz form. The examiner would always review and confirm before saving, because handwriting recognition can make mistakes. Diagrams could be cropped and attached automatically, and PDFs could be supported too.
- Examiner analytics: average score, question-wise difficulty, attempts over time
- Profile and settings pages (edit name, change password)
- Draft and published quizzes
- Notifications for new quizzes in a category
- Question import from CSV or Excel
- Randomized question and option order
- Dark mode
- Email verification and password reset
- Deployment: backend on Render, frontend on Vercel

## Author

**Princy**

GitHub: [@Princy262](https://github.com/Princy262)