// O link do convite ou de "definir senha" (06, R12 e R14): o sistema não manda email, então o owner copia o link ou o
// compartilha (WhatsApp) com a pessoa. O link só aparece aqui, ao ser gerado: o banco guarda só o hash do token.
import { Copy, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { t } from '@/lib/i18n';

export interface MemberLink {
  kind: 'invite' | 'recovery';
  name: string;
  url: string;
}

export function MemberLinkDialog({ link, onClose }: { link: MemberLink | null; onClose: () => void }) {
  const canShare = typeof navigator.share === 'function';

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link.url);
      toast.success(t('office.members.link.copied'));
    } catch {
      toast.error(t('office.members.link.copyFailed'));
    }
  }

  async function share() {
    if (!link) return;
    try {
      await navigator.share({ text: t(`office.members.link.shareText.${link.kind}`), url: link.url });
    } catch {
      // Cancelado pela pessoa: nada a fazer.
    }
  }

  return (
    <Dialog open={link !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{link && t(`office.members.link.title.${link.kind}`, { name: link.name })}</DialogTitle>
          <DialogDescription>
            {link && t(`office.members.link.description.${link.kind}`, { name: link.name })}
          </DialogDescription>
        </DialogHeader>
        <Input
          readOnly
          value={link?.url ?? ''}
          aria-label={t('office.members.link.label')}
          onFocus={(event) => event.currentTarget.select()}
        />
        <DialogFooter>
          {canShare && (
            <Button variant="outline" onClick={() => void share()}>
              <Share2 />
              {t('office.members.link.share')}
            </Button>
          )}
          <Button onClick={() => void copy()}>
            <Copy />
            {t('office.members.link.copy')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
