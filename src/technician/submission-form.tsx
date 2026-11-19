// Campos de um envio (tentativa ou complemento, 04): fotos pela câmera ou galeria, descrição e participantes (R6).
// Cada alteração vai direto para o rascunho do aparelho (offline.md: "gravado a cada alteração").
import { Camera, PenLine, Users } from 'lucide-react';
import * as React from 'react';
import { ToneBadge } from '@/components/badges';
import { AddPhoto, PhotoGrid } from '@/components/photos';
import { Section } from '@/components/section';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { UserAvatar } from '@/components/user';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { PhotoInput } from '@/photos/process';
import { act } from './act';
import {
  addPhoto,
  CameraSheet,
  type Draft,
  type DraftFields,
  type ParticipantOption,
  pickFromGallery,
  removePhoto,
  saveDraft,
  useTimeZone,
  withAlerts,
} from './api';

export function SubmissionForm({
  draftKey,
  draft,
  participantOptions,
  descriptionLabel,
  descriptionPlaceholder,
  photosHint,
}: {
  /** Chave do rascunho (draftKey): cada alteração vai para ele. */
  draftKey: string;
  draft: Draft;
  participantOptions: ParticipantOption[];
  descriptionLabel: string;
  descriptionPlaceholder: string;
  photosHint: string;
}) {
  const TZ = useTimeZone();
  const [camera, setCamera] = React.useState(false);
  const descriptionId = React.useId();
  // Texto e participantes ficam na tela (o rascunho salvo chega depois, pela leitura do aparelho); as gravações vão
  // em fila, na ordem dos toques, para fotos seguidas não criarem dois rascunhos.
  const [fields, setFields] = React.useState<DraftFields>({
    description: draft.description,
    participants: draft.participants,
  });
  const latest = React.useRef(fields);
  const chain = React.useRef<Promise<unknown>>(Promise.resolve());
  const write = (work: () => Promise<unknown>) => {
    chain.current = chain.current.then(() => act(work()));
  };
  const change = (patch: Partial<DraftFields>) => {
    latest.current = { ...latest.current, ...patch };
    setFields(latest.current);
    const next = latest.current;
    write(() => saveDraft(draftKey, next));
  };
  const add = (photo: PhotoInput) => write(() => addPhoto(draftKey, latest.current, photo));
  const photos = withAlerts(draft.photos, draft.startedAt);

  return (
    <>
      <Section
        title={t('technician.execution.photos')}
        description={photosHint}
        icon={Camera}
        density="touch"
        actions={
          photos.length > 0 && (
            <span className="rounded-full bg-muted px-2.5 py-1 text-sm font-semibold tabular-nums">
              {photos.length}
            </span>
          )
        }
      >
        {photos.length > 0 && (
          <PhotoGrid photos={photos} timeZone={TZ} onRemove={(photo) => write(() => removePhoto(draftKey, photo.id))} />
        )}
        <AddPhoto
          onCamera={() => setCamera(true)}
          onGallery={() => {
            void pickFromGallery().then((picked) => {
              for (const photo of picked) add(photo);
            });
          }}
        />
      </Section>

      <Section title={descriptionLabel} icon={PenLine} density="touch">
        <Field>
          <FieldLabel htmlFor={descriptionId} className="sr-only">
            {descriptionLabel}
          </FieldLabel>
          <Textarea
            id={descriptionId}
            value={fields.description}
            onChange={(e) => change({ description: e.target.value })}
            placeholder={descriptionPlaceholder}
            rows={4}
            className="min-h-28 text-base"
          />
        </Field>
      </Section>

      <Section
        title={t('technician.execution.participants')}
        description={t('technician.execution.participantsHint')}
        icon={Users}
        density="touch"
      >
        <ul className="-mx-1 flex flex-col">
          {participantOptions.map((p) => {
            const checked = p.isSelf || fields.participants.includes(p.id);
            return (
              <li key={p.id}>
                {/* biome-ignore lint/a11y/noLabelWithoutControl: o Checkbox do Base UI renderiza o controle dentro do label */}
                <label
                  className={cn(
                    'flex min-h-14 items-center gap-3 rounded-lg px-1 py-2',
                    !p.isSelf && 'cursor-pointer hover:bg-muted/60',
                  )}
                >
                  <Checkbox
                    checked={checked}
                    disabled={p.isSelf}
                    className="size-6 [&_svg]:size-4!"
                    onCheckedChange={(next) =>
                      change({
                        participants: next
                          ? [...latest.current.participants, p.id]
                          : latest.current.participants.filter((id) => id !== p.id),
                      })
                    }
                  />
                  <UserAvatar name={p.full_name} seed={p.id} size="md" decorative />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-base font-medium">{p.full_name}</span>
                  </span>
                  {p.isSelf && <ToneBadge tone="brand" size="sm" label={t('technician.execution.participantYou')} />}
                  {!p.active && (
                    <ToneBadge tone="muted" size="sm" label={t('technician.execution.participantRemoved')} />
                  )}
                </label>
              </li>
            );
          })}
        </ul>
      </Section>

      <CameraSheet open={camera} onOpenChange={setCamera} onCapture={add} />
    </>
  );
}

/** Participantes que a tela marca de início: a dupla (atribuições ativas) na tentativa, só quem envia no complemento. */
export function defaultParticipants(options: ParticipantOption[], mode: 'attempt' | 'supplement'): string[] {
  return options.filter((p) => p.isSelf || (mode === 'attempt' && p.active)).map((p) => p.id);
}
