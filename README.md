# Rutgers Campus Event Intelligence Platform

A personal full-stack project built to help Rutgers students and campus organizations discover, submit, and manage campus events through one centralized dashboard. The platform started as an event analytics tool, but evolved into a more realistic campus event system with user accounts, event posting, RSVP tracking, and a PostgreSQL database.

The project is designed around a Rutgers-themed event discovery experience. Students can browse events, filter by category and campus zone, create an account, verify their email, post events, and mark themselves as going. Event creators can view their posted events, see how many users RSVP’d, and delete events they no longer want listed.

## What it does

* Lets users create an account, log in, and verify their email before posting or RSVPing to events.
* Stores user accounts, verification tokens, posted events, and RSVP records in a PostgreSQL database.
* Allows verified users to post Rutgers-related events with a date, location, category, campus zone, and EST time slot.
* Allows logged-in verified users to click “Going” on events they plan to attend.
* Tracks how many users signed up for each event.
* Includes a profile page where users can view their account details, posted events, RSVP counts, and delete their own events.
* Supports event filtering by keyword, category, campus zone, and status.
* Uses soft deletion for accounts and events so records can be removed without immediately breaking database relationships.
* Uses JWT authentication to protect account, event creation, RSVP, and profile routes.
* Uses email verification tokens so accounts can only be verified once.

## Tech stack

| Layer              | Tools                                 |
| ------------------ | ------------------------------------- |
| Backend            | Node.js, Express.js                   |
| Database           | PostgreSQL                            |
| Authentication     | JWT, bcrypt                           |
| Email verification | Nodemailer, verification tokens       |
| Frontend           | HTML, CSS, vanilla JavaScript         |
| Deployment         | Render Web Service, Render PostgreSQL |
| Version control    | Git, GitHub                           |

## Project structure

```text
campus_event_intelligence_platform_v2/
  backend/
    db/
      database.js
      initDb.js
      schema_postgres.sql
    middleware/
      auth.js
      errors.js
    routes/
      auth.js
      events.js
      analytics.js
      organizations.js
      exports.js
    config.js
    package.json
    server.js
  frontend/
    index.html
    signup.html
    login.html
    create-event.html
    profile.html
    app.js
    auth-pages.js
    styles.css
  README.md
```

## Main features

### Account creation and login

Users can create an account with their name, email, and password. Passwords are hashed with bcrypt before being stored in PostgreSQL. After signup, the backend creates a one-time verification token for that user.

### Email verification

New users start as unverified. The backend generates a verification link using a secure token. Once the user opens the verification link, their account is marked as verified and the token is marked as used. The same verification link cannot be used again.

During development, if email credentials are not configured, the verification link is printed in the server logs. In production, the app can send verification emails using Nodemailer with email credentials stored as environment variables.

### Event posting

Only logged-in and verified users can post events. Each event includes:

* Title
* Description
* Category
* Campus zone
* Location
* Event date
* Start time EST
* End time EST
* Optional source URL

### Event discovery

Anyone can browse events. Users can filter events by keyword, category, campus zone, and status. The dashboard is styled with Rutgers-inspired branding and is focused on event discovery instead of fake attendance or cost metrics.

### RSVP / Going feature

Verified users can click “Going” on an event. The RSVP is stored in the database, and each user can only RSVP to the same event once. The dashboard displays the number of users going to each event.

### User profile

Logged-in users have a profile page where they can:

* View their name, email, and verification status
* See all events they posted
* See how many users RSVP’d to each event
* Delete their own events
* Delete their own account

## Database design

The PostgreSQL database includes tables for:

```text
users
email_verification_tokens
events
event_rsvps
event_status_history
```

The schema supports account verification, event ownership, RSVP tracking, soft deletion, and event status tracking.

## Main API endpoints

| Method | Endpoint                   | Purpose                                     |
| ------ | -------------------------- | ------------------------------------------- |
| POST   | `/api/auth/signup`         | Create a new user account                   |
| POST   | `/api/auth/login`          | Log in and receive a JWT token              |
| GET    | `/api/auth/verify-email`   | Verify a user account with a one-time token |
| GET    | `/api/auth/me`             | Get the logged-in user’s profile            |
| DELETE | `/api/auth/account`        | Soft-delete the logged-in user’s account    |
| GET    | `/api/events`              | Browse and filter events                    |
| POST   | `/api/events`              | Create an event as a verified user          |
| POST   | `/api/events/:id/going`    | RSVP to an event                            |
| DELETE | `/api/events/:id/going`    | Remove RSVP from an event                   |
| GET    | `/api/events/profile/mine` | View events posted by the logged-in user    |
| DELETE | `/api/events/:id`          | Delete an event owned by the logged-in user |

## Quick start

From the project root:

```bash
cd backend
npm install
npm run reset
npm start
```

Open the dashboard:

```text
http://localhost:4000
```

## Required environment variables

Create a `backend/.env` file for local development:

```env
DATABASE_URL=your_postgres_database_url
JWT_SECRET=your_jwt_secret
APP_URL=http://localhost:4000
NODE_ENV=development
```

Optional email variables for real email verification:

```env
EMAIL_USER=your_email_address
EMAIL_PASS=your_email_app_password
```

For Render deployment, these same values should be added under the web service’s environment variables. The local environment should use the external PostgreSQL URL, while the deployed Render service should use the internal PostgreSQL URL.

## Deployment

The app is deployed using:

* Render Web Service for the Node.js/Express backend and frontend
* Render PostgreSQL for the database
* GitHub for source control and automatic deploys

## Project purpose

I built this project to practice full-stack development in a realistic product setting. The goal was to move beyond a simple static dashboard and build a campus-focused application with real backend features, persistent SQL storage, user authentication, protected routes, event ownership, and RSVP tracking.
