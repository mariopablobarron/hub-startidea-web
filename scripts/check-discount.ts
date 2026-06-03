/**
 * Test del motor de descuentos (lib/bookings/discount.ts).
 * Ejecutar: pnpm exec tsx scripts/check-discount.ts
 * Pura lógica, sin BD ni IO — verifica clamps, "mejor descuento" y empates.
 */
import assert from "node:assert/strict";
import {
  discountAmountCents,
  chooseBestDiscount,
  type DiscountCandidate,
} from "../lib/bookings/discount";

let passed = 0;
function ok(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`  ✓ ${name}`);
}

console.log("discountAmountCents:");
ok("PERCENT 30% de 6000 = 1800", () =>
  assert.equal(discountAmountCents({ kind: "PERCENT", value: 30 }, 6000), 1800),
);
ok("PERCENT 0% = 0", () =>
  assert.equal(discountAmountCents({ kind: "PERCENT", value: 0 }, 6000), 0),
);
ok("PERCENT >100 se clampa a 100% (1000 de 1000)", () =>
  assert.equal(discountAmountCents({ kind: "PERCENT", value: 150 }, 1000), 1000),
);
ok("FIXED 1000 de 6000 = 1000", () =>
  assert.equal(discountAmountCents({ kind: "FIXED", value: 1000 }, 6000), 1000),
);
ok("FIXED mayor que la base se clampa a la base (6000)", () =>
  assert.equal(discountAmountCents({ kind: "FIXED", value: 9999 }, 6000), 6000),
);
ok("base 0 => 0", () =>
  assert.equal(discountAmountCents({ kind: "FIXED", value: 1000 }, 0), 0),
);
ok("base negativa => 0", () =>
  assert.equal(discountAmountCents({ kind: "PERCENT", value: 50 }, -100), 0),
);

console.log("chooseBestDiscount:");
ok("elige el más ventajoso (personal FIXED 2500 > rol 20% > cupón 10%)", () => {
  const cands: DiscountCandidate[] = [
    { source: "coupon", kind: "PERCENT", value: 10 }, // 1000
    { source: "personal", kind: "FIXED", value: 2500 }, // 2500
    { source: "role", kind: "PERCENT", value: 20 }, // 2000
  ];
  const best = chooseBestDiscount(cands, 10000);
  assert.equal(best?.source, "personal");
  assert.equal(best?.cents, 2500);
});
ok("empate de importe: gana el cupón (aparece antes)", () => {
  const cands: DiscountCandidate[] = [
    { source: "coupon", kind: "PERCENT", value: 20, code: "X" }, // 2000
    { source: "role", kind: "PERCENT", value: 20 }, // 2000
  ];
  const best = chooseBestDiscount(cands, 10000);
  assert.equal(best?.source, "coupon");
  assert.equal(best?.code, "X");
});
ok("ignora candidatos con value<=0", () => {
  const cands: DiscountCandidate[] = [
    { source: "coupon", kind: "PERCENT", value: 0 },
    { source: "role", kind: "PERCENT", value: 20 },
  ];
  const best = chooseBestDiscount(cands, 10000);
  assert.equal(best?.source, "role");
});
ok("sin candidatos válidos => null", () => {
  assert.equal(chooseBestDiscount([null, undefined], 10000), null);
});
ok("label PERCENT => '−30%'", () => {
  const best = chooseBestDiscount([{ source: "role", kind: "PERCENT", value: 30 }], 10000);
  assert.equal(best?.label, "−30%");
  assert.equal(best?.pct, 30);
});
ok("label FIXED => importe en euros", () => {
  const best = chooseBestDiscount([{ source: "personal", kind: "FIXED", value: 1000 }], 10000);
  assert.match(best?.label ?? "", /−10,00\s?€/);
});

console.log(`\n✅ ${passed} comprobaciones OK`);
