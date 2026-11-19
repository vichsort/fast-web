// Acesso direto ao stack local do backend para preparar e conferir os testes, com os usuários do seed
// (../fast/supabase/seed.sql). Nada aqui passa pelo app.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { loadEnv } from 'vite';
import type { Database } from '../../../src/lib/database.types';

const env = { ...loadEnv('production', process.cwd(), 'VITE_'), ...process.env };
export const supabaseUrl = env.VITE_SUPABASE_URL ?? '';
const anonKey = env.VITE_SUPABASE_ANON_KEY ?? '';

/** Senha de todos os usuários do seed. */
export const PASSWORD = 'senha-local';

export const users = {
  owner: 'dono@fast.test',
  manager: 'escritorio@fast.test',
  technician1: 'tecnico1@fast.test',
  technician2: 'tecnico2@fast.test',
} as const;

type Client = SupabaseClient<Database>;

export async function signIn(email: string): Promise<{ client: Client; userId: string }> {
  const client = createClient<Database>(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`login de ${email} no stack local falhou: ${error.message}`);
  return { client, userId: data.user.id };
}

async function companyOf(client: Client, userId: string) {
  const { data, error } = await client.from('company_members').select('company_id').eq('user_id', userId).single();
  if (error) throw error;
  return data.company_id;
}

/** O.S. nova da Fast, criada pelo escritório, com cliente próprio e atribuída aos técnicos dados. */
export async function createOrder(assignees: string[], { dueDate }: { dueDate?: string } = {}) {
  const { client, userId } = await signIn(users.manager);
  const companyId = await companyOf(client, userId);
  const assigneeIds = await Promise.all(assignees.map(async (email) => (await signIn(email)).userId));
  const tag = crypto.randomUUID().slice(0, 8);

  const clientId = crypto.randomUUID();
  const clientName = `Cliente E2E ${tag}`;
  const created = await client.rpc('create_client', {
    p_id: clientId,
    p_company_id: companyId,
    p_name: clientName,
  });
  if (created.error) throw created.error;

  const title = `Instalação E2E ${tag}`;
  const order = await client.rpc('create_order', {
    p_id: crypto.randomUUID(),
    p_company_id: companyId,
    p_client_id: clientId,
    p_service_type: 'installation',
    p_title: title,
    p_assignee_ids: assigneeIds,
    p_due_date: dueDate,
  });
  if (order.error) throw order.error;
  const { id, order_number } = order.data as { id: string; order_number: number };
  return { id, orderNumber: order_number, title, clientName };
}

/** O que o servidor tem da O.S., visto pelo escritório. */
export async function serverOrder(orderId: string) {
  const { client } = await signIn(users.manager);
  const order = await client.from('service_orders').select('status, due_at').eq('id', orderId).single();
  if (order.error) throw order.error;
  const executions = await client
    .from('service_order_executions')
    .select('id, description, client_started_at, supplements_execution_id, review_status, review_comment, received_at')
    .order('received_at')
    .eq('service_order_id', orderId);
  if (executions.error) throw executions.error;
  const photos = await client
    .from('service_order_photos')
    .select('id, execution_id, source')
    .eq('service_order_id', orderId);
  if (photos.error) throw photos.error;
  return { status: order.data.status, dueAt: order.data.due_at, executions: executions.data, photos: photos.data };
}

/** O escritório cancela a O.S. (03, `cancel_order`). */
export async function cancelOrder(orderId: string, reason: string) {
  const { client } = await signIn(users.manager);
  const { error } = await client.rpc('cancel_order', { p_order_id: orderId, p_reason: reason });
  if (error) throw error;
}

/** Técnico novo, só do teste, na empresa da Fast: usuário pela chave de serviço, vínculo pelo convite do owner (06). */
export async function createTechnician(): Promise<{ email: string; userId: string; memberId: string }> {
  const serviceKey = process.env.E2E_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error('E2E_SERVICE_ROLE_KEY ausente: o globalSetup não leu a chave do stack local.');
  const admin = createClient<Database>(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const tag = crypto.randomUUID().slice(0, 8);
  const email = `e2e-${tag}@fast.test`;
  const fullName = `Técnico E2E ${tag}`;
  const created = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (created.error) throw created.error;

  const { client, userId: ownerId } = await signIn(users.owner);
  const invited = await client.functions.invoke<{ member_id: string; user_id: string }>('invite_member', {
    body: { company_id: await companyOf(client, ownerId), email, full_name: fullName, role: 'technician' },
  });
  if (invited.error || !invited.data) throw invited.error ?? new Error('invite_member sem resposta');
  return { email, userId: invited.data.user_id, memberId: invited.data.member_id };
}

/** O owner remove o membro (06, `remove_member`). */
export async function removeMember(memberId: string) {
  const { client } = await signIn(users.owner);
  const { error } = await client.functions.invoke('remove_member', { body: { member_id: memberId, reason: 'E2E' } });
  if (error) throw error;
}

/** Complemento só com texto da tentativa pendente, enviado pelo técnico direto no banco (04, `submit_execution`). */
export async function submitSupplement(orderId: string, executionId: string, email: string, description: string) {
  const { client, userId } = await signIn(email);
  const { error } = await client.rpc('submit_execution', {
    p_execution_id: crypto.randomUUID(),
    p_order_id: orderId,
    p_supplements_execution_id: executionId,
    p_description: description,
    p_participants: [userId],
    p_client_submitted_at: new Date().toISOString(),
  });
  if (error) throw error;
}

/** Fuso da empresa da Fast (`companies.timezone`), o que as telas usam para datas. */
export async function companyTimeZone(): Promise<string> {
  const { client, userId } = await signIn(users.manager);
  const { data, error } = await client
    .from('companies')
    .select('timezone')
    .eq('id', await companyOf(client, userId))
    .single();
  if (error) throw error;
  return data.timezone;
}
