const { query, queryOne } = require('../config/database');
const { generateId } = require('../utils/helpers');

/**
 * Synthetic SIH Compensation Dataset (Phase 9)
 *
 * Seeds 6 realistic compensation award & disbursement records linked to existing
 * cadastral parcels (P-101 through P-201) with varying payment statuses.
 */
async function seedCompensation() {
  const { count } = await queryOne('SELECT COUNT(*) AS count FROM compensation');

  if (count > 0) {
    console.log('[SEED] Compensation table already has data. Skipping compensation seed.');
    return;
  }

  console.log('[SEED] Seeding synthetic SIH compensation records...');

  const p101 = await queryOne("SELECT id, owner_name FROM parcels WHERE parcel_code = 'P-101'");
  const p102 = await queryOne("SELECT id, owner_name FROM parcels WHERE parcel_code = 'P-102'");
  const p103 = await queryOne("SELECT id, owner_name FROM parcels WHERE parcel_code = 'P-103'");
  const p104 = await queryOne("SELECT id, owner_name FROM parcels WHERE parcel_code = 'P-104'");
  const p105 = await queryOne("SELECT id, owner_name FROM parcels WHERE parcel_code = 'P-105'");
  const p201 = await queryOne("SELECT id, owner_name FROM parcels WHERE parcel_code = 'P-201'");

  const demoCompensations = [
    {
      parcel: p101,
      owner_name: p101?.owner_name || 'Rameshwar Prasad Sharma',
      assessed_amount: 4500000.00, // ₹45.0 Lakh
      paid_amount: 1500000.00,     // ₹15.0 Lakh
      payment_status: 'Partially Paid',
      payment_date: '2026-02-14',
      remarks: '1st tranche (33.3%) disbursed via PFMS-RTGS (UTR: UTR9832101). 2nd tranche scheduled upon final mutation.',
    },
    {
      parcel: p102,
      owner_name: p102?.owner_name || 'Sita Devi & Om Prakash',
      assessed_amount: 3200000.00, // ₹32.0 Lakh
      paid_amount: 0.00,           // ₹0
      payment_status: 'Pending',
      payment_date: null,
      remarks: 'Bank mandate verification and joint KYC under validation at DLAO Treasury branch.',
    },
    {
      parcel: p103,
      owner_name: p103?.owner_name || 'Kalyan Singh Yadav',
      assessed_amount: 5800000.00, // ₹58.0 Lakh
      paid_amount: 5800000.00,     // ₹58.0 Lakh
      payment_status: 'Fully Paid',
      payment_date: '2026-01-20',
      remarks: '100% statutory compensation + 100% solatium fully disbursed to SBI Account ending in 4491.',
    },
    {
      parcel: p104,
      owner_name: p104?.owner_name || 'Mahesh Chandra Gupta',
      assessed_amount: 7250000.00, // ₹72.5 Lakh
      paid_amount: 7250000.00,     // ₹72.5 Lakh
      payment_status: 'Fully Paid',
      payment_date: '2026-02-05',
      remarks: 'Full award disbursed. Physical possession handed over to NHAI project engineers without dispute.',
    },
    {
      parcel: p105,
      owner_name: p105?.owner_name || 'Suresh Tripathi',
      assessed_amount: 2250000.00, // ₹22.5 Lakh
      paid_amount: 0.00,           // ₹0
      payment_status: 'Pending',
      payment_date: null,
      remarks: 'Compensation deposited in court escrow account pending title hearing under RFCTLARR Section 64.',
    },
    {
      parcel: p201,
      owner_name: p201?.owner_name || 'Ram Avatar Maurya',
      assessed_amount: 9800000.00, // ₹98.0 Lakh
      paid_amount: 5000000.00,     // ₹50.0 Lakh
      payment_status: 'Partially Paid',
      payment_date: '2026-02-18',
      remarks: 'Interim award installment of ₹50 Lakh credited. Balance ₹48 Lakh pending encumbrance certificate.',
    },
  ];

  let seededCount = 0;
  for (const item of demoCompensations) {
    if (!item.parcel || !item.parcel.id) continue;

    await query(
      `INSERT INTO compensation (
         id, parcel_id, owner_name, assessed_amount, paid_amount, payment_status, payment_date, remarks, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now(), now())`,
      [
        generateId(),
        item.parcel.id,
        item.owner_name,
        item.assessed_amount,
        item.paid_amount,
        item.payment_status,
        item.payment_date,
        item.remarks,
      ]
    );
    seededCount++;
  }

  console.log(`[SEED] Successfully seeded ${seededCount} synthetic SIH compensation records.`);
}

module.exports = { seedCompensation };
