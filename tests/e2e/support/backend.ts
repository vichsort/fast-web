// Acesso direto ao stack local do backend para preparar e conferir os testes, com os usuários do seed
// (../fast/supabase/seed.sql). Nada aqui passa pelo app.
import { execFileSync } from 'node:child_process';
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

export async function signIn(email: string, password = PASSWORD): Promise<{ client: Client; userId: string }> {
  const client = createClient<Database>(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
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
    .select('id, execution_id, source, file_size')
    .eq('service_order_id', orderId);
  if (photos.error) throw photos.error;
  return { status: order.data.status, dueAt: order.data.due_at, executions: executions.data, photos: photos.data };
}

/** Título e materiais que o servidor tem da O.S., vistos pelo escritório. */
export async function serverOrderText(orderId: string) {
  const { client } = await signIn(users.manager);
  const { data, error } = await client
    .from('service_orders')
    .select('title, materials_notes')
    .eq('id', orderId)
    .single();
  if (error) throw error;
  return { title: data.title, materials: data.materials_notes };
}

/** O técnico muda os materiais com sinal, direto no banco (03, `update_materials_notes`, R11). */
export async function updateMaterialsAs(email: string, orderId: string, text: string, expected: string | null) {
  const { client } = await signIn(email);
  const { error } = await client.rpc('update_materials_notes', {
    p_order_id: orderId,
    p_text: text,
    p_expected: expected ?? undefined,
  });
  if (error) throw error;
}

/** O escritório troca os técnicos da O.S. (03, `set_assignees`). */
export async function setAssignees(orderId: string, emails: string[]) {
  const { client } = await signIn(users.manager);
  const ids = await Promise.all(emails.map(async (email) => (await signIn(email)).userId));
  const { error } = await client.rpc('set_assignees', { p_order_id: orderId, p_assignee_ids: ids });
  if (error) throw error;
}

/** O escritório cancela a O.S. (03, `cancel_order`). */
export async function cancelOrder(orderId: string, reason: string) {
  const { client } = await signIn(users.manager);
  const { error } = await client.rpc('cancel_order', { p_order_id: orderId, p_reason: reason });
  if (error) throw error;
}

/** Técnico novo, só do teste, na empresa da Fast: usuário pela chave de serviço, vínculo pelo convite do owner (06). */
/** Cliente com a chave de serviço (passa por cima do RLS), só para preparar o que a tela não cria. */
function adminClient(): Client {
  const serviceKey = process.env.E2E_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error('E2E_SERVICE_ROLE_KEY ausente: o globalSetup não leu a chave do stack local.');
  return createClient<Database>(supabaseUrl, serviceKey, { auth: { persistSession: false } });
}

/**
 * Os testes convidam sempre como o owner do seed, e o limite de convites (06, R7: 20 por hora) pararia a segunda ou a
 * terceira rodada seguida. O globalSetup apaga as tentativas contadas antes de cada rodada.
 */
export async function forgetInviteAttempts() {
  const { error } = await adminClient().from('member_invite_attempts').delete().gte('created_at', '-infinity');
  if (error) throw error;
}

/** Técnico próprio do teste: conta com senha, convidado pelo owner (`invite_member`) e com o convite aceito. */
export async function createTechnician(): Promise<{ email: string; userId: string; memberId: string }> {
  const admin = adminClient();
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
  const invited = await client.functions.invoke<{ member_id: string; token: string | null }>('invite_member', {
    body: { company_id: await companyOf(client, ownerId), email, full_name: fullName, role: 'technician' },
  });
  if (invited.error || !invited.data) throw invited.error ?? new Error('invite_member sem resposta');
  // O convite fica pendente até o aceite do convidado (06, R10): a conta já tem senha, então aceita pela RPC.
  const technician = await signIn(email);
  const accepted = await technician.client.rpc('accept_invite', { p_member_id: invited.data.member_id });
  if (accepted.error) throw accepted.error;
  return { email, userId: created.data.user.id, memberId: invited.data.member_id };
}

/** O owner convida (06, `invite_member`) e devolve o token do link do convite. */
export async function inviteMember(
  email: string,
  fullName = 'Convidado E2E',
): Promise<{ memberId: string; token: string }> {
  const { client, userId: ownerId } = await signIn(users.owner);
  const invited = await client.functions.invoke<{ member_id: string; token: string | null }>('invite_member', {
    body: { company_id: await companyOf(client, ownerId), email, full_name: fullName, role: 'technician' },
  });
  if (invited.error || !invited.data?.token) throw invited.error ?? new Error('invite_member sem link');
  return { memberId: invited.data.member_id, token: invited.data.token };
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

/** O usuário sai da conta em outro aparelho: o logout global revoga todas as sessões dele (queue.md, S5). */
export async function signOutEverywhere(email: string) {
  const { client } = await signIn(email);
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

/** SQL como `postgres`, no container do banco do stack local: a chave de serviço não apaga nada (api.md do backend). */
function psqlAsPostgres(sql: string) {
  execFileSync(
    'docker',
    ['exec', '-i', 'supabase_db_fast', 'psql', '-U', 'postgres', '-X', '-q', '-v', 'ON_ERROR_STOP=1'],
    {
      input: sql,
    },
  );
}

/**
 * Empresa própria do teste, com um owner novo e `count` O.S. de um cliente, gravadas direto pela chave de serviço
 * (sem as RPCs, para caber no tempo do teste). A O.S. nº 1, a mais antiga, tem título próprio. Isolada do seed: as
 * outras empresas e os outros testes não a veem. `remove` apaga as O.S. e o cliente no fim, como `postgres`, para o
 * banco local não crescer a cada rodada e atrasar os outros testes.
 */
export async function createCompanyWithOrders(count: number) {
  const admin = adminClient();
  const tag = crypto.randomUUID().slice(0, 8);
  const email = `e2e-owner-${tag}@fast.test`;
  const user = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: `Dono E2E ${tag}` },
  });
  if (user.error) throw user.error;
  const ownerId = user.data.user.id;

  const company = await admin
    .from('companies')
    .insert({ name: `Volume E2E ${tag}`, next_order_number: count + 1 })
    .select('id')
    .single();
  if (company.error) throw company.error;
  const companyId = company.data.id;

  const member = await admin.from('company_members').insert({ company_id: companyId, user_id: ownerId, role: 'owner' });
  if (member.error) throw member.error;
  const client = await admin
    .from('clients')
    .insert({ company_id: companyId, name: `Cliente volume ${tag}` })
    .select('id')
    .single();
  if (client.error) throw client.error;

  const oldestTitle = `Mais antiga ${tag}`;
  const orders = Array.from({ length: count }, (_, i) => ({
    company_id: companyId,
    order_number: i + 1,
    client_id: client.data.id,
    service_type: 'installation' as const,
    title: i === 0 ? oldestTitle : `Volume ${tag} ${i + 1}`,
    created_by: ownerId,
  }));
  const inserted = await admin.from('service_orders').insert(orders);
  if (inserted.error) throw inserted.error;

  const remove = async () => {
    psqlAsPostgres(
      ['service_order_history', 'service_orders', 'clients']
        .map((table) => `delete from public.${table} where company_id = '${companyId}';`)
        .join('\n'),
    );
  };
  return { email, oldestTitle, remove };
}
