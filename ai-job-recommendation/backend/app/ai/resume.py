"""Extract observed text and phrase matches; never infer degrees or experience."""
from functools import lru_cache
import io
import re
import zipfile
from fastapi import HTTPException

SKILLS = {
 'Python':['python'], 'Java':['java'], 'JavaScript':['javascript','java script'],
 'TypeScript':['typescript'], 'React':['react','react.js','reactjs'], 'Node.js':['node.js','nodejs'],
 'SQL':['sql'], 'PostgreSQL':['postgresql','postgres'], 'MySQL':['mysql'], 'MongoDB':['mongodb'],
 'HTML':['html'], 'CSS':['css'], 'Django':['django'], 'FastAPI':['fastapi'], 'Flask':['flask'],
 'Git':['git'], 'Docker':['docker'], 'AWS':['aws','amazon web services'], 'Azure':['azure'],
 'Machine Learning':['machine learning'], 'Data Analysis':['data analysis'], 'Pandas':['pandas'],
 'NumPy':['numpy'], 'TensorFlow':['tensorflow'], 'PyTorch':['pytorch'], 'Excel':['excel'],
 'Power BI':['power bi'], 'Tableau':['tableau'], 'C++':['c++'], 'C#':['c#'], 'Figma':['figma'],
 'Communication':['communication'], 'Leadership':['leadership'], 'Teamwork':['teamwork'],
 'Problem Solving':['problem solving','problem-solving'], 'Scrum':['scrum']
}

def validate_file(data, suffix):
    if suffix == '.pdf':
        if not data.startswith(b'%PDF-'):
            raise HTTPException(422,'The file is not a valid PDF')
        return 'application/pdf'
    if suffix == '.docx':
        try:
            with zipfile.ZipFile(io.BytesIO(data)) as archive:
                if 'word/document.xml' not in archive.namelist() or sum(x.file_size for x in archive.infolist()) > 25_000_000 or len(archive.infolist()) > 1000:
                    raise ValueError('Invalid or oversized DOCX archive')
        except (zipfile.BadZipFile, ValueError):
            raise HTTPException(422,'The file is not a valid, safely sized DOCX')
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    raise HTTPException(422,'Only PDF and DOCX files are accepted')

def extract_text(data, suffix):
    validate_file(data,suffix)
    try:
        if suffix == '.pdf':
            from pypdf import PdfReader
            reader = PdfReader(io.BytesIO(data))
            if reader.is_encrypted or len(reader.pages) > 100:
                raise HTTPException(422,'Use an unencrypted resume with at most 100 pages')
            text = '\n'.join(page.extract_text() or '' for page in reader.pages)
        else:
            from docx import Document
            document = Document(io.BytesIO(data))
            text = '\n'.join([p.text for p in document.paragraphs] + [cell.text for table in document.tables for row in table.rows for cell in row.cells])
        if not text.strip():
            raise HTTPException(422,'No readable text found. Scanned PDFs need OCR before upload')
        if len(text) > 150000:
            raise HTTPException(422,'Resume text exceeds processing limits')
        return text
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(422,'Could not read this document; export it again as PDF or DOCX')

@lru_cache
def language():
    import spacy
    nlp = spacy.blank('en')
    nlp.add_pipe('sentencizer')
    return nlp

def detect_skills(text):
    # Explicit phrase boundaries avoid matches such as Java within JavaScript.
    return [name for name,aliases in SKILLS.items() if any(re.search(r'(?<!\w)'+re.escape(alias)+r'(?!\w)',text,re.I) for alias in aliases)]

def clean_val(v):
    if v is None:
        return "Not provided"
    s = str(v).strip()
    if not s or s.lower() in ("null", "none", "n/a", "na", "not specified", "unknown", ""):
        return "Not provided"
    return s

def clean_list(items):
    if not items or not isinstance(items, list):
        return []
    cleaned = []
    for x in items:
        s = str(x).strip()
        if s and s.lower() not in ("null", "none", "n/a", "na", "not provided", "not specified"):
            cleaned.append(s)
    return cleaned

def analyze_with_groq(text):
    from app.core import settings
    if not settings.GROQ_API_KEY:
        return None
    import json
    import logging
    import httpx

    sample_text = text[:15000]
    prompt = (
        "You are an expert AI resume parsing system. Analyze the candidate resume text below with complete precision.\n"
        "Extract every single piece of information mentioned. If a field or detail is NOT explicitly mentioned or cannot be found, "
        "set its value to exactly the string 'Not provided' (or an empty list [] for list fields). NEVER fabricate or hallucinate details.\n\n"
        "Return strictly valid JSON with this exact schema:\n"
        "{\n"
        '  "full_name": "Full name of candidate or Not provided",\n'
        '  "college": "College / University name or Not provided",\n'
        '  "current_year": "Current year of study (e.g. 1st year, 2nd year, 3rd year, Final year, Graduated) or Not provided",\n'
        '  "department": "Department / Major / Branch (e.g. Computer Science, Information Technology) or Not provided",\n'
        '  "graduation_year": "Year of graduation (e.g. 2026) or Not provided",\n'
        '  "cgpa": "CGPA / GPA / Percentage or Not provided",\n'
        '  "email": "Email address or Not provided",\n'
        '  "phone": "Phone number or Not provided",\n'
        '  "location": "City, State / Country or Not provided",\n'
        '  "linkedin_url": "LinkedIn profile link or Not provided",\n'
        '  "github_url": "GitHub profile link or Not provided",\n'
        '  "portfolio_url": "Portfolio / personal website link or Not provided",\n'
        '  "technical_skills": ["List", "of", "technical", "skills", "tools", "languages"],\n'
        '  "soft_skills": ["List", "of", "interpersonal", "soft", "skills"],\n'
        '  "educational_qualifications": ["Degree, institution, years, grades/CGPA"],\n'
        '  "work_experience": ["Role, company, duration, responsibilities"],\n'
        '  "internships": ["Internship role, organization, duration, key contributions"],\n'
        '  "projects": ["Project title, tech stack used, key achievements/outcomes"],\n'
        '  "certifications": ["Name of certification, issuing organization, year/credential ID"],\n'
        '  "achievements": ["Honors, awards, hackathons, publications, leadership recognitions"],\n'
        '  "summary": "Concise 2-3 sentence executive profile summary or Not provided",\n'
        '  "suggested_roles": ["Top job roles best matching this candidate"]\n'
        "}\n\n"
        f"Resume Content:\n{sample_text}"
    )

    try:
        with httpx.Client(timeout=30.0) as client:
            res = client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.GROQ_MODEL,
                    "response_format": {"type": "json_object"},
                    "temperature": 0.1,
                    "messages": [
                        {
                            "role": "system",
                            "content": (
                                "You are a professional HR data extraction engine. "
                                "Strictly extract truthful data from resumes. "
                                "Output ONLY valid JSON adhering to the specified format. "
                                "Never generate fake information; if a detail is absent, set it to 'Not provided'."
                            ),
                        },
                        {"role": "user", "content": prompt},
                    ],
                },
            )
            if res.status_code == 200:
                data = res.json()
                content = data["choices"][0]["message"]["content"]
                parsed = json.loads(content)

                # Clean fields
                full_name = clean_val(parsed.get("full_name"))
                college = clean_val(parsed.get("college"))
                current_year = clean_val(parsed.get("current_year"))
                department = clean_val(parsed.get("department"))
                graduation_year = clean_val(parsed.get("graduation_year"))
                cgpa = clean_val(parsed.get("cgpa"))
                email = clean_val(parsed.get("email"))
                phone = clean_val(parsed.get("phone"))
                location = clean_val(parsed.get("location"))
                linkedin_url = clean_val(parsed.get("linkedin_url"))
                github_url = clean_val(parsed.get("github_url"))
                portfolio_url = clean_val(parsed.get("portfolio_url"))

                tech_skills = clean_list(parsed.get("technical_skills"))
                # Merge with detected explicit keywords to guarantee complete coverage
                rule_skills = detect_skills(text)
                combined_tech_skills = list(dict.fromkeys(tech_skills + rule_skills))

                soft_skills = clean_list(parsed.get("soft_skills"))
                edu_qual = clean_list(parsed.get("educational_qualifications"))
                work_exp = clean_list(parsed.get("work_experience"))
                internships = clean_list(parsed.get("internships"))
                projects = clean_list(parsed.get("projects"))
                certifications = clean_list(parsed.get("certifications"))
                achievements = clean_list(parsed.get("achievements"))
                suggested_roles = clean_list(parsed.get("suggested_roles"))
                summary = clean_val(parsed.get("summary"))
                if summary == "Not provided":
                    summary = text.strip()[:600]

                # Combined skills for backward compatibility with matching system
                all_skills = list(dict.fromkeys(combined_tech_skills + soft_skills))

                # Combined experience list for backward compatibility
                all_exp = []
                if work_exp:
                    all_exp.extend([f"Work: {w}" for w in work_exp])
                if internships:
                    all_exp.extend([f"Internship: {i}" for i in internships])

                return {
                    "full_name": full_name,
                    "college": college,
                    "current_year": current_year,
                    "department": department,
                    "graduation_year": graduation_year,
                    "cgpa": cgpa,
                    "email": email,
                    "phone": phone,
                    "location": location,
                    "linkedin_url": linkedin_url,
                    "github_url": github_url,
                    "portfolio_url": portfolio_url,
                    "technical_skills": combined_tech_skills,
                    "soft_skills": soft_skills,
                    "skills": all_skills,
                    "educational_qualifications": edu_qual,
                    "education": edu_qual,
                    "work_experience": work_exp,
                    "internships": internships,
                    "experience": all_exp or work_exp or internships,
                    "projects": projects,
                    "certifications": certifications,
                    "achievements": achievements,
                    "summary": summary,
                    "suggested_roles": suggested_roles,
                    "provenance": f"Groq AI ({settings.GROQ_MODEL}) with NLP verification; review before use",
                }
            else:
                logging.warning("Groq API returned status %s: %s", res.status_code, res.text)
    except Exception as e:
        logging.warning("Groq AI analysis failed (%s); falling back to rule-based NLP", e)

    return None

def analyze_text(text):
    # Try Groq AI analysis first
    groq_result = analyze_with_groq(text)
    if groq_result:
        return groq_result

    # Fallback to local rule-based NLP extraction
    doc = language()(text)
    sections = {'education':[], 'experience':[], 'projects':[], 'certifications':[]}
    headings = {'education':'education','academic qualifications':'education','qualifications':'education',
                'experience':'experience','work experience':'experience','internships':'experience',
                'projects':'projects','personal projects':'projects','certifications':'certifications','certificates':'certifications'}
    section = None
    for line in text.splitlines():
        stripped = line.strip()
        key = stripped.lower().rstrip(':')
        if key in headings:
            section = headings[key]
        elif key in ('skills','technical skills','summary','objective','contact','interests','languages'):
            section = None
        elif stripped and section:
            sections[section].append(stripped)
    # Only literal education/experience statements are included outside sections.
    for sentence in doc.sents:
        raw = sentence.text.strip()
        if re.search(r'\b(bachelor|master|b\.tech|m\.tech|b\.sc|m\.sc|b\.e\.|ph\.?d|diploma)\b',raw,re.I) and not sections['education']:
            sections['education'].append(raw)
        if re.search(r'\b\d+(?:\.\d+)?\s+years?\s+(?:of\s+)?(?:work\s+)?experience\b',raw,re.I) and not sections['experience']:
            sections['experience'].append(raw)
    skills = detect_skills(text)
    suggestions = []
    if 'Python' in skills: suggestions.append('Python Developer')
    if 'React' in skills or 'JavaScript' in skills: suggestions.append('Frontend Developer')
    if 'SQL' in skills and ('Pandas' in skills or 'Excel' in skills): suggestions.append('Data Analyst')
    if 'Machine Learning' in skills: suggestions.append('Machine Learning Engineer')
    return {
        'full_name': 'Not provided',
        'college': 'Not provided',
        'current_year': 'Not provided',
        'department': 'Not provided',
        'graduation_year': 'Not provided',
        'cgpa': 'Not provided',
        'email': 'Not provided',
        'phone': 'Not provided',
        'location': 'Not provided',
        'linkedin_url': 'Not provided',
        'github_url': 'Not provided',
        'portfolio_url': 'Not provided',
        'technical_skills': skills,
        'soft_skills': [],
        'skills': skills,
        'educational_qualifications': sections['education'],
        'education': sections['education'],
        'work_experience': sections['experience'],
        'internships': [],
        'experience': sections['experience'],
        'projects': sections['projects'],
        'certifications': sections['certifications'],
        'achievements': [],
        'summary': text.strip()[:600] or 'Not provided',
        'suggested_roles': suggestions,
        'provenance': 'Extracted text and explicit phrase matches; review before use'
    }
