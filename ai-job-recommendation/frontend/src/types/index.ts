export interface Job { id:string; title:string|null; company:string|null; location:string|null; description:string|null; skills:string[]|null; experience:string|null; salary:string|null; job_type:string|null; posted_date:string|null; application_url:string|null; source:string; collected_at:string; qualification?:string|null; department?:string|null; work_mode?:string|null; experience_min?:number|null; salary_min?:number|null; salary_max?:number|null; is_demo:boolean; is_active:boolean; similar_jobs?:Job[] }
export interface Page<T> {items:T[];total:number;page:number;page_size:number;data_mode?:string}
export interface Profile {id:string;full_name:string;email:string;role:'student'|'admin';phone:string|null;photo_url:string|null;department:string|null;degree:string|null;college:string|null;graduation_year:number|null;current_location:string|null;preferred_location:string|null;preferred_job_type:string|null;expected_salary:number|null;technical_skills:string[];soft_skills:string[];certifications:string[];projects:string[];internship_experience:string|null;work_experience:string|null;experience_years:number|null}
export interface ResumeAnalysis {
  full_name?: string;
  college?: string;
  current_year?: string;
  department?: string;
  graduation_year?: string;
  cgpa?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin_url?: string;
  github_url?: string;
  portfolio_url?: string;
  technical_skills?: string[];
  soft_skills?: string[];
  skills?: string[];
  educational_qualifications?: string[];
  education?: string[];
  work_experience?: string[];
  internships?: string[];
  experience?: string[];
  projects?: string[];
  certifications?: string[];
  achievements?: string[];
  summary?: string;
  suggested_roles?: string[];
  provenance?: string;
}
export interface Resume {id:string;file_name:string;size_bytes:number;status:'uploaded'|'analyzing'|'analyzed'|'failed';analysis:ResumeAnalysis|null;reviewed:boolean;error:string|null;created_at:string}
export interface Explanation {matching_skills:string[];missing_skills:string[];eligibility:string;reason:string;components:Record<string,number>;weights:Record<string,number>;skill_basis:string;disclaimer:string}
export interface Recommendation {id?:string;job_id:string;score:number;explanation:Explanation;job:Job|null}
export interface Saved {id:string;job_id:string;created_at:string;job:Job|null}
export type ApplicationStatus='Saved'|'Applied'|'Interview'|'Offer'|'Rejected'
export interface Application {id:string;job_id:string;status:ApplicationStatus;notes:string;history:{status:string;at:string}[];updated_at:string;job:Job|null}
export interface Health {status:string;supabase_configured:boolean;practice_preview:boolean;service_key_configured:boolean;semantic_model:string}
export interface Stats {total:number;practice_jobs:number;sources:Record<string,number>;departments:Record<string,number>}
export interface Dashboard {profile:Profile;matching_jobs:number;saved_jobs:number;applications:number;profile_completion:number;resume:Resume|null;application_statuses:Record<string,number>;recommendations:Recommendation[];recent_jobs:Job[];department_jobs:Job[]}
export interface Source {id:string;name:string;url:string;permission_url:string;adapter:'practice'|'json_api';enabled:boolean;permitted:boolean;interval_seconds:number;config:Record<string,unknown>;access_denied:boolean;last_attempt:string|null;last_success:string|null}
export interface ScrapeLog {id:string;source_id:string;status:string;job_count:number;error:string|null;started_at:string;finished_at:string|null}
export interface AdminStats {users:number;jobs:number;active_jobs:number;resumes:number;jobs_by_source:Record<string,number>;jobs_by_department:Record<string,number>;resume_statuses:Record<string,number>;collection_statuses:Record<string,number>;recent_logs:ScrapeLog[];activity:{id:string;action:string;created_at:string}[]}
