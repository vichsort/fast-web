// Vitrine: histórico, endereço e contato, fotos e tentativas.
import { useQuery } from '@tanstack/react-query';
import { CircleCheck, CircleX, Eye } from 'lucide-react';
import * as React from 'react';
import { AddressBlock, ContactActions } from '@/components/address-block';
import { AttemptsSection } from '@/components/attempts-section';
import { ConfirmDialog, ReasonDialog } from '@/components/dialogs';
import { ExecutionCard } from '@/components/execution-card';
import { AddPhoto, type PhotoData, PhotoGrid, PhotoMeta, PhotoThumb } from '@/components/photos';
import { Section } from '@/components/section';
import { LoadingDetail, scratchToast } from '@/components/states';
import { orderHistoryEntries, Timeline } from '@/components/timeline';
import { Button } from '@/components/ui/button';
import { formatOrderNumber } from '@/lib/format';
import { t } from '@/lib/i18n';
import { getClient, getCompany, getOrder, getPerson, listClients, samplePhotoUrl } from '@/mocks';
import { Demo, ShowcaseSection, TZ } from './frame';

const personName = (id: string) => getPerson(id)?.full_name ?? '—';

function useOrder(ref: string) {
  return useQuery({ queryKey: ['mock', 'order', ref], queryFn: () => getOrder(ref) });
}

export function TimelineSection() {
  const a = useOrder('38');
  const b = useOrder('37');
  return (
    <ShowcaseSection id="timeline" title={t('ui.showcase.sections.timeline')}>
      <div className="grid gap-6 lg:grid-cols-2">
        <Demo label="Timeline · orderHistoryEntries">
          {a.data ? (
            <Section>
              <Timeline entries={orderHistoryEntries(a.data.history, { timeZone: TZ, personName })} timeZone={TZ} />
            </Section>
          ) : (
            <LoadingDetail />
          )}
        </Demo>
        <Demo label='Timeline groupByDay reverse density="compact"'>
          {b.data ? (
            <Section>
              <Timeline
                entries={orderHistoryEntries(b.data.history, { timeZone: TZ, personName })}
                timeZone={TZ}
                groupByDay
                reverse
                density="compact"
              />
            </Section>
          ) : (
            <LoadingDetail />
          )}
        </Demo>
      </div>
    </ShowcaseSection>
  );
}

export function AddressSection() {
  const order = useOrder('38');
  const clients = useQuery({ queryKey: ['mock', 'clients'], queryFn: () => listClients() });
  const firstId = clients.data?.find((c) => c.address_count > 1)?.id;
  const client = useQuery({
    queryKey: ['mock', 'client', firstId],
    queryFn: () => getClient(firstId ?? ''),
    enabled: firstId !== undefined,
  });
  const company = useQuery({ queryKey: ['mock', 'company'], queryFn: () => getCompany() });
  const o = order.data;
  if (!o || !client.data) return <LoadingDetail />;
  const message = t('ui.contact.whatsappMessage', {
    name: o.client.name,
    company: company.data?.name ?? '',
    number: formatOrderNumber(o.order_number),
  });
  return (
    <ShowcaseSection id="address" title={t('ui.showcase.sections.address')}>
      <div className="grid gap-6 lg:grid-cols-2">
        <Demo label='AddressBlock address={order.address} size="lg" · ContactActions size="lg"'>
          <Section title={o.client.name}>
            {o.address && <AddressBlock address={o.address} size="lg" />}
            <ContactActions phone={o.client.phone} message={message} size="lg" showNumber />
          </Section>
        </Demo>
        <Demo label="AddressBlock address={parts} primary · deleted · actions">
          <Section title={client.data.name}>
            <div className="flex flex-col divide-y">
              {client.data.addresses.map((a) => (
                <AddressBlock
                  key={a.id}
                  address={a}
                  primary={a.is_primary}
                  deleted={a.deleted_at !== null}
                  hideMap={a.deleted_at !== null}
                  className="py-3 first:pt-0 last:pb-0"
                />
              ))}
            </div>
            <ContactActions phone={client.data.phone} hideCall />
          </Section>
        </Demo>
      </div>
    </ShowcaseSection>
  );
}

export function PhotosSection() {
  const order = useOrder('38');
  const gallery = useOrder('39');
  const [draft, setDraft] = React.useState<PhotoData[]>(() =>
    ['bullet', 'dome'].map((scene, i) => ({
      id: `draft-${i}`,
      url: samplePhotoUrl(scene as 'bullet', `draft-${i}`),
      source: 'camera' as const,
      captured_at: new Date(Date.now() - (i + 1) * 600_000).toISOString(),
      alerts: [],
    })),
  );
  const o = order.data;
  const g = gallery.data;
  if (!o || !g) return <LoadingDetail />;
  const attempt = o.attempts[0];
  const photos = [...(attempt?.photos ?? []), ...(attempt?.supplements.flatMap((s) => s.photos) ?? [])];
  const withAlert = g.attempts[1]?.photos[1];
  function addDraft(source: 'camera' | 'gallery') {
    const n = draft.length;
    setDraft([
      ...draft,
      {
        id: `draft-${Date.now()}`,
        url: samplePhotoUrl(source === 'camera' ? 'cabling' : 'power', `draft-${n}`),
        source,
        captured_at: source === 'camera' ? new Date().toISOString() : null,
        alerts: source === 'gallery' ? ['gallery_without_exif'] : [],
      },
    ]);
  }
  return (
    <ShowcaseSection id="photos" title={t('ui.showcase.sections.photos')}>
      <Demo label="PhotoGrid → PhotoLightbox (← → · swipe)">
        <PhotoGrid photos={photos} timeZone={TZ} />
      </Demo>
      <div className="grid gap-6 lg:grid-cols-2">
        <Demo
          label={`AddPhoto variant="bar" · PhotoGrid onRemove · AddPhoto variant="tile" — ${t('ui.showcase.demo.draftPhotos')}`}
        >
          <AddPhoto onCamera={() => addDraft('camera')} onGallery={() => addDraft('gallery')} />
          <PhotoGrid
            photos={draft}
            timeZone={TZ}
            onRemove={(p) => setDraft(draft.filter((d) => d.id !== p.id))}
            append={
              <AddPhoto variant="tile" onCamera={() => addDraft('camera')} onGallery={() => addDraft('gallery')} />
            }
          />
        </Demo>
        <Demo label='PhotoThumb size="sm|md|lg" · PhotoGrid density="compact" · PhotoMeta'>
          {withAlert && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-end gap-2">
                <PhotoThumb photo={withAlert} timeZone={TZ} size="sm" />
                <PhotoThumb photo={withAlert} timeZone={TZ} size="md" className="w-40" />
                <PhotoThumb photo={withAlert} timeZone={TZ} size="lg" />
              </div>
              <PhotoMeta photo={withAlert} timeZone={TZ} />
              <PhotoGrid photos={photos} timeZone={TZ} density="compact" />
            </div>
          )}
        </Demo>
      </div>
    </ShowcaseSection>
  );
}

export function ExecutionsSection() {
  const pending = useOrder('38');
  const rejected = useOrder('39');
  const late = useOrder('43');
  const [approveOpen, setApproveOpen] = React.useState(false);
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const p = pending.data?.attempts[0];
  const late43 = late.data?.attempts[0];
  return (
    <ShowcaseSection id="executions" title={t('ui.showcase.sections.executions')}>
      <Demo label="ExecutionCard actions · SupplementBlock converted_to_supplement">
        {p ? (
          <ExecutionCard
            attempt={p}
            timeZone={TZ}
            actions={
              <>
                <Button variant="destructive" onClick={() => setRejectOpen(true)}>
                  <CircleX />
                  {t('ui.dialogs.rejectConfirm')}
                </Button>
                <Button onClick={() => setApproveOpen(true)}>
                  <CircleCheck />
                  {t('ui.dialogs.approveConfirm')}
                </Button>
              </>
            }
          />
        ) : (
          <LoadingDetail />
        )}
      </Demo>
      <ConfirmDialog
        open={approveOpen}
        onOpenChange={setApproveOpen}
        title={t('ui.dialogs.approveTitle')}
        description={t('ui.dialogs.approveDescription')}
        confirmLabel={t('ui.dialogs.approveConfirm')}
        onConfirm={() =>
          new Promise((resolve) => setTimeout(resolve, 600)).then(() => scratchToast(t('ui.dialogs.approveConfirm')))
        }
      />
      <ReasonDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title={t('ui.dialogs.rejectTitle')}
        description={t('ui.dialogs.rejectDescription')}
        label={t('ui.dialogs.rejectLabel')}
        requiredCode="comment_required"
        confirmLabel={t('ui.dialogs.rejectConfirm')}
        onConfirm={() => scratchToast(t('ui.dialogs.rejectConfirm'))}
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <Demo label='AttemptsSection hint compactPhotos · ExecutionCard review_status="rejected" · alerts'>
          {rejected.data ? (
            <AttemptsSection
              title={t('ui.showcase.demo.attemptsTitle')}
              hint={t('ui.showcase.demo.attemptsHint')}
              empty={t('ui.showcase.demo.attemptsEmpty')}
              attempts={rejected.data.attempts}
              timeZone={TZ}
              compactPhotos={(a) => a.id !== rejected.data?.attempts.at(-1)?.id}
            />
          ) : (
            <LoadingDetail />
          )}
        </Demo>
        <Demo label='ExecutionCard review_status="approved" · is_late'>
          {late43 ? (
            <ExecutionCard
              attempt={late43}
              timeZone={TZ}
              compactPhotos
              actions={
                <Button variant="outline" onClick={() => scratchToast(t('ui.showcase.demo.ackLate'))}>
                  <Eye />
                  {t('ui.showcase.demo.ackLate')}
                </Button>
              }
            />
          ) : (
            <LoadingDetail />
          )}
        </Demo>
        <Demo label="AttemptsSection · empty">
          <AttemptsSection
            title={t('ui.showcase.demo.attemptsTitle')}
            empty={t('ui.showcase.demo.attemptsEmpty')}
            attempts={[]}
            timeZone={TZ}
          />
        </Demo>
      </div>
    </ShowcaseSection>
  );
}
