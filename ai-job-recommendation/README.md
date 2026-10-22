# AI-Based Job Recommendation System (Pathfinder)

A modern, production-grade AI-powered job recommendation platform engineered to bridge college students, fresh graduates, and experienced professionals with verified job opportunities.

Pathfinder goes beyond traditional keyword search engines by combining **spaCy natural language processing**, **Sentence Transformers / Scikit-Learn semantic vector matching**, **resume text extraction (PDF & DOCX)**, and an **ethical web scraping pipeline**.

---

## 1. System Architecture

```
                       +---------------------------------------+
                       |   React 19 + TypeScript + Vite UI    |
                       |  Tailwind CSS v4 · Lucide · Recharts  |
                       +-------------------+-------------------+
                                           |
                              REST / JSON  |  HTTP 127.0.0.1:8001
                                           v
                       +---------------------------------------+
                       |           FastAPI Backend             |
                       |   Pydantic v2 · spaCy · Scikit-Learn  |
                       |   PyPDF · python-docx · APScheduler   |
                       +---------+-------------------+---------+
                                 |                   |
            +--------------------+                   +--------------------+
            v                                                             v
+-------------------------+                                   +-------------------------+
| Mode A: Cloud Supabase  |                                   |  Mode B: Local Engine   |
| · PostgreSQL with RLS   |                                   |  · Persistent SQLite DB |
| · Supabase Auth & JWT   |                                   |  · Base64URL App JWTs   |
| · Supabase File Storage |                                   |  · Local Resume Storage |
+-------------------------+                                   +-------------------------+
```

### Dual-Mode Persistence Architecture
The platform features an intelligent dual-mode repository:
1. **Cloud Mode (Supabase):** Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `backend/.env` and `frontend/.env` to connect to Supabase PostgreSQL, row-level security (RLS), and bucket storage.
2. **Local / Offline Mode (Default):** Runs immediately without external credentials! Uses a persistent SQLite database (`backend/data/app.db`), local resume storage (`backend/data/resumes/`), and local JWT authentication.

For an existing Supabase database, re-apply `database/schema.sql` before using the updated admin console. The script adds account activation and collection insert/update counters idempotently. SQLite applies these columns automatically at startup.

---

## 2. Key Features

### Modern Light-Theme UI/UX
- **Design System:** Strict professional light theme (clean whites, `#f8fafc` soft-gray backgrounds, slate borders, and blue/indigo/teal accents).
- **Responsive Layout:** Desktop, tablet, and mobile navigation with collapsible mobile menus and sidebar workspace.
- **Micro-Interactions:** Animated cards, hover states, skeleton loaders, and interactive SVG gauges.

### Student & Seeker Experience
- **Interactive Landing Page:** Hero section with animated search bar, live featured listings, 6 department discovery cards, benefits for freshers, and interactive FAQ accordion.
- **Explore Jobs:** Multi-facet filtering by search keyword, location, academic department, job type, work mode (Remote/Hybrid/On-site), experience level, and salary.
- **Role Details & Transparency:** Displays job description, required technical skills, eligibility criteria, direct source application URL, and 6-factor AI relevance breakdown.
- **Student Dashboard:** Profile strength gauge, application status pipeline chart (Recharts), identified skills cloud, and department-specific listings.
- **Resume Analyzer:** Drag-and-drop upload for PDF and DOCX files. Extracts technical skills, degree qualifications, and experience. Allows users to review and refine extracted data.
- **Application Tracker:** Manage opportunities across 5 lifecycle stages (`Saved`, `Applied`, `Interview`, `Offer`, `Rejected`), with application notes and timestamped audit history.

### Admin Console
- **Dedicated Admin Workspace:** Responsive, collapsible console navigation for overview, users, jobs, sources, collections, analytics, and audit logs.
- **Platform Overview:** Live registered-user, job, source, and collection metrics with department/source charts, skills, recent runs, refresh state, and errors.
- **Account and Job Management:** Searchable, filterable tables; confirmed account activation controls; job detail inspection and supported listing status.
- **Source and Collection Controls:** Safe source configuration status, refresh intervals, manual collection trigger, and run history with inserted/updated counts.
- **Analytics and Audit:** Location, skills, collection trend, and user growth charts plus read-only administrative activity.
- **Role Verification:** Admin routes and operations are protected by server-side role checks; inactive accounts are rejected by the API.

---

## 3. AI Recommendation Engine

Pathfinder ranks opportunities using a documented 6-factor weighted algorithm:

$$\text{Relevance Score} = w_1 S_{\text{semantic}} + w_2 S_{\text{skills}} + w_3 S_{\text{qual}} + w_4 S_{\text{exp}} + w_5 S_{\text{loc}} + w_6 S_{\text{type}}$$

| Factor | Weight | Method |
| :--- | :---: | :--- |
| **Semantic Similarity** | **45%** | Cosine similarity between candidate text and job description using Sentence Transformers (`all-MiniLM-L6-v2`) with automatic fallback to Scikit-Learn TF-IDF vectorizer. |
| **Skill Overlap** | **25%** | Jaccard index between candidate's extracted skills and job required skills; generates matching and missing skills lists. |
| **Qualification Match** | **10%** | Exact and hierarchy-based degree matching (`B.Tech`, `M.Tech`, `BCA`, `MCA`, `B.Sc`, `MBA`, etc.). |
| **Experience Compatibility** | **10%** | Compares candidate years of experience against job minimum requirements. |
| **Location Match** | **5%** | Matches candidate current or preferred location against job location. |
| **Job Type Preference** | **5%** | Matches preferred job type (`Full-time`, `Internship`, `Remote`, etc.). |

> **Fairness & Transparency Notice:** Match scores are system-generated relevance metrics designed to guide candidate discovery and highlight skill gaps, not a guarantee or prediction of hiring.

---

## 4. Web Scraping & Data Pipeline

- **Authorized Practice Source:** Initial scraper gathers 100 practice jobs from `https://realpython.github.io/fake-jobs/` using Requests and BeautifulSoup4.
- **Ethical Safeguards:**
  - Strict compliance with `robots.txt` and domain terms.
  - Rate limiting (polite 1-second delay between requests).
  - Explicit `User-Agent` headers.
  - Direct application links linking back to original sources.
- **Data Normalization:** Automatic parsing of job titles, companies, locations, clean markdown descriptions, departments, and skill tags.
- **Deduplication:** Enforces unique constraint on `(source, source_job_id)`.
- **Scheduled Updates:** Configurable background synchronization using APScheduler.

---

## 5. Technology Stack

### Frontend
- React 19 + TypeScript
- Vite 7
- Tailwind CSS v4
- React Router v7
- Axios
- TanStack Query v5
- Lucide React
- Recharts
- Framer Motion
- Sonner (notifications)
- Vitest + Testing Library (unit/integration testing)

### Backend
- Python 3.12+
- FastAPI & Uvicorn
- Pydantic v2
- spaCy
- Scikit-learn
- Sentence Transformers
- PyPDF & python-docx
- BeautifulSoup4 & Requests
- APScheduler
- Pytest

### Database
- Supabase PostgreSQL (Cloud Mode with Row Level Security)
- SQLite (Local Persistent Mode with `app.db`)

---

## 6. Getting Started

### Prerequisites
- Node.js 18+ and npm
- Python 3.11 or 3.12

### Backend Setup (PowerShell)

1. Navigate to the `backend` directory:
   ```powershell
   cd backend
   ```

2. Activate the virtual environment (pre-configured):
   ```powershell
   .\.venv\Scripts\Activate.ps1
   ```
   *(If creating a new virtual environment: `python -m venv .venv` then `pip install -r requirements.txt`)*

3. Verify environment configuration:
   A default `.env` file is already created. To use Supabase, fill in `SUPABASE_URL` and `SUPABASE_ANON_KEY`.

4. Start the FastAPI development server:
   ```powershell
   uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
   ```
   The backend will be available at: `http://127.0.0.1:8001`
   Swagger API docs: `http://127.0.0.1:8001/docs`

---

### Frontend Setup (PowerShell)

1. Open a new terminal and navigate to the `frontend` directory:
   ```powershell
   cd frontend
   ```

2. Install dependencies (if not already installed):
   ```powershell
   npm install
   ```

3. Start the Vite development server:
   ```powershell
   npm run dev
   ```
   The frontend will be available at: `http://127.0.0.1:5173`

---

## 7. Demo Credentials

For quick evaluation and grading, one-click demo login buttons are available on the Login page (`/login`):

| Role | Email | Password |
| :--- | :--- | :--- |
| **Student / Seeker** | `alex.student@pathfinder.io` | `DemoPassword123!` |
| **Administrator** | `admin@pathfinder.io` | `DemoPassword123!` |

---

## 8. Running Automated Tests

### Backend Tests (pytest)
Runs 7 comprehensive integration tests covering health checks, job filtering, student/admin authentication, AI recommendations, saved jobs & application tracking, resume upload & NLP extraction, and scraping triggers:
```powershell
cd backend
.\.venv\Scripts\pytest -v tests/test_api_workflows.py
```
**Status:** `7 passed in 19.97s`

### Frontend Tests (Vitest)
Runs unit and component tests verifying the Landing page hero, search bar, FAQ accordion, Login/Signup forms, and JobCard rendering:
```powershell
cd frontend
npm test
```
**Status:** `5 passed in 10.14s`

### Production Build Verification
```powershell
cd frontend
npm run build
```
**Status:** `Build succeeded (0 TypeScript errors)`

---

## 9. API Reference Summary

### Authentication
- `POST /api/auth/signup` - Register new student account
- `POST /api/auth/login` - Authenticate and receive JWT
- `POST /api/auth/demo-login` - Instant student or admin demo session

### Profile & Skills
- `GET /api/users/me` - Retrieve current user profile
- `PUT /api/users/me` - Update profile details and preferences
- `GET /api/users/me/dashboard` - Retrieve aggregated dashboard metrics

### Job Exploration
- `GET /api/jobs` - Paginated job listings with multi-facet filters
- `GET /api/jobs/{job_id}` - Detailed job profile and similar jobs

### Resume & AI Engine
- `POST /api/resumes/upload` - Upload PDF/DOCX and trigger NLP extraction
- `GET /api/resumes/{resume_id}` - Retrieve extracted skills, education, and summary
- `PUT /api/resumes/{resume_id}/review` - Update reviewed/corrected skills
- `GET /api/recommendations` - Fetch 6-factor AI ranked job recommendations
- `POST /api/recommendations/recalculate` - Force recalculation of AI match scores

### Applications & Saved Jobs
- `GET /api/saved-jobs` - List bookmarked jobs
- `POST /api/saved-jobs` - Bookmark a job
- `DELETE /api/saved-jobs/{job_id}` - Remove bookmark
- `GET /api/applications` - List applications across pipeline stages
- `POST /api/applications` - Record application status & notes
- `PATCH /api/applications/{app_id}` - Update status (`Saved`, `Applied`, `Interview`, `Offer`, `Rejected`)

### Admin Console
- `GET /api/admin/dashboard` - Admin KPIs, inventory charts, trends, refresh status, and recent errors
- `GET /api/admin/users` - Searchable/paginated user directory
- `PATCH /api/admin/users/{user_id}` - Update permitted user role or active status
- `GET /api/admin/jobs` - Searchable and filterable collected listings
- `GET /api/admin/sources` - Sanitized job-source configuration and latest status
- `PATCH /api/admin/sources/{source_id}` - Update source enabled status or refresh interval
- `GET /api/admin/scraping/logs` - History of scraping runs
- `POST /api/admin/scraping/run` - Trigger scraping execution
- `GET /api/admin/audit-logs` - Read-only administrative activity
- `POST /api/admin/jobs/import` - Manually import a verified listing

---

## 10. Live Supabase Deployment & Institutional Configuration

The project is now connected directly to your live Supabase project (`thjntplchmvyzjykgoru`):
- **Database Schema:** `database/schema.sql` applied to live PostgreSQL 17 (all 11 tables, constraints, indexes, triggers, and RLS policies active).
- **Storage:** Secure `resumes` bucket configured with restricted mime-type policies (PDF, DOCX).
- **Seeded Data:** 100 verified opportunities initialized in `public.jobs`.
- **Default Institution:** Pre-configured for **K S Rangasamy College of Technology (Autonomous)** (Campus: *KSR Kalvi Nagar, Tiruchengode*). All newly registered student accounts and dashboard profiles default to this institution automatically.
- **Configured Environments:** Both [backend/.env](file:///c:/Users/suren/OneDrive/Desktop/Job/ai-job-recommendation/backend/.env) and [frontend/.env](file:///c:/Users/suren/OneDrive/Desktop/Job/ai-job-recommendation/frontend/.env) are updated with your live URL and keys.
