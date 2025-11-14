# Director Portfolio – Single Page Site

This is a single-page portfolio site for a director, built with React. It features a fullscreen hero video, scroll-based animations, and sections for selected work and information about the director.

The main focus of the project was getting the animations and video playback to feel smooth and intentional, rather than building a complex app with lots of routes.

---

## Tech Stack

- React
- JavaScript
- CSS
- GSAP (for scroll-based animations)
- hls.js (for HLS video playback)
- Cloudflare (for video hosting/streaming)

---

## Features

- **Hero video**  
  A fullscreen hero section that plays a video stream hosted on Cloudflare using HLS.

- **Scroll-based transition out of the hero**  
  When the user scrolls, a GSAP-powered animation raises fin-like shapes (based on the "A" from the logo) from the bottom of the screen, gradually covering the hero video and transitioning into the main content.

- **Single-page layout**  
  Simple one-route structure with sections for work, about, and contact.

- **Responsive design**  
  Layout adjusts for different screen sizes so the site is usable on desktop and mobile.

---

## Getting Started

### Prerequisites

- Node.js (version X.Y.Z or higher)
- npm (or Yarn / pnpm, etc.)

### 1. Clone the repository

```bash
git clone https://github.com/your-username/asher-portfolio.git
cd frontend

### 2. Install Dependencies
npm install

### 3. Start the dev server
npm run dev

## What I learned

Integrating hls with react to play videos stored on cloudflare.
Using GSAP for a scroll based animation that ties the hero-video in with the rest of the page.
Balancing animation with performance. This involved lots negotating and compromises made with the client.
