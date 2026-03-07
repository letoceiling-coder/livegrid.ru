import api from '@/lib/api';

export interface CrmRole {
  value: string;
  label: string;
}

export interface CrmUser {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

export interface Paginated<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export const crmGetRoles = async (): Promise<CrmRole[]> => {
  const { data } = await api.get<CrmRole[]>('/crm/roles');
  return data;
};

export const crmGetUsers = async (q = '', page = 1, perPage = 20): Promise<Paginated<CrmUser>> => {
  const { data } = await api.get<Paginated<CrmUser>>('/crm/users', {
    params: { q, page, per_page: perPage },
  });
  return data;
};

export const crmCreateUser = async (payload: { name: string; email: string; password: string; role: string }) => {
  const { data } = await api.post('/crm/users', payload);
  return data;
};

export const crmUpdateUser = async (id: number, payload: { name?: string; email?: string; password?: string; role?: string }) => {
  const { data } = await api.put(`/crm/users/${id}`, payload);
  return data;
};

export const crmDeleteUser = async (id: number) => {
  const { data } = await api.delete(`/crm/users/${id}`);
  return data;
};

export const crmGetDictionary = async (entity: string, q = '', page = 1, perPage = 30): Promise<Paginated<Record<string, any>>> => {
  const { data } = await api.get<Paginated<Record<string, any>>>(`/crm/dictionaries/${entity}`, {
    params: { q, page, per_page: perPage },
  });
  return data;
};

export const crmCreateDictionary = async (entity: string, payload: Record<string, any>) => {
  const { data } = await api.post(`/crm/dictionaries/${entity}`, payload);
  return data;
};

export const crmUpdateDictionary = async (entity: string, id: string, payload: Record<string, any>) => {
  const { data } = await api.put(`/crm/dictionaries/${entity}/${id}`, payload);
  return data;
};

export const crmDeleteDictionary = async (entity: string, id: string) => {
  const { data } = await api.delete(`/crm/dictionaries/${entity}/${id}`);
  return data;
};

export const crmGetCatalog = async (entity: 'blocks' | 'apartments', q = '', page = 1, perPage = 20): Promise<Paginated<Record<string, any>>> => {
  const { data } = await api.get<Paginated<Record<string, any>>>(`/crm/catalog/${entity}`, {
    params: { q, page, per_page: perPage },
  });
  return data;
};

export const crmCreateCatalog = async (entity: 'blocks' | 'apartments', payload: Record<string, any>) => {
  const { data } = await api.post(`/crm/catalog/${entity}`, payload);
  return data;
};

export const crmUpdateCatalog = async (entity: 'blocks' | 'apartments', id: string, payload: Record<string, any>) => {
  const { data } = await api.put(`/crm/catalog/${entity}/${id}`, payload);
  return data;
};

export const crmDeleteCatalog = async (entity: 'blocks' | 'apartments', id: string) => {
  const { data } = await api.delete(`/crm/catalog/${entity}/${id}`);
  return data;
};

export const crmRunFeed = async (command: 'feed:collect' | 'feed:inspect' | 'feed:analyze' | 'feed:sync') => {
  const { data } = await api.post<{ command: string; output: string; exit_code: number }>('/crm/feed/run', { command });
  return data;
};

