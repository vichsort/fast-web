// Membros (owner, 06): convidar (o link do convite, sem email), trocar papel, gerar o link de "definir senha", remover
// com motivo (no convite pendente, cancelar); last_owner quando a empresa ficaria sem dono. Até o aceite, a lista mostra
// o nome e o email digitados no convite (06, R9). O convite é React Hook Form + Zod: nome obrigatório e email no formato.
import { zodResolver } from '@hookform/resolvers/zod';
import { Ellipsis, KeyRound, Link2, MailPlus, ShieldAlert, UserRoundCog, UserRoundX } from 'lucide-react';
import * as React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { RoleBadge, ToneBadge } from '@/components/badges';
import { DataTable, type DataTableColumn } from '@/components/data-table';
import { ConfirmDialog, FormDialog, ReasonDialog } from '@/components/dialogs';
import { FilterBar } from '@/components/filter-bar';
import { Notice } from '@/components/notice';
import { PageHeader } from '@/components/page-header';
import { ErrorState } from '@/components/states';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { UserChip } from '@/components/user';
import { MEMBER_ROLES, type MemberRole } from '@/lib/enums';
import { formatDate, formatRelative } from '@/lib/format';
import { emailText, requiredText } from '@/lib/forms';
import { errorMessage, t } from '@/lib/i18n';
import { SHORT_TEXT_MAX } from '@/lib/input';
import type { MemberView } from '@/lib/views';
import { createPasswordLink, inviteMember, removeMember, updateMemberRole } from '../api';
import { memberIdentity, memberState } from '../derive';
import { useMembers } from '../queries';
import { useOffice, useOfficeAction } from '../session';
import { ChoiceCards, OwnerOnly, useStayOpen } from '../shared';
import { type MemberLink, MemberLinkDialog } from './member-link-dialog';

export function MembersPage() {
  return (
    <OwnerOnly>
      <MembersView />
    </OwnerOnly>
  );
}

const roleOptions = MEMBER_ROLES.map((role) => ({
  value: role,
  label: <RoleBadge role={role} size="sm" />,
  description: t(`office.members.roles.${role}`),
}));

function MembersView() {
  const { timeZone, user, actor } = useOffice();
  const run = useOfficeAction();
  const [showRemoved, setShowRemoved] = React.useState(false);
  const members = useMembers({ includeRemoved: showRemoved });
  const [inviting, setInviting] = React.useState(false);
  const [changing, setChanging] = React.useState<MemberView | null>(null);
  const [removing, setRemoving] = React.useState<MemberView | null>(null);
  const [recovering, setRecovering] = React.useState<MemberView | null>(null);
  const [link, setLink] = React.useState<MemberLink | null>(null);
  const [lastOwner, setLastOwner] = React.useState(false);
  const removingInvite = removing !== null && memberState(removing) !== 'active';
  const removingName = removing ? memberIdentity(removing).name : '';

  /** Refaz o convite pendente ou recusado com o que foi digitado nele: link novo, o anterior deixa de valer. */
  async function inviteAgain(member: MemberView) {
    if (!member.invite) return;
    const { full_name, email } = member.invite;
    const result = await run(t('office.members.newLink'), () =>
      inviteMember({ email, full_name, role: member.role }, actor),
    );
    if (result.ok && result.value.link) setLink({ kind: 'invite', name: full_name, url: result.value.link });
  }

  async function passwordLink(member: MemberView) {
    const result = await run(t('office.members.passwordLink'), () => createPasswordLink(member.id, actor));
    if (result.ok) setLink({ kind: 'recovery', name: memberIdentity(member).name, url: result.value.link });
  }

  async function remove(member: MemberView, reason: string) {
    const result = await run(t('office.members.removeConfirm'), () => removeMember(member.id, reason, actor), {
      inline: ['last_owner'],
    });
    if (!result.ok && result.code === 'last_owner') setLastOwner(true);
    if (result.ok && result.value.closed_assignments > 0) {
      toast.message(t('office.members.closedAssignments', { count: result.value.closed_assignments }));
    }
  }

  const columns: DataTableColumn<MemberView>[] = [
    {
      id: 'member',
      header: t('office.members.columns.member'),
      label: t('office.members.columns.member'),
      sortValue: (m) => memberIdentity(m).name,
      cell: (m) => {
        const { name, email } = memberIdentity(m);
        return (
          <div className="flex flex-col gap-0.5">
            <UserChip name={name} seed={m.user_id} isSelf={m.user_id === user.id} size="sm" />
            {email && <span className="pl-8 text-xs text-muted-foreground">{email}</span>}
          </div>
        );
      },
    },
    {
      id: 'role',
      header: t('office.members.columns.role'),
      label: t('office.members.columns.role'),
      sortValue: (m) => MEMBER_ROLES.indexOf(m.role),
      cell: (m) => <RoleBadge role={m.role} size="sm" />,
    },
    {
      id: 'since',
      header: t('office.members.columns.since'),
      label: t('office.members.columns.since'),
      hideBelow: 'md',
      sortValue: (m) => m.created_at,
      cell: (m) => <span className="tabular-nums text-muted-foreground">{formatDate(m.created_at, timeZone)}</span>,
    },
    {
      id: 'status',
      header: t('office.members.columns.status'),
      hideBelow: 'sm',
      cell: (m) => {
        switch (memberState(m)) {
          case 'removed':
            return (
              <div className="flex flex-col gap-0.5">
                <ToneBadge tone="muted" size="sm" label={t('office.members.removed')} />
                <span className="text-xs text-muted-foreground">
                  {t('office.members.removedOn', { time: formatRelative(m.deleted_at as string, timeZone) })}
                  {m.delete_reason && ` · ${m.delete_reason}`}
                </span>
              </div>
            );
          case 'pending':
            return (
              <div className="flex flex-col gap-0.5">
                <ToneBadge tone="warning" variant="dot" size="sm" label={t('office.members.pending')} />
                <span className="text-xs text-muted-foreground">
                  {t('office.members.invitedOn', {
                    time: formatRelative(m.invite?.invited_at ?? m.created_at, timeZone),
                  })}
                </span>
              </div>
            );
          case 'declined':
            return <ToneBadge tone="danger" variant="dot" size="sm" label={t('office.members.declined')} />;
          case 'active':
            return <ToneBadge tone="success" variant="dot" size="sm" label={t('office.members.active')} />;
        }
      },
    },
    {
      id: 'actions',
      header: <span className="sr-only">{t('office.common.more')}</span>,
      align: 'end',
      className: 'w-12',
      cell: (m) => {
        const state = memberState(m);
        if (state === 'removed') return null;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`${t('office.common.more')}: ${memberIdentity(m).name}`}
                />
              }
            >
              <Ellipsis />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {state !== 'active' && (
                <DropdownMenuItem disabled={!m.invite} onClick={() => void inviteAgain(m)}>
                  <Link2 />
                  {t(state === 'pending' ? 'office.members.newLink' : 'office.members.inviteAgain')}
                </DropdownMenuItem>
              )}
              {state !== 'declined' && (
                <DropdownMenuItem onClick={() => setChanging(m)}>
                  <UserRoundCog />
                  {t('office.members.changeRole')}
                </DropdownMenuItem>
              )}
              {state === 'active' && (
                <DropdownMenuItem onClick={() => setRecovering(m)}>
                  <KeyRound />
                  {t('office.members.passwordLink')}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setRemoving(m)}>
                <UserRoundX />
                {t(state === 'pending' ? 'office.members.cancelInvite' : 'office.members.remove')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        size="lg"
        title={t('office.members.title')}
        description={t('office.members.description')}
        actions={
          <Button onClick={() => setInviting(true)}>
            <MailPlus />
            {t('office.members.invite')}
          </Button>
        }
      />
      {lastOwner && (
        <Notice
          tone="danger"
          icon={ShieldAlert}
          title={errorMessage('last_owner')}
          action={
            <Button size="sm" variant="ghost" onClick={() => setLastOwner(false)}>
              {t('ui.actions.dismiss')}
            </Button>
          }
        >
          {t('office.members.lastOwnerHint')}
        </Notice>
      )}
      <FilterBar
        actions={
          // biome-ignore lint/a11y/noLabelWithoutControl: o Switch do Base UI é o controle dentro do label
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Switch checked={showRemoved} onCheckedChange={setShowRemoved} />
            {t('office.common.showRemoved')}
          </label>
        }
      />
      {members.isError ? (
        <ErrorState onRetry={() => void members.refetch()} />
      ) : (
        <DataTable<MemberView>
          rows={members.data ?? []}
          columns={columns}
          getRowId={(m) => m.id}
          loading={members.isPending}
          pageSize={0}
          defaultSort={{ id: 'role', desc: false }}
          caption={t('office.members.title')}
          rowClassName={(m) => (['removed', 'declined'].includes(memberState(m)) ? 'opacity-60' : undefined)}
        />
      )}

      <InviteDialog open={inviting} onOpenChange={setInviting} onLink={setLink} />
      <ChangeRoleDialog member={changing} onClose={() => setChanging(null)} onLastOwner={() => setLastOwner(true)} />
      <ReasonDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={t(removingInvite ? 'office.members.cancelInviteTitle' : 'office.members.removeTitle', {
          name: removingName,
        })}
        description={t(removingInvite ? 'office.members.cancelInviteDescription' : 'office.members.removeDescription')}
        confirmLabel={t(removingInvite ? 'office.members.cancelInvite' : 'office.members.removeConfirm')}
        onConfirm={(reason) => removing && remove(removing, reason)}
      />
      <ConfirmDialog
        open={recovering !== null}
        onOpenChange={(open) => !open && setRecovering(null)}
        title={t('office.members.passwordLinkTitle', { name: recovering ? memberIdentity(recovering).name : '' })}
        description={t('office.members.passwordLinkDescription', {
          name: recovering ? memberIdentity(recovering).name : '',
        })}
        confirmLabel={t('office.members.passwordLinkConfirm')}
        onConfirm={() => recovering && passwordLink(recovering)}
      />
      <MemberLinkDialog link={link} onClose={() => setLink(null)} />
    </div>
  );
}

const inviteSchema = z.object({
  name: requiredText(t('office.common.fieldRequired')),
  email: emailText(t('auth.invalidEmail')),
  role: z.enum(MEMBER_ROLES),
});
type InviteValues = z.infer<typeof inviteSchema>;
const emptyInvite: InviteValues = { name: '', email: '', role: 'technician' };

function InviteDialog({
  open,
  onOpenChange,
  onLink,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLink: (link: MemberLink) => void;
}) {
  const { actor } = useOffice();
  const run = useOfficeAction();
  const [handleOpenChange, stayOpen] = useStayOpen(onOpenChange);
  const form = useForm<InviteValues>({ resolver: zodResolver(inviteSchema), defaultValues: emptyInvite });
  const { register } = form;
  const { errors } = form.formState;
  const { reset } = form;
  React.useEffect(() => {
    if (open) reset(emptyInvite);
  }, [open, reset]);

  const submit = form.handleSubmit(async ({ name, email, role }) => {
    const result = await run(t('office.members.invited'), () => inviteMember({ email, full_name: name, role }, actor));
    if (!result.ok) return stayOpen();
    const { member, link } = result.value;
    if (link) onLink({ kind: 'invite', name, url: link });
    else toast.message(t('office.members.alreadyMember', { name: memberIdentity(member).name }));
  }, stayOpen);

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={t('office.members.invite')}
      description={t('office.members.inviteDescription')}
      submitLabel={t('office.members.inviteAction')}
      onSubmit={() => submit()}
    >
      <FieldGroup className="gap-4">
        <Field data-invalid={Boolean(errors.name) || undefined}>
          <FieldLabel htmlFor="invite-name">{t('office.members.name')}</FieldLabel>
          <Input id="invite-name" maxLength={SHORT_TEXT_MAX} autoFocus {...register('name')} />
          {errors.name && <FieldError>{errors.name.message}</FieldError>}
        </Field>
        <Field data-invalid={Boolean(errors.email) || undefined}>
          <FieldLabel htmlFor="invite-email">{t('office.members.email')}</FieldLabel>
          <Input id="invite-email" type="email" {...register('email')} />
          {errors.email && <FieldError>{errors.email.message}</FieldError>}
        </Field>
        <Field>
          <FieldLabel>{t('office.members.role')}</FieldLabel>
          <Controller
            control={form.control}
            name="role"
            render={({ field }) => (
              <ChoiceCards
                aria-label={t('office.members.role')}
                value={field.value}
                onValueChange={field.onChange}
                options={roleOptions}
              />
            )}
          />
        </Field>
      </FieldGroup>
    </FormDialog>
  );
}

function ChangeRoleDialog({
  member,
  onClose,
  onLastOwner,
}: {
  member: MemberView | null;
  onClose: () => void;
  onLastOwner: () => void;
}) {
  const { actor } = useOffice();
  const run = useOfficeAction();
  const [role, setRole] = React.useState<MemberRole>('technician');
  React.useEffect(() => {
    if (member) setRole(member.role);
  }, [member]);
  const leavingTechnician = member?.role === 'technician' && role !== 'technician';

  async function submit() {
    if (!member) return;
    const result = await run(t('office.members.changeRole'), () => updateMemberRole(member.id, role, actor), {
      inline: ['last_owner'],
    });
    if (!result.ok && result.code === 'last_owner') onLastOwner();
    if (result.ok && result.value.closed_assignments > 0) {
      toast.message(t('office.members.closedAssignments', { count: result.value.closed_assignments }));
    }
  }

  return (
    <FormDialog
      open={member !== null}
      onOpenChange={(open) => !open && onClose()}
      title={t('office.members.changeRoleTitle', { name: member ? memberIdentity(member).name : '' })}
      submitLabel={t('office.common.saveChanges')}
      submitDisabled={member?.role === role}
      onSubmit={submit}
    >
      <div className="flex flex-col gap-3">
        <ChoiceCards aria-label={t('office.members.role')} value={role} onValueChange={setRole} options={roleOptions} />
        {leavingTechnician && (
          <Notice tone="warning" icon={ShieldAlert} title={t('office.members.changeRoleWarning')} />
        )}
      </div>
    </FormDialog>
  );
}
