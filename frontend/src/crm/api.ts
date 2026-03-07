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

export interface CrmObjectType {
  id: number;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  position: number;
}

export interface PropertyDefinitionOption {
  id: number;
  property_definition_id: number;
  value: string;
  label: string;
  is_active: boolean;
  position: number;
}

export interface PropertyDefinition {
  id: number;
  code: string;
  name: string;
  description: string | null;
  data_type: 'string' | 'number' | 'boolean' | 'date' | 'json' | 'enum';
  is_required: boolean;
  is_filterable: boolean;
  is_multivalue: boolean;
  default_value: string | null;
  object_type_id: number | null;
  is_active: boolean;
  position: number;
  options?: PropertyDefinitionOption[];
}

export interface CrmCatalogObject {
  id: number;
  external_id: string | null;
  source_type: 'feed' | 'manual' | 'import';
  object_type_id: number;
  name: string;
  slug: string | null;
  description: string | null;
  lifecycle_status: 'draft' | 'in_review' | 'published' | 'archived';
  manual_override: boolean;
  is_active: boolean;
  position: number;
  meta: Record<string, any> | null;
  object_type?: Pick<CrmObjectType, 'id' | 'code' | 'name'>;
}

export interface CrmObjectPropertyValue {
  id: number;
  catalog_object_id: number;
  property_definition_id: number;
  value_text: string | null;
  value_number: number | null;
  value_boolean: boolean | null;
  value_date: string | null;
  value_json: Record<string, any> | null;
  value_source: 'feed' | 'manual' | 'import';
  is_locked_by_manual: boolean;
  definition?: Pick<PropertyDefinition, 'id' | 'code' | 'name' | 'data_type'>;
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

export const crmGetObjectTypes = async (q = '', page = 1, perPage = 30): Promise<Paginated<CrmObjectType>> => {
  const { data } = await api.get<Paginated<CrmObjectType>>('/crm/object-types', {
    params: { q, page, per_page: perPage },
  });
  return data;
};

export const crmCreateObjectType = async (payload: Partial<CrmObjectType> & { code: string; name: string }) => {
  const { data } = await api.post('/crm/object-types', payload);
  return data;
};

export const crmUpdateObjectType = async (id: number, payload: Partial<CrmObjectType>) => {
  const { data } = await api.put(`/crm/object-types/${id}`, payload);
  return data;
};

export const crmDeleteObjectType = async (id: number) => {
  const { data } = await api.delete(`/crm/object-types/${id}`);
  return data;
};

export const crmGetPropertyDefinitions = async (
  objectTypeId?: number,
  q = '',
  page = 1,
  perPage = 30
): Promise<Paginated<PropertyDefinition>> => {
  const { data } = await api.get<Paginated<PropertyDefinition>>('/crm/properties/definitions', {
    params: { object_type_id: objectTypeId, q, page, per_page: perPage },
  });
  return data;
};

export const crmCreatePropertyDefinition = async (payload: Partial<PropertyDefinition> & { code: string; name: string; data_type: PropertyDefinition['data_type'] }) => {
  const { data } = await api.post('/crm/properties/definitions', payload);
  return data;
};

export const crmUpdatePropertyDefinition = async (id: number, payload: Partial<PropertyDefinition>) => {
  const { data } = await api.put(`/crm/properties/definitions/${id}`, payload);
  return data;
};

export const crmDeletePropertyDefinition = async (id: number) => {
  const { data } = await api.delete(`/crm/properties/definitions/${id}`);
  return data;
};

export const crmCreatePropertyOption = async (definitionId: number, payload: { value: string; label: string; is_active?: boolean; position?: number }) => {
  const { data } = await api.post(`/crm/properties/definitions/${definitionId}/options`, payload);
  return data;
};

export const crmUpdatePropertyOption = async (
  definitionId: number,
  optionId: number,
  payload: { value?: string; label?: string; is_active?: boolean; position?: number }
) => {
  const { data } = await api.put(`/crm/properties/definitions/${definitionId}/options/${optionId}`, payload);
  return data;
};

export const crmDeletePropertyOption = async (definitionId: number, optionId: number) => {
  const { data } = await api.delete(`/crm/properties/definitions/${definitionId}/options/${optionId}`);
  return data;
};

export const crmGetObjects = async (
  params: {
    q?: string;
    object_type_id?: number;
    source_type?: 'feed' | 'manual' | 'import';
    page?: number;
    per_page?: number;
  } = {}
): Promise<Paginated<CrmCatalogObject>> => {
  const { data } = await api.get<Paginated<CrmCatalogObject>>('/crm/objects', {
    params: {
      q: params.q ?? '',
      object_type_id: params.object_type_id,
      source_type: params.source_type,
      page: params.page ?? 1,
      per_page: params.per_page ?? 30,
    },
  });
  return data;
};

export const crmCreateObject = async (
  payload: Partial<CrmCatalogObject> & {
    source_type: 'feed' | 'manual' | 'import';
    object_type_id: number;
    name: string;
    lifecycle_status: 'draft' | 'in_review' | 'published' | 'archived';
  }
) => {
  const { data } = await api.post('/crm/objects', payload);
  return data;
};

export const crmUpdateObject = async (id: number, payload: Partial<CrmCatalogObject>) => {
  const { data } = await api.put(`/crm/objects/${id}`, payload);
  return data;
};

export const crmDeleteObject = async (id: number) => {
  const { data } = await api.delete(`/crm/objects/${id}`);
  return data;
};

export const crmGetObjectPropertyValues = async (objectId: number): Promise<CrmObjectPropertyValue[]> => {
  const { data } = await api.get<CrmObjectPropertyValue[]>(`/crm/objects/${objectId}/properties`);
  return data;
};

export const crmSaveObjectPropertyValues = async (
  objectId: number,
  values: Array<{
    property_definition_id: number;
    value: any;
    value_source?: 'feed' | 'manual' | 'import';
    is_locked_by_manual?: boolean;
  }>
) => {
  const { data } = await api.post(`/crm/objects/${objectId}/properties`, { values });
  return data;
};

export const crmRunFeed = async (command: 'feed:collect' | 'feed:inspect' | 'feed:analyze' | 'feed:sync' | 'catalog:sync-from-legacy') => {
  const { data } = await api.post<{ command: string; output: string; exit_code: number }>('/crm/feed/run', { command });
  return data;
};

