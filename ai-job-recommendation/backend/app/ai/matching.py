import logging
import threading
from functools import lru_cache
from fastapi import HTTPException
from app.ai.resume import detect_skills
from app.core import settings

model_lock = threading.Lock()

@lru_cache
def load_sentence_transformer():
    try:
        from sentence_transformers import SentenceTransformer
        return SentenceTransformer(settings.MODEL, device='cpu', local_files_only=settings.MODEL_LOCAL_ONLY)
    except Exception as e:
        logging.info("SentenceTransformer not loaded (%s); using Scikit-Learn TF-IDF semantic vectorizer", e)
        return None

def qualification_matches(candidate, required):
    pairs = [
        ('bachelor', ('bachelor', 'b.tech', 'b.e', 'b.sc', 'bca', 'bba')),
        ('master', ('master', 'm.tech', 'm.sc', 'mca', 'mba')),
        ('phd', ('phd', 'ph.d', 'doctorate')),
        ('diploma', ('diploma',))
    ]
    text, requirement = candidate.casefold(), required.casefold()
    for name, aliases in pairs:
        if any(alias in requirement for alias in aliases):
            return any(alias in text for alias in aliases)
    return requirement in text

def score_job(job, profile, analysis, semantic):
    candidate = {
        s.casefold(): s
        for s in [
            *(profile.get('technical_skills') or []),
            *(profile.get('soft_skills') or []),
            *(analysis.get('skills') or [])
        ]
    }
    requirements = job.get('skills') or detect_skills(job.get('description') or '')
    matching = [s for s in requirements if s.casefold() in candidate]
    missing = [s for s in requirements if s.casefold() not in candidate]
    values = {'semantic': max(0.0, min(1.0, float(semantic)))}
    eligibility, reasons = 'unknown', []

    if requirements:
        values['skills'] = len(matching) / len(requirements)

    if job.get('qualification'):
        education = ' '.join([profile.get('degree') or '', *(analysis.get('education') or [])])
        if education.strip():
            values['qualification'] = float(qualification_matches(education, job['qualification']))
            eligibility = 'eligible' if values['qualification'] else 'ineligible'
            reasons.append('Explicit qualification requirement ' + ('matches' if values['qualification'] else 'does not match'))
        else:
            reasons.append('Qualification evidence is missing')

    if job.get('experience_min') is not None:
        years = profile.get('experience_years')
        if years is not None:
            values['experience'] = float(years >= job['experience_min'])
            if not values['experience']:
                eligibility = 'ineligible'
            elif eligibility != 'ineligible' and (not job.get('qualification') or 'qualification' in values):
                eligibility = 'eligible'
            reasons.append('Explicit experience requirement ' + ('matches' if values['experience'] else 'does not match'))
        else:
            reasons.append('Experience requirement could not be verified')
            if eligibility == 'eligible':
                eligibility = 'unknown'

    for dimension, preference, field in [('location', 'preferred_location', 'location'), ('job_type', 'preferred_job_type', 'job_type')]:
        if profile.get(preference) and job.get(field):
            values[dimension] = float(profile[preference].casefold() in job[field].casefold())

    denominator = sum(settings.WEIGHTS[k] for k in values)
    score = round(100 * sum(settings.WEIGHTS[k] * v for k, v in values.items()) / denominator, 2) if denominator else 0

    if matching:
        reasons.append('Matches: ' + ', '.join(matching))
    if missing:
        reasons.append('Recommended to learn: ' + ', '.join(missing))
    if eligibility == 'unknown':
        reasons.append('Some requirements are unverified')

    return {
        'score': score,
        'matching_skills': matching,
        'missing_skills': missing,
        'eligibility': eligibility,
        'reason': '; '.join(reasons) or 'Semantic relevance to your candidate profile',
        'components': values,
        'weights': settings.WEIGHTS,
        'skill_basis': 'Explicit source skills' if job.get('skills') else 'Skill mentions in description',
        'disclaimer': 'A system-generated relevance score, not a probability of being hired.'
    }

def rank_jobs(jobs, profile, analysis):
    if not jobs:
        return []

    candidate = '\n'.join([
        profile.get('degree') or '',
        profile.get('work_experience') or '',
        ' '.join(profile.get('technical_skills') or []),
        analysis.get('summary') or '',
        ' '.join(analysis.get('skills') or []),
        ' '.join(analysis.get('education') or [])
    ])

    if not candidate.strip():
        raise HTTPException(422, 'Add skills and qualifications to your profile or analyze a resume first')

    from sklearn.metrics.pairwise import cosine_similarity
    texts = [candidate] + [
        (j.get('title') or '') + ' ' + (j.get('description') or '') + ' ' + ' '.join(j.get('skills') or [])
        for j in jobs
    ]

    model = load_sentence_transformer()
    if model is not None:
        try:
            with model_lock:
                embeddings = model.encode(texts, normalize_embeddings=True, show_progress_bar=False, batch_size=16)
            similarities = cosine_similarity(embeddings[:1], embeddings[1:])[0]
        except Exception as e:
            logging.warning("SentenceTransformer encoding failed (%s); falling back to TF-IDF", e)
            from sklearn.feature_extraction.text import TfidfVectorizer
            tfidf = TfidfVectorizer(stop_words='english', max_features=5000, ngram_range=(1, 2))
            vectors = tfidf.fit_transform(texts)
            similarities = cosine_similarity(vectors[0:1], vectors[1:])[0]
    else:
        from sklearn.feature_extraction.text import TfidfVectorizer
        tfidf = TfidfVectorizer(stop_words='english', max_features=5000, ngram_range=(1, 2))
        vectors = tfidf.fit_transform(texts)
        similarities = cosine_similarity(vectors[0:1], vectors[1:])[0]

    result = []
    for job, similarity in zip(jobs, similarities):
        explanation = score_job(job, profile, analysis, similarity)
        if explanation['eligibility'] != 'ineligible':
            result.append({
                'job_id': job['id'],
                'score': explanation['score'],
                'explanation': explanation,
                'job': job
            })

    return sorted(result, key=lambda row: row['score'], reverse=True)
