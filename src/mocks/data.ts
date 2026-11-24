// Dados de exemplo (linhas do banco). Datas relativas ao carregamento do módulo, para "atrasada", "hoje" e
// "há 5 min" fazerem sentido em qualquer dia. As telas não importam daqui: usam as funções de api.ts.

import type { OrderPriority, OrderStatus, PhotoSource, ReviewStatus, ServiceType } from '@/lib/enums';
import { calendarDay } from '@/lib/format';
import type {
  Assignment,
  AuditLog,
  Client,
  ClientAddress,
  Company,
  CompanyMember,
  Execution,
  HistoryEvent,
  PendingItem,
  Photo,
  Profile,
  ServiceOrder,
  SyncState,
} from '@/lib/views';
import { type PhotoScene, samplePhotoUrl } from './images';

export const TIME_ZONE = 'America/Sao_Paulo';
export const NOW = Date.now();

const HOUR = 3_600_000;
const iso = (ms: number) => new Date(ms).toISOString();
export const hoursAgo = (hours: number) => iso(NOW - hours * HOUR);
const daysAgo = (days: number) => hoursAgo(days * 24);
/** Fim do dia `days` a partir de hoje, no fuso da empresa (03, R5). São Paulo não tem horário de verão. */
const dueIn = (days: number) =>
  new Date(`${calendarDay(new Date(NOW + days * 24 * HOUR), TIME_ZONE)}T23:59:59.999-03:00`).toISOString();

/** UUID legível por tipo: prefixo de 2 hex + sequência. */
const uid = (prefix: string, n: number) => `${prefix}000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

// ---------------------------------------------------------------- empresa e pessoas

export const company: Company = {
  id: uid('c0', 1),
  name: 'Fast Monitoramento',
  document: '12.345.678/0001-90',
  email: 'contato@fastmonitoramento.com.br',
  phone: '1133224455',
  timezone: TIME_ZONE,
  next_order_number: 46,
  created_at: daysAgo(400),
  deleted_at: null,
  deleted_by: null,
  delete_reason: null,
};

type PersonKey = 'ricardo' | 'juliana' | 'marcos' | 'diego' | 'paulo' | 'lucas' | 'andre';

const personSeed: Record<PersonKey, { n: number; name: string; phone: string | null; email: string }> = {
  ricardo: { n: 1, name: 'Ricardo Almeida', phone: '11987650001', email: 'ricardo@fastmonitoramento.com.br' },
  juliana: { n: 2, name: 'Juliana Prado', phone: '11987650002', email: 'juliana@fastmonitoramento.com.br' },
  marcos: { n: 3, name: 'Marcos Silva', phone: '11987650003', email: 'marcos@fastmonitoramento.com.br' },
  diego: { n: 4, name: 'Diego Ferreira', phone: '11987650004', email: 'diego@fastmonitoramento.com.br' },
  paulo: { n: 5, name: 'Paulo Henrique Costa', phone: '11987650005', email: 'paulo@fastmonitoramento.com.br' },
  lucas: { n: 6, name: 'Lucas Oliveira', phone: null, email: 'lucas@fastmonitoramento.com.br' },
  andre: { n: 7, name: 'André Souza', phone: '11987650007', email: 'andre@fastmonitoramento.com.br' },
};

export const profiles: Record<PersonKey, Profile> = Object.fromEntries(
  Object.entries(personSeed).map(([key, p]) => [
    key,
    {
      id: uid('a1', p.n),
      full_name: p.name,
      phone: p.phone,
      is_platform_admin: false,
      created_at: daysAgo(390 - p.n * 20),
      updated_at: daysAgo(30),
    },
  ]),
) as Record<PersonKey, Profile>;

export const emails: Record<string, string> = Object.fromEntries(
  (Object.keys(personSeed) as PersonKey[]).map((key) => [profiles[key].id, personSeed[key].email]),
);

const pid = (key: PersonKey) => profiles[key].id;

const memberRole: Record<PersonKey, CompanyMember['role']> = {
  ricardo: 'owner',
  juliana: 'manager',
  marcos: 'technician',
  diego: 'technician',
  paulo: 'technician',
  lucas: 'technician',
  andre: 'technician',
};

export const members: CompanyMember[] = (Object.keys(personSeed) as PersonKey[]).map((key) => ({
  id: uid('a2', personSeed[key].n),
  company_id: company.id,
  user_id: pid(key),
  role: memberRole[key],
  created_at: key === 'lucas' ? daysAgo(20) : daysAgo(380 - personSeed[key].n * 20),
  deleted_at: key === 'andre' ? daysAgo(6) : null,
  deleted_by: key === 'andre' ? pid('ricardo') : null,
  delete_reason: key === 'andre' ? 'Saiu da empresa.' : null,
}));

/** Usuários de exemplo por papel, para as telas simularem a sessão. */
export const sessionUsers = {
  owner: profiles.ricardo,
  manager: profiles.juliana,
  technician: profiles.marcos,
};

// ---------------------------------------------------------------- clientes e endereços

type ClientKey =
  | 'padaria'
  | 'condominio'
  | 'maria'
  | 'autopecas'
  | 'clinica'
  | 'escola'
  | 'joao'
  | 'mercado'
  | 'contabil'
  | 'academia';

const clientSeed: Record<ClientKey, { n: number; name: string; phone: string | null; notes: string | null }> = {
  padaria: { n: 1, name: 'Padaria Pão Dourado', phone: '1132104455', notes: 'Falar com o Sr. Antônio. Abre às 6h.' },
  condominio: {
    n: 2,
    name: 'Condomínio Residencial Jardim das Flores',
    phone: '11976543210',
    notes: 'Síndica: Dona Célia. Portaria 24h, avisar antes.',
  },
  maria: { n: 3, name: 'Maria Aparecida Santos', phone: '11991234567', notes: null },
  autopecas: { n: 4, name: 'Auto Peças Rodovia', phone: '1144556677', notes: null },
  clinica: { n: 5, name: 'Clínica Sorriso Odontologia', phone: '1125557788', notes: 'Atendimento até 19h.' },
  escola: { n: 6, name: 'Escola Infantil Pequeno Saber', phone: '1136669900', notes: 'Serviço só depois das 17h.' },
  joao: { n: 7, name: 'João Carlos Mendes', phone: '11998887766', notes: null },
  mercado: { n: 8, name: 'Mercado Bom Preço', phone: '1140028922', notes: 'Entrada de serviço pela Rua B.' },
  contabil: { n: 9, name: 'Escritório Contábil Exato', phone: '1131313131', notes: null },
  academia: { n: 10, name: 'Academia Corpo em Forma', phone: '1155443322', notes: null },
};

export const clients: Record<ClientKey, Client> = Object.fromEntries(
  Object.entries(clientSeed).map(([key, c]) => [
    key,
    {
      id: uid('c1', c.n),
      company_id: company.id,
      name: c.name,
      phone: c.phone,
      notes: c.notes,
      created_at: daysAgo(300 - c.n * 15),
      deleted_at: key === 'academia' ? daysAgo(10) : null,
      deleted_by: key === 'academia' ? pid('juliana') : null,
      delete_reason: key === 'academia' ? 'Academia fechou.' : null,
    },
  ]),
) as Record<ClientKey, Client>;

type AddressKey =
  | 'padariaLoja'
  | 'padariaDeposito'
  | 'condominio'
  | 'maria'
  | 'autopecas'
  | 'clinica'
  | 'escola'
  | 'mercadoLoja'
  | 'mercadoDeposito'
  | 'contabil'
  | 'academia'
  | 'padariaAntigo';

let addressN = 0;
function address(
  client: ClientKey,
  fields: Pick<ClientAddress, 'label' | 'street' | 'number' | 'district' | 'city' | 'state'> &
    Partial<Pick<ClientAddress, 'complement' | 'zip_code' | 'reference' | 'is_primary'>>,
  deleted?: { reason: string },
): ClientAddress {
  addressN += 1;
  return {
    id: uid('c2', addressN),
    client_id: clients[client].id,
    company_id: company.id,
    complement: null,
    zip_code: null,
    reference: null,
    is_primary: false,
    created_at: daysAgo(290 - addressN * 10),
    deleted_at: deleted ? daysAgo(40) : null,
    deleted_by: deleted ? pid('juliana') : null,
    delete_reason: deleted?.reason ?? null,
    ...fields,
  };
}

export const addresses: Record<AddressKey, ClientAddress> = {
  padariaLoja: address('padaria', {
    label: 'Loja',
    street: 'Rua das Acácias',
    number: '120',
    district: 'Vila Mariana',
    city: 'São Paulo',
    state: 'SP',
    zip_code: '04101000',
    reference: 'em frente à praça',
    is_primary: true,
  }),
  padariaDeposito: address('padaria', {
    label: 'Depósito',
    street: 'Rua Coronel Lisboa',
    number: '45',
    complement: 'fundos',
    district: 'Vila Mariana',
    city: 'São Paulo',
    state: 'SP',
    zip_code: '04020040',
  }),
  padariaAntigo: address(
    'padaria',
    {
      label: 'Loja antiga',
      street: 'Rua Domingos de Morais',
      number: '900',
      district: 'Vila Mariana',
      city: 'São Paulo',
      state: 'SP',
    },
    { reason: 'Loja fechada.' },
  ),
  condominio: address('condominio', {
    label: 'Portaria',
    street: 'Avenida das Flores',
    number: '1500',
    district: 'Jardim Marajoara',
    city: 'São Paulo',
    state: 'SP',
    zip_code: '04664000',
    reference: 'portão de serviço na lateral',
    is_primary: true,
  }),
  maria: address('maria', {
    label: 'Casa',
    street: 'Rua Ipê Roxo',
    number: '78',
    district: 'Jardim das Palmeiras',
    city: 'Guarulhos',
    state: 'SP',
    zip_code: '07090120',
    is_primary: true,
  }),
  autopecas: address('autopecas', {
    label: 'Loja',
    street: 'Rodovia Raposo Tavares',
    number: 'km 22',
    district: 'Jardim Barbacena',
    city: 'Cotia',
    state: 'SP',
    is_primary: true,
  }),
  clinica: address('clinica', {
    label: null,
    street: 'Avenida Paulista',
    number: '1000',
    complement: 'sala 12',
    district: 'Bela Vista',
    city: 'São Paulo',
    state: 'SP',
    zip_code: '01310100',
    is_primary: true,
  }),
  escola: address('escola', {
    label: null,
    street: 'Rua dos Pinheiros',
    number: '310',
    district: 'Pinheiros',
    city: 'São Paulo',
    state: 'SP',
    zip_code: '05422000',
    is_primary: true,
  }),
  mercadoLoja: address('mercado', {
    label: 'Loja',
    street: 'Avenida Itaquera',
    number: '5200',
    district: 'Itaquera',
    city: 'São Paulo',
    state: 'SP',
    zip_code: '08295000',
    is_primary: true,
  }),
  mercadoDeposito: address('mercado', {
    label: 'Depósito',
    street: 'Rua B',
    number: '12',
    district: 'Itaquera',
    city: 'São Paulo',
    state: 'SP',
    reference: 'galpão azul',
  }),
  contabil: address('contabil', {
    label: null,
    street: 'Rua Augusta',
    number: '2200',
    complement: '5º andar',
    district: 'Jardins',
    city: 'São Paulo',
    state: 'SP',
    zip_code: '01412000',
    is_primary: true,
  }),
  academia: address('academia', {
    label: null,
    street: 'Avenida Santo Amaro',
    number: '3100',
    district: 'Brooklin',
    city: 'São Paulo',
    state: 'SP',
    is_primary: true,
  }),
};

/** Texto do endereço como o banco copia para a O.S. (03, R3). */
export function addressLine(a: ClientAddress): string {
  const clean = (v: string | null) => (v && v.trim() !== '' ? v.trim() : null);
  const zip = clean(a.zip_code);
  const parts = [
    [clean(a.street), clean(a.number), clean(a.complement)].filter(Boolean).join(', '),
    clean(a.district),
    `${a.city}/${a.state}`,
    zip ? `CEP ${zip.slice(0, 5)}-${zip.slice(5)}` : null,
  ].filter(Boolean);
  const reference = clean(a.reference);
  return parts.join(' - ') + (reference ? ` (${reference})` : '');
}

// ---------------------------------------------------------------- O.S., atribuições, execuções e fotos

interface PhotoSpec {
  scene: PhotoScene;
  caption: string;
  source?: PhotoSource;
  /** Horas atrás; `null` = galeria sem EXIF. Padrão: alguns minutos antes do envio. */
  capturedHoursAgo?: number | null;
  noGeo?: boolean;
}

interface ExecSpec {
  by: PersonKey;
  participants: PersonKey[];
  startedHoursAgo?: number | null;
  submittedHoursAgo: number;
  /** Padrão: igual ao envio (com sinal). */
  receivedHoursAgo?: number;
  description: string | null;
  review?: {
    status: Extract<ReviewStatus, 'approved' | 'rejected' | 'voided'>;
    by?: PersonKey;
    hoursAgo?: number;
    comment?: string;
  };
  converted?: boolean;
  acknowledged?: { by: PersonKey; hoursAgo: number };
  photos: PhotoSpec[];
  supplements?: Omit<ExecSpec, 'supplements' | 'review'>[];
}

interface OrderSpec {
  number: number;
  title: string;
  client: ClientKey;
  address: AddressKey | null;
  type: ServiceType;
  priority: OrderPriority;
  status: OrderStatus;
  dueInDays: number | null;
  createdDaysAgo: number;
  createdBy: PersonKey;
  instructions: string | null;
  materials: string | null;
  assignees: PersonKey[];
  removed?: { who: PersonKey; cause: 'unassigned' | 'member_removed' | 'role_changed'; daysAgo: number }[];
  attempts?: ExecSpec[];
  cancel?: { by: PersonKey; daysAgo: number; reason: string };
  materialsEditedBy?: PersonKey;
  edited?: { by: PersonKey; daysAgo: number; changes: Record<string, { from: unknown; to: unknown }> };
  addressChanged?: { by: PersonKey; daysAgo: number; from: AddressKey };
}

const orderSpecs: OrderSpec[] = [
  {
    number: 31,
    title: 'Instalação de 8 câmeras e NVR',
    client: 'padaria',
    address: 'padariaLoja',
    type: 'installation',
    priority: 'high',
    status: 'approved',
    dueInDays: -12,
    createdDaysAgo: 20,
    createdBy: 'juliana',
    instructions: 'Câmeras no salão, caixa, estoque e fachada. NVR no escritório dos fundos, com nobreak.',
    materials: '8 câmeras bullet 2MP\nNVR 8 canais + HD 2TB\n300 m de cabo UTP\nUsado: 280 m de cabo, 16 conectores',
    assignees: ['marcos', 'diego'],
    materialsEditedBy: 'marcos',
    attempts: [
      {
        by: 'marcos',
        participants: ['marcos', 'diego'],
        startedHoursAgo: 14 * 24 + 6,
        submittedHoursAgo: 14 * 24,
        description: 'Instaladas as 8 câmeras e o NVR. Acesso remoto configurado no celular do Sr. Antônio.',
        review: { status: 'approved', by: 'juliana', hoursAgo: 13 * 24, comment: 'Ficou ótimo, cliente elogiou.' },
        photos: [
          { scene: 'facade', caption: 'Fachada: câmeras 1 e 2' },
          { scene: 'recorder', caption: 'NVR no rack' },
          { scene: 'monitor', caption: 'Imagens no monitor' },
          { scene: 'bullet', caption: 'Câmera do caixa' },
        ],
        supplements: [
          {
            by: 'diego',
            participants: ['diego'],
            submittedHoursAgo: 12 * 24,
            description: 'Foto da etiqueta dos cabos, que esqueci de mandar.',
            acknowledged: { by: 'juliana', hoursAgo: 11 * 24 },
            photos: [{ scene: 'cabling', caption: 'Etiquetas dos cabos' }],
          },
        ],
      },
    ],
  },
  {
    number: 32,
    title: 'Manutenção preventiva trimestral',
    client: 'academia',
    address: 'academia',
    type: 'maintenance',
    priority: 'low',
    status: 'approved',
    dueInDays: -30,
    createdDaysAgo: 45,
    createdBy: 'ricardo',
    instructions: 'Limpar lentes, conferir gravação e ajustar ângulos.',
    materials: null,
    assignees: ['paulo', 'lucas'],
    attempts: [
      {
        by: 'paulo',
        participants: ['paulo', 'lucas'],
        startedHoursAgo: 33 * 24 + 3,
        submittedHoursAgo: 33 * 24,
        description: 'Todas as 6 câmeras limpas e gravando. Ajustado o ângulo da câmera da recepção.',
        review: { status: 'approved', by: 'ricardo', hoursAgo: 32 * 24 },
        photos: [
          { scene: 'dome', caption: 'Câmera da recepção' },
          { scene: 'monitor', caption: 'Gravação conferida' },
        ],
      },
    ],
  },
  {
    number: 33,
    title: 'Troca de fonte do rack',
    client: 'clinica',
    address: 'clinica',
    type: 'maintenance',
    priority: 'urgent',
    status: 'in_progress',
    dueInDays: 0,
    createdDaysAgo: 1,
    createdBy: 'juliana',
    instructions: 'Fonte queimou ontem à noite; 4 câmeras sem energia. Levar fonte 12V 10A.',
    materials: 'Fonte 12V 10A\nBorne e fita isolante',
    assignees: ['marcos', 'diego'],
    attempts: [],
  },
  {
    number: 34,
    title: 'Visita técnica para orçamento de 16 câmeras',
    client: 'condominio',
    address: 'condominio',
    type: 'technical_visit',
    priority: 'normal',
    status: 'open',
    dueInDays: 3,
    createdDaysAgo: 0.2,
    createdBy: 'juliana',
    instructions: 'Levantar pontos: portaria, garagem, playground e 4 halls. Medir distância até a sala do síndico.',
    materials: null,
    assignees: ['marcos', 'paulo'],
  },
  {
    number: 35,
    title: 'Câmera da garagem sem imagem',
    client: 'mercado',
    address: 'mercadoDeposito',
    type: 'maintenance',
    priority: 'high',
    status: 'in_progress',
    dueInDays: -2,
    createdDaysAgo: 8,
    createdBy: 'ricardo',
    instructions: 'Câmera 5 sem imagem desde segunda. Verificar conector e fonte.',
    materials: 'Conectores BNC\nBalun',
    assignees: ['marcos', 'lucas'],
    removed: [{ who: 'andre', cause: 'member_removed', daysAgo: 6 }],
    attempts: [],
  },
  {
    number: 36,
    title: 'Instalar câmera no portão',
    client: 'maria',
    address: 'maria',
    type: 'installation',
    priority: 'normal',
    status: 'open',
    dueInDays: null,
    createdDaysAgo: 2,
    createdBy: 'juliana',
    instructions: 'Uma câmera Wi-Fi apontada para o portão, com aplicativo no celular da cliente.',
    materials: null,
    assignees: [],
  },
  {
    number: 37,
    title: 'Reposicionar câmeras do estoque',
    client: 'autopecas',
    address: 'autopecas',
    type: 'maintenance',
    priority: 'normal',
    status: 'cancelled',
    dueInDays: -5,
    createdDaysAgo: 12,
    createdBy: 'juliana',
    instructions: null,
    materials: null,
    assignees: ['marcos', 'diego'],
    attempts: [
      {
        by: 'diego',
        participants: ['diego', 'marcos'],
        startedHoursAgo: 7 * 24 + 4,
        submittedHoursAgo: 7 * 24,
        description: 'Câmeras reposicionadas, falta o cliente validar o ângulo do corredor 3.',
        review: { status: 'voided' },
        photos: [{ scene: 'bullet', caption: 'Corredor 3' }],
      },
    ],
    cancel: { by: 'juliana', daysAgo: 6, reason: 'Cliente desistiu do serviço e vai trocar de fornecedor.' },
  },
  {
    number: 38,
    title: 'Instalação de câmeras na recepção',
    client: 'clinica',
    address: 'clinica',
    type: 'installation',
    priority: 'high',
    status: 'pending_approval',
    dueInDays: 2,
    createdDaysAgo: 4,
    createdBy: 'juliana',
    instructions: 'Duas câmeras dome na recepção e uma no corredor dos consultórios. Sem furar o forro de gesso novo.',
    materials: '3 câmeras dome 2MP\n60 m de cabo UTP',
    assignees: ['marcos', 'diego'],
    edited: {
      by: 'juliana',
      daysAgo: 3,
      changes: {
        priority: { from: 'normal', to: 'high' },
        title: { from: 'Câmeras na recepção', to: 'Instalação de câmeras na recepção' },
      },
    },
    attempts: [
      {
        by: 'marcos',
        participants: ['marcos', 'diego'],
        startedHoursAgo: 7,
        submittedHoursAgo: 4,
        description: 'Instaladas as 3 câmeras. Cabos passados pela canaleta, sem furar o forro.',
        photos: [
          { scene: 'dome', caption: 'Recepção, câmera 1' },
          { scene: 'dome', caption: 'Recepção, câmera 2' },
          { scene: 'cabling', caption: 'Canaleta do corredor' },
          { scene: 'monitor', caption: 'Imagens no monitor' },
        ],
        supplements: [
          {
            by: 'diego',
            participants: ['diego', 'marcos'],
            startedHoursAgo: 7,
            submittedHoursAgo: 3.9,
            receivedHoursAgo: 2,
            description: 'Mandei do meu celular também (estávamos sem sinal).',
            converted: true,
            photos: [{ scene: 'bullet', caption: 'Corredor dos consultórios' }],
          },
          {
            by: 'diego',
            participants: ['diego'],
            submittedHoursAgo: 1.5,
            description: 'Foto do projeto aprovado pela clínica.',
            photos: [
              { scene: 'power', caption: 'Quadro de energia', source: 'gallery', capturedHoursAgo: null, noGeo: true },
            ],
          },
        ],
      },
    ],
  },
  {
    number: 39,
    title: 'Ampliação do sistema: 4 câmeras no pátio',
    client: 'escola',
    address: 'escola',
    type: 'installation',
    priority: 'normal',
    status: 'pending_approval',
    dueInDays: 5,
    createdDaysAgo: 9,
    createdBy: 'ricardo',
    instructions: 'Quatro câmeras no pátio, cobrindo o parquinho e o portão. Trabalhar só depois das 17h.',
    materials: '4 câmeras bullet 4MP\nSwitch PoE 8 portas',
    assignees: ['paulo', 'lucas'],
    attempts: [
      {
        by: 'paulo',
        participants: ['paulo', 'lucas'],
        startedHoursAgo: 3 * 24 + 4,
        submittedHoursAgo: 3 * 24,
        description: 'Instaladas as 4 câmeras do pátio.',
        review: {
          status: 'rejected',
          by: 'juliana',
          hoursAgo: 2 * 24,
          comment: 'Falta a foto da câmera do portão e do switch ligado. Mandem de novo, por favor.',
        },
        photos: [
          { scene: 'bullet', caption: 'Pátio, câmera 1' },
          { scene: 'bullet', caption: 'Pátio, câmera 2' },
        ],
      },
      {
        by: 'lucas',
        participants: ['lucas', 'paulo'],
        startedHoursAgo: 2 * 24 + 8,
        submittedHoursAgo: 2 * 24 + 2,
        receivedHoursAgo: 20,
        description: 'Câmera do portão e switch.',
        photos: [
          { scene: 'facade', caption: 'Portão' },
          { scene: 'recorder', caption: 'Switch PoE', source: 'gallery', capturedHoursAgo: 5 * 24 },
        ],
      },
    ],
  },
  {
    number: 40,
    title: 'Configurar acesso remoto no celular do cliente',
    client: 'joao',
    address: null,
    type: 'technical_visit',
    priority: 'low',
    status: 'pending_approval',
    dueInDays: -1,
    createdDaysAgo: 3,
    createdBy: 'juliana',
    instructions: 'Cliente do cadastro rápido, sem endereço. Ligar antes para combinar.',
    materials: null,
    assignees: ['diego'],
    attempts: [
      {
        by: 'diego',
        participants: ['diego'],
        startedHoursAgo: 6,
        submittedHoursAgo: 5,
        description: 'Aplicativo instalado e testado com o cliente.',
        photos: [{ scene: 'monitor', caption: 'App no celular', noGeo: true }],
      },
    ],
  },
  {
    number: 41,
    title: 'Instalação de DVR e 4 câmeras',
    client: 'contabil',
    address: 'contabil',
    type: 'installation',
    priority: 'normal',
    status: 'rejected',
    dueInDays: 4,
    createdDaysAgo: 6,
    createdBy: 'juliana',
    instructions: 'DVR na sala do servidor. Câmeras na entrada, recepção e corredor.',
    materials: 'DVR 4 canais\n4 câmeras dome',
    assignees: ['marcos', 'diego'],
    attempts: [
      {
        by: 'marcos',
        participants: ['marcos', 'diego'],
        startedHoursAgo: 2 * 24 + 5,
        submittedHoursAgo: 2 * 24,
        description: 'DVR e câmeras instalados.',
        review: {
          status: 'rejected',
          by: 'juliana',
          hoursAgo: 26,
          comment: 'Faltou a foto do DVR ligado mostrando as 4 câmeras e a etiqueta dos cabos.',
        },
        photos: [
          { scene: 'dome', caption: 'Entrada' },
          { scene: 'dome', caption: 'Recepção' },
        ],
      },
    ],
  },
  {
    number: 42,
    title: 'Manutenção do cabeamento da fachada',
    client: 'padaria',
    address: 'padariaDeposito',
    type: 'maintenance',
    priority: 'urgent',
    status: 'rejected',
    dueInDays: -3,
    createdDaysAgo: 10,
    createdBy: 'ricardo',
    instructions: 'Cabo da câmera da fachada foi rompido na obra do vizinho.',
    materials: null,
    assignees: ['paulo', 'lucas'],
    addressChanged: { by: 'ricardo', daysAgo: 9, from: 'padariaLoja' },
    attempts: [
      {
        by: 'lucas',
        participants: ['lucas'],
        startedHoursAgo: 5 * 24 + 2,
        submittedHoursAgo: 5 * 24,
        description: 'Cabo trocado.',
        review: {
          status: 'rejected',
          by: 'ricardo',
          hoursAgo: 4 * 24,
          comment: 'A câmera continua sem imagem no monitor.',
        },
        photos: [{ scene: 'cabling', caption: 'Cabo novo' }],
      },
    ],
  },
  {
    number: 43,
    title: 'Instalação de alarme e 2 câmeras',
    client: 'mercado',
    address: 'mercadoLoja',
    type: 'installation',
    priority: 'high',
    status: 'approved',
    dueInDays: -8,
    createdDaysAgo: 15,
    createdBy: 'juliana',
    instructions: null,
    materials: 'Central de alarme\n2 câmeras bullet',
    assignees: ['marcos', 'lucas'],
    attempts: [
      {
        by: 'marcos',
        participants: ['marcos', 'lucas'],
        startedHoursAgo: 4 * 24 + 6,
        submittedHoursAgo: 4 * 24,
        description: 'Alarme e câmeras instalados e testados com o gerente.',
        review: { status: 'approved', by: 'juliana', hoursAgo: 2 * 24 },
        photos: [
          { scene: 'power', caption: 'Central de alarme' },
          { scene: 'bullet', caption: 'Câmera do estacionamento' },
          { scene: 'bullet', caption: 'Câmera da doca' },
        ],
        supplements: [
          {
            by: 'lucas',
            participants: ['lucas'],
            submittedHoursAgo: 6,
            receivedHoursAgo: 5,
            description: 'Voltamos para ajustar o sensor da doca, que disparava sozinho.',
            photos: [{ scene: 'power', caption: 'Sensor ajustado' }],
          },
        ],
      },
    ],
  },
  {
    number: 44,
    title: 'Revisão das câmeras após queda de energia',
    client: 'condominio',
    address: 'condominio',
    type: 'maintenance',
    priority: 'urgent',
    status: 'open',
    dueInDays: -1,
    createdDaysAgo: 3,
    createdBy: 'ricardo',
    instructions: 'Depois da queda de energia, 3 câmeras não voltaram. Conferir nobreak.',
    materials: null,
    assignees: ['diego'],
    removed: [{ who: 'paulo', cause: 'unassigned', daysAgo: 2 }],
  },
  {
    number: 45,
    title: 'Orçamento para monitoramento 24h',
    client: 'contabil',
    address: 'contabil',
    type: 'technical_visit',
    priority: 'low',
    status: 'open',
    dueInDays: 10,
    createdDaysAgo: 0.05,
    createdBy: 'ricardo',
    instructions: null,
    materials: null,
    assignees: [],
  },
];

export const orders: ServiceOrder[] = [];
export const assignments: Assignment[] = [];
export const executions: Execution[] = [];
export const photos: Photo[] = [];
export const photoUrls = new Map<string, string>();
export const history: HistoryEvent[] = [];

let assignmentN = 0;
let executionN = 0;
let photoN = 0;
let historyN = 0;

function event(
  order: ServiceOrder,
  type: string,
  at: string,
  actor: string | null,
  metadata: Record<string, unknown> = {},
) {
  historyN += 1;
  history.push({
    id: uid('b0', historyN),
    company_id: company.id,
    service_order_id: order.id,
    event_type: type,
    actor_id: actor,
    metadata: metadata as HistoryEvent['metadata'],
    created_at: at,
  });
}

function buildExecution(
  order: ServiceOrder,
  spec: ExecSpec | Omit<ExecSpec, 'supplements' | 'review'>,
  parent: Execution | null,
): Execution {
  executionN += 1;
  const id = uid('e0', executionN);
  const received = hoursAgo(spec.receivedHoursAgo ?? spec.submittedHoursAgo);
  const review = 'review' in spec ? spec.review : undefined;
  const reviewedAt = review?.hoursAgo !== undefined ? hoursAgo(review.hoursAgo) : null;
  const isLate =
    parent !== null && parent.reviewed_at !== null && Date.parse(received) > Date.parse(parent.reviewed_at);
  const execution: Execution = {
    id,
    company_id: company.id,
    service_order_id: order.id,
    supplements_execution_id: parent?.id ?? null,
    submitted_by: pid(spec.by),
    participants: spec.participants.map(pid),
    description: spec.description,
    client_started_at: spec.startedHoursAgo != null ? hoursAgo(spec.startedHoursAgo) : null,
    client_submitted_at: hoursAgo(spec.submittedHoursAgo),
    received_at: received,
    created_at: received,
    converted_to_supplement: spec.converted ?? false,
    review_status: parent ? null : (review?.status ?? 'pending'),
    reviewed_by: review?.by ? pid(review.by) : null,
    reviewed_at: reviewedAt,
    review_comment: review?.comment ?? null,
    is_late: isLate,
    acknowledged_at: spec.acknowledged ? hoursAgo(spec.acknowledged.hoursAgo) : null,
    acknowledged_by: spec.acknowledged ? pid(spec.acknowledged.by) : null,
  };
  executions.push(execution);

  spec.photos.forEach((p, index) => {
    photoN += 1;
    const photoId = uid('f0', photoN);
    const source = p.source ?? 'camera';
    const captured =
      p.capturedHoursAgo === null
        ? null
        : hoursAgo(p.capturedHoursAgo ?? spec.submittedHoursAgo + 0.1 * (spec.photos.length - index));
    const geo = !p.noGeo && source === 'camera';
    photos.push({
      id: photoId,
      company_id: company.id,
      execution_id: id,
      service_order_id: order.id,
      storage_path: `${company.id}/${order.id}/${id}/${photoId}.jpg`,
      source,
      captured_at: captured,
      uploaded_at: received,
      created_at: received,
      latitude: geo ? -23.55 - (photoN % 7) * 0.013 : null,
      longitude: geo ? -46.63 - (photoN % 5) * 0.017 : null,
      accuracy_m: geo ? 6 + (photoN % 4) * 5 : null,
      width: 1600,
      height: 1200,
      file_size: 280_000 + ((photoN * 37_000) % 160_000),
      mime_type: 'image/jpeg',
    });
    photoUrls.set(photoId, samplePhotoUrl(p.scene, photoId, p.caption));
  });

  if (parent) {
    event(order, 'supplement_added', received, pid(spec.by), {
      execution_id: id,
      supplements_execution_id: parent.id,
      converted_to_supplement: execution.converted_to_supplement,
    });
  } else {
    event(order, 'submitted', received, pid(spec.by), { execution_id: id });
  }
  if (spec.acknowledged) {
    event(order, 'supplements_acknowledged', hoursAgo(spec.acknowledged.hoursAgo), pid(spec.acknowledged.by), {
      count: 1,
    });
  }
  return execution;
}

for (const spec of orderSpecs) {
  const created = daysAgo(spec.createdDaysAgo);
  const addressRow = spec.address ? addresses[spec.address] : null;
  const order: ServiceOrder = {
    id: uid('d0', spec.number),
    company_id: company.id,
    order_number: spec.number,
    client_id: clients[spec.client].id,
    client_address_id: addressRow?.id ?? null,
    address: addressRow ? addressLine(addressRow) : null,
    title: spec.title,
    service_type: spec.type,
    priority: spec.priority,
    status: spec.status,
    instructions: spec.instructions,
    materials_notes: spec.materials,
    due_at: spec.dueInDays === null ? null : dueIn(spec.dueInDays),
    created_by: pid(spec.createdBy),
    created_at: created,
    updated_at: created,
    cancelled_at: spec.cancel ? daysAgo(spec.cancel.daysAgo) : null,
    cancelled_by: spec.cancel ? pid(spec.cancel.by) : null,
    cancel_reason: spec.cancel?.reason ?? null,
  };
  orders.push(order);
  event(order, 'created', created, order.created_by);

  const assignedAt = daysAgo(spec.createdDaysAgo - 0.01);
  for (const who of [...spec.assignees, ...(spec.removed ?? []).map((r) => r.who)]) {
    const removal = spec.removed?.find((r) => r.who === who);
    assignmentN += 1;
    const unassignedBy = removal ? pid(removal.cause === 'unassigned' ? spec.createdBy : 'ricardo') : null;
    assignments.push({
      id: uid('d1', assignmentN),
      company_id: company.id,
      service_order_id: order.id,
      user_id: pid(who),
      assigned_by: order.created_by,
      assigned_at: assignedAt,
      created_at: assignedAt,
      unassigned_at: removal ? daysAgo(removal.daysAgo) : null,
      unassigned_by: unassignedBy,
    });
    event(order, 'assignee_added', assignedAt, order.created_by, { user_id: pid(who) });
    if (removal) {
      event(order, 'assignee_removed', daysAgo(removal.daysAgo), unassignedBy, {
        user_id: pid(who),
        cause: removal.cause,
      });
    }
  }

  if (spec.edited) {
    event(order, 'updated', daysAgo(spec.edited.daysAgo), pid(spec.edited.by), { changes: spec.edited.changes });
  }
  if (spec.addressChanged) {
    const from = addresses[spec.addressChanged.from];
    event(order, 'address_changed', daysAgo(spec.addressChanged.daysAgo), pid(spec.addressChanged.by), {
      from: { client_address_id: from.id, address: addressLine(from) },
      to: { client_address_id: order.client_address_id, address: order.address },
    });
  }

  const startedAt = spec.attempts?.[0]?.startedHoursAgo;
  if (startedAt != null) {
    event(order, 'started', hoursAgo(startedAt - 0.05), pid(spec.attempts?.[0]?.by ?? 'marcos'), {
      client_started_at: hoursAgo(startedAt),
    });
  } else if (spec.status === 'in_progress') {
    const by = spec.assignees[0] ?? 'marcos';
    event(order, 'started', hoursAgo(3), pid(by), { client_started_at: hoursAgo(3.1) });
  }

  for (const attempt of spec.attempts ?? []) {
    const parent = buildExecution(order, attempt, null);
    if (attempt.review && attempt.review.status !== 'voided' && parent.reviewed_at) {
      event(order, attempt.review.status, parent.reviewed_at, parent.reviewed_by, {
        execution_id: parent.id,
        ...(attempt.review.comment ? { comment: attempt.review.comment } : {}),
      });
    }
    for (const supplement of attempt.supplements ?? []) buildExecution(order, supplement, parent);
  }

  if (spec.materialsEditedBy && spec.materials) {
    const lines = spec.materials.split('\n');
    event(order, 'materials_updated', daysAgo(spec.createdDaysAgo - 1), pid(spec.materialsEditedBy), {
      from: lines.slice(0, -1).join('\n'),
      to: spec.materials,
    });
  }
  if (spec.cancel) {
    event(order, 'cancelled', daysAgo(spec.cancel.daysAgo), pid(spec.cancel.by), { reason: spec.cancel.reason });
  }

  const times = history.filter((h) => h.service_order_id === order.id).map((h) => h.created_at);
  order.updated_at = times.sort().at(-1) ?? created;
}

history.sort((a, b) => a.created_at.localeCompare(b.created_at));

// ---------------------------------------------------------------- auditoria

const memberId = (key: PersonKey) => members.find((m) => m.user_id === pid(key))?.id ?? '';

export const auditLogs: AuditLog[] = [
  {
    id: uid('b1', 1),
    company_id: company.id,
    actor_id: pid('ricardo'),
    action: 'member_invited',
    entity_type: 'company_member',
    entity_id: memberId('lucas'),
    metadata: { user_id: pid('lucas'), role: 'technician', reactivated: false },
    ip_address: '189.40.12.7',
    created_at: daysAgo(20),
  },
  {
    id: uid('b1', 2),
    company_id: company.id,
    actor_id: pid('ricardo'),
    action: 'member_role_changed',
    entity_type: 'company_member',
    entity_id: memberId('juliana'),
    metadata: { from: 'technician', to: 'manager', closed_assignments: 0 },
    ip_address: '189.40.12.7',
    created_at: daysAgo(90),
  },
  {
    id: uid('b1', 3),
    company_id: company.id,
    actor_id: pid('ricardo'),
    action: 'member_removed',
    entity_type: 'company_member',
    entity_id: memberId('andre'),
    metadata: { reason: 'Saiu da empresa.', closed_assignments: 1 },
    ip_address: '189.40.12.7',
    created_at: daysAgo(6),
  },
  {
    id: uid('b1', 4),
    company_id: company.id,
    actor_id: pid('ricardo'),
    action: 'company_updated',
    entity_type: 'company',
    entity_id: company.id,
    metadata: { changes: { phone: { from: '1133220000', to: '1133224455' } } },
    ip_address: null,
    created_at: daysAgo(15),
  },
].sort((a, b) => b.created_at.localeCompare(a.created_at));

// ---------------------------------------------------------------- aparelho do técnico (Marcos)

/** `gone`: o técnico foi tirado da O.S., que saiu do aparelho (a recusa fica com o retrato guardado ao agir). */
const orderRef = (n: number, { gone = false } = {}) => {
  const o = orders.find((x) => x.order_number === n);
  return {
    order_id: o?.id ?? '',
    order_number: n,
    order_title: o?.title ?? '',
    client_name: Object.values(clients).find((c) => c.id === o?.client_id)?.name ?? null,
    on_device: !gone,
    cancel_reason: null,
  };
};

export const pendingItems: PendingItem[] = [
  {
    id: 'q1',
    kind: 'submit',
    state: 'sending',
    ...orderRef(33),
    created_at: hoursAgo(0.3),
    next_attempt_at: null,
    refusal: null,
    error: null,
    photos: { done: 2, total: 5 },
    with_start: false,
    folded: [],
  },
  {
    id: 'q2',
    kind: 'materials',
    state: 'queued',
    ...orderRef(33),
    created_at: hoursAgo(0.25),
    next_attempt_at: null,
    refusal: null,
    error: null,
    photos: null,
    with_start: false,
    folded: [],
  },
  {
    id: 'q3',
    kind: 'start',
    state: 'waiting',
    ...orderRef(35),
    created_at: hoursAgo(1.2),
    next_attempt_at: iso(NOW + 45_000),
    refusal: null,
    error: null,
    photos: null,
    with_start: false,
    folded: [],
  },
  {
    id: 'q4',
    kind: 'submit',
    state: 'refused',
    ...orderRef(40, { gone: true }),
    created_at: hoursAgo(26),
    next_attempt_at: null,
    refusal: 'not_assigned',
    error: null,
    photos: { done: 0, total: 3 },
    with_start: false,
    folded: [],
  },
  {
    id: 'q5',
    kind: 'materials',
    state: 'refused',
    ...orderRef(41),
    created_at: hoursAgo(5),
    next_attempt_at: null,
    refusal: 'conflict',
    error: null,
    photos: null,
    with_start: false,
    folded: [],
  },
  {
    id: 'q7',
    kind: 'materials',
    state: 'refused',
    ...orderRef(37),
    cancel_reason: orders.find((o) => o.order_number === 37)?.cancel_reason ?? null,
    created_at: hoursAgo(30),
    next_attempt_at: null,
    refusal: 'order_closed',
    error: null,
    photos: null,
    with_start: false,
    folded: [],
  },
  {
    id: 'q6',
    kind: 'supplement',
    state: 'blocked',
    ...orderRef(43),
    created_at: hoursAgo(3),
    next_attempt_at: null,
    refusal: null,
    error: 'PGRST202',
    photos: { done: 1, total: 1 },
    with_start: false,
    folded: [],
  },
];

export const syncState: SyncState = {
  last_sync_at: hoursAgo(0.2),
  pending: pendingItems.filter((i) => ['sending', 'waiting', 'queued'].includes(i.state)).length,
  blocked: pendingItems.filter((i) => i.state === 'blocked').length,
  online: true,
  syncing: true,
  needs_login: false,
};

/** O.S. já abertas neste aparelho (o resto ganha o selo "Nova"; 04, badge no IndexedDB). */
export const seenOnDevice = new Set(orders.filter((o) => ![34, 41].includes(o.order_number)).map((o) => o.id));
