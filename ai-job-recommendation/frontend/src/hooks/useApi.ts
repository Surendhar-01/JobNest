import { useQuery } from '@tanstack/react-query'
import { get } from '../services/api'
export function useApi<T>(path:string,params?:Record<string,unknown>,enabled=true){return useQuery<T>({queryKey:[path,params],queryFn:()=>get<T>(path,params),enabled,retry:1,staleTime:30000})}
