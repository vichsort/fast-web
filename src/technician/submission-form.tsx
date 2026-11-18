// Campos de um envio (tentativa ou complemento, 04): fotos pela câmera ou galeria, descrição e participantes (R6).
// Cada alteração vai direto para o rascunho do aparelho (offline.md: "gravado a cada alteração").
import { Camera, PenLine, Users } from 'lucide-react';
import * as React from 'react';
import { ToneBadge } from '@/components/badges';
import { AddPhoto, PhotoGrid } from '@/components/photos';
import { Section } from '@/components/section';
import { scratchToast } from '@/components/states';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { UserAvatar } from '@/components/user';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { CameraSheet } from './camera-sheet';
import { type Draft, newSamplePhoto, type ParticipantOption, TZ, withAlerts } from './mocks';

export function SubmissionForm({
  draft,
  onChange,
  participantOptions,
  descriptionLabel,
  descriptionPlaceholder,
  photosHint,
}: {
  draft: Draft;
  onChange: (draft: Draft) => void;
  participantOptions: ParticipantOption[];
  descriptionLabel: string;
  descriptionPlaceholder: string;
  photosHint: string;
}) {
  const [camera, setCamera] = React.useState(false);
  const descriptionId = React.useId();
  // Ref para a câmera somar várias fotos seguidas sem perder as anteriores.
  const latest = React.useRef(draft);
  latest.current = draft;
  const change = (patch: Partial<Draft>) => {
    latest.current = { ...latest.current, ...patch };
    onChange(latest.current);
  };
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
          <PhotoGrid
            photos={photos}
            timeZone={TZ}
            onRemove={(photo) => change({ photos: latest.current.photos.filter((p) => p.id !== photo.id) })}
          />
        )}
        <AddPhoto
          onCamera={() => setCamera(true)}
          onGallery={() => {
            change({ photos: [...latest.current.photos, newSamplePhoto('gallery')] });
            scratchToast(t('technician.execution.galleryToast'));
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
            value={draft.description}
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
            const checked = p.isSelf || draft.participants.includes(p.id);
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

      <CameraSheet
        open={camera}
        onOpenChange={setCamera}
        onCapture={(photo) => change({ photos: [...latest.current.photos, photo] })}
      />
    </>
  );
}

/** Participantes que a tela marca de início: a dupla (atribuições ativas) na tentativa, só quem envia no complemento. */
export function defaultParticipants(options: ParticipantOption[], mode: 'attempt' | 'supplement'): string[] {
  return options.filter((p) => p.isSelf || (mode === 'attempt' && p.active)).map((p) => p.id);
}
