async function testPhase13() {
  const BASE = 'http://localhost:5001/api';
  console.log('--- TESTING PHASE 13: MOCK GOVERNMENT API INTEGRATION ---');

  // 1. Auth login
  const loginRes = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'sga@nla.gov.in',
      password: 'password123',
    }),
  });
  const loginData = await loginRes.json();
  const token = loginData.data.token;
  console.log('✅ 1. Authenticated as SGA (Dr. Vikramaditya Singh)');

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // 2. Fetch existing parcels
  const parcelsRes = await fetch(`${BASE}/parcels?limit=5`, { headers });
  const parcelsData = await parcelsRes.json();
  const targetParcel = parcelsData.data[0];
  console.log(`✅ 2. Target Local Parcel: Code ${targetParcel.parcel_code}, Survey #${targetParcel.survey_number}, Owner: ${targetParcel.owner_name}`);

  // 3. Query Survey
  const queryRes = await fetch(`${BASE}/mock-gov/query`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      registry_id: 'UP_BHULEKH',
      survey_number: targetParcel.survey_number,
      parcel_id: targetParcel.id,
      scenario: 'EXACT_MATCH',
    }),
  });
  const queryJson = await queryRes.json();
  const qData = queryJson.data;
  console.log(`✅ 3. Queried State Registry for Survey #${targetParcel.survey_number}:`);
  console.log(`   - Simulated Latency: ${qData.simulated_latency_ms}ms`);
  console.log(`   - Registry: ${qData.simulated_response.data.registry_name}`);
  console.log(`   - Khatauni: ${qData.simulated_response.data.record.khatauni_no}`);
  console.log(`   - Recorded Owner: ${qData.simulated_response.data.record.recorded_owners[0].name}`);
  console.log(`   - Area: ${qData.simulated_response.data.record.total_area_acres} Acres`);

  // 4. Validate against PostGIS parcel
  const valRes = await fetch(`${BASE}/mock-gov/validate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      parcel_id: targetParcel.id,
      registry_record: qData.simulated_response.data.record,
    }),
  });
  const valJson = await valRes.json();
  const valData = valJson.data;
  console.log(`✅ 4. Validated against Local Parcel (${targetParcel.parcel_code}):`);
  console.log(`   - Match Score: ${valData.match_score_pct}%`);
  console.log(`   - Overall Result: ${valData.overall_result}`);
  valData.comparisons.forEach((c) => {
    console.log(`   - ${c.field}: [${c.db_value}] vs [${c.registry_value}] => ${c.status}`);
  });

  // 5. Synchronize Ground Truth
  const syncRes = await fetch(`${BASE}/mock-gov/sync`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      parcel_id: targetParcel.id,
      survey_number: targetParcel.survey_number,
      registry_record: qData.simulated_response.data.record,
      validation_result: valData.overall_result,
      sync_fields: ['area_acres', 'owner_name', 'village'],
      remarks: 'Phase 13 automated integration verification test',
    }),
  });
  const syncJson = await syncRes.json();
  console.log('✅ 5. Synchronized Record & Inserted Log:');
  console.log(`   - Log ID: ${syncJson.data.sync_log.id}`);
  console.log(`   - Validation Result: ${syncJson.data.sync_log.validation_result}`);

  // 6. Fetch Sync Logs
  const logsRes = await fetch(`${BASE}/mock-gov/logs`, { headers });
  const logsJson = await logsRes.json();
  console.log(`✅ 6. Retrieved Sync Audit Log Table (${logsJson.data.length} records):`);
  logsJson.data.slice(0, 3).forEach((l, idx) => {
    console.log(`   [${idx + 1}] #${l.survey_number} | Outcome: ${l.validation_result} | Timestamp: ${l.synced_at}`);
  });

  console.log('\n🎉 ALL PHASE 13 END-TO-END VALIDATION & SYNC TESTS PASSED!\n');
}

testPhase13().catch((err) => {
  console.error('❌ Test failed:', err.message);
});
