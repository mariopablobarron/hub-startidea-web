import { bankTransfer } from "@/lib/content";
import { updateBankTransfer } from "@/lib/admin/actions";
import { Field, Input, Textarea, SaveBar, PageHeader, FlashBanner } from "../_components/Field";

type Props = { searchParams: Promise<{ saved?: string; error?: string }> };

export default async function PagosAdmin({ searchParams }: Props) {
  const bt = bankTransfer;
  const sp = await searchParams;
  return (
    <form action={updateBankTransfer} className="space-y-6">
      <PageHeader
        title="Pagos · Transferencia"
        back={{ href: "/admin", label: "Dashboard" }}
        description="Datos bancarios que recibe el cliente por email cuando elige pagar por transferencia. El concepto se genera solo con la referencia de la reserva."
      />
      <FlashBanner saved={sp.saved === "1"} error={sp.error} />
      <section className="space-y-4 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="enabled" defaultChecked={bt?.enabled ?? true} />
          <span className="font-medium">Permitir pago por transferencia</span>
        </label>
        <Field label="Titular de la cuenta">
          <Input name="holder" defaultValue={bt?.holder || ""} placeholder="Startidea S.L." />
        </Field>
        <Field label="IBAN" hint="Se incluye en el email al cliente. Se guarda sin espacios y en mayúsculas.">
          <Input name="iban" defaultValue={bt?.iban || ""} placeholder="ES00 0000 0000 0000 0000 0000" />
        </Field>
        <Field label="Banco (opcional)">
          <Input name="bankName" defaultValue={bt?.bankName || ""} placeholder="CaixaBank" />
        </Field>
        <Field label="Instrucciones (opcional)" hint="Texto extra para el cliente: plazo de pago, etc.">
          <Textarea name="instructions" rows={3} defaultValue={bt?.instructions || ""} />
        </Field>
        <p className="rounded-xl bg-[var(--color-paper-2)] p-3 text-xs text-[var(--color-mute)]">
          Si dejas el IBAN vacío, el cliente recibirá igualmente la reserva pendiente y un aviso de
          que le enviarás los datos de pago. Tú confirmas el ingreso en{" "}
          <span className="font-medium">Reservas → “Pago recibido”</span>.
        </p>
      </section>
      <SaveBar />
    </form>
  );
}
