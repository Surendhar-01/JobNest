import { Navigate,Outlet,useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ErrorState,Spinner } from '../components/UI'
export function Protected({admin=false}:{admin?:boolean}){const {session,profile,loading,error,refresh}=useAuth(),location=useLocation();if(loading)return <Spinner/>;if(!session)return <Navigate to="/login" state={{from:location.pathname}} replace/>;if(error)return <ErrorState error={new Error(error)} retry={()=>void refresh()}/>;if(!profile)return <Spinner/>;if(admin&&profile.role!=='admin')return <Navigate to="/dashboard" replace/>;if(!admin&&profile.role==='admin')return <Navigate to="/admin" replace/>;return <Outlet/>}
